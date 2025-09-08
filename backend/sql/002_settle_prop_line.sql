-- Function: settle_prop_line(prop_line_id uuid, actual_result numeric)
-- Secure settlement logic for a single prop/line.
-- Assumptions:
--   * There is a table `prop_lines` (or `lines`) storing line_value and status.
--   * There is a bets/entries relation referencing the line (simplified here as `entries` legs_json array).
--   * You may adapt this to a dedicated bets table if present.
-- Strategy:
--   1. Mark the line as SETTLED storing actual_result.
--   2. For each OPEN entry containing this line_id inside legs_json, compute win/loss for that leg.
--   3. If ALL legs for an entry are resolved, decide entry outcome & credit user.
-- NOTE: Because current schema stores legs_json, we parse JSON. For performance, consider a junction table.

create or replace function public.settle_prop_line(prop_line_id uuid, actual_result numeric)
returns void
language plpgsql
as $$
declare
    v_line record;
    v_entry record;
    v_leg jsonb;
    v_all_resolved boolean;
    v_any_lost boolean;
    v_any_open boolean;
    v_total_legs int;
    v_resolved_legs int;
    v_payout_multiplier numeric;
    v_user_id uuid;
    v_stake int;
    v_new_credits int;
    v_result text;
begin
    -- Lock line row to avoid double settlement.
    select * into v_line from prop_lines where id = prop_line_id for update;
    if not found then
        -- fallback to lines table
        select id as id, line_value, status, match_id, player_id into v_line from lines where id = prop_line_id for update;
        if not found then
            raise exception 'Line % not found', prop_line_id;
        end if;
    end if;
    if v_line.status = 'SETTLED' then
        return; -- idempotent
    end if;

    -- Update line status (store actual result in a flexible column if exists; else ignore).
    update prop_lines set status = 'SETTLED', actual_result = actual_result
      where id = prop_line_id and status != 'SETTLED';
    -- ignore affected row count; if no prop_lines row, try lines table
    update lines set status = 'SETTLED', updated_at = now() where id = prop_line_id and status != 'SETTLED';

    -- Iterate entries referencing this line in legs_json and still OPEN.
    for v_entry in
        select e.* from entries e
        where e.status = 'OPEN'
          and exists (
              select 1 from jsonb_array_elements(e.legs_json) as l
              where (l->>'line_id')::uuid = prop_line_id
          )
        for update
    loop
        v_all_resolved := true;
        v_any_lost := false;
        v_any_open := false;
        v_total_legs := 0;
        v_resolved_legs := 0;

        -- Reconstruct legs with resolution meta appended
        declare new_legs jsonb := '[]'::jsonb; begin end;
        new_legs := '[]'::jsonb;
        for v_leg in select jsonb_array_elements(v_entry.legs_json) as leg loop
            v_total_legs := v_total_legs + 1;
            if (v_leg.leg->>'line_id')::uuid = prop_line_id then
                -- Determine win/loss for this leg
                -- sides: OVER / UNDER
                if (v_leg.leg->>'side') = 'OVER' then
                    if actual_result > (v_leg.leg->>'line_value')::numeric then
                        v_result := 'WON';
                    elsif actual_result = (v_leg.leg->>'line_value')::numeric then
                        v_result := 'PUSH';
                    else
                        v_result := 'LOST';
                    end if;
                else -- UNDER
                    if actual_result < (v_leg.leg->>'line_value')::numeric then
                        v_result := 'WON';
                    elsif actual_result = (v_leg.leg->>'line_value')::numeric then
                        v_result := 'PUSH';
                    else
                        v_result := 'LOST';
                    end if;
                end if;
                v_resolved_legs := v_resolved_legs + 1;
                if v_result = 'LOST' then
                    v_any_lost := true;
                end if;
                new_legs := new_legs || jsonb_build_object('line_id', v_leg.leg->>'line_id', 'side', v_leg.leg->>'side', 'line_value', v_leg.leg->>'line_value', 'status', v_result, 'actual', actual_result::text);
            else
                -- Keep original leg; determine if still open
                if coalesce(v_leg.leg->>'status','') not in ('WON','LOST','PUSH') then
                    v_all_resolved := false;
                    v_any_open := true;
                end if;
                new_legs := new_legs || v_leg.leg;
            end if;
        end loop;

        -- Update entry legs_json
        update entries set legs_json = new_legs where id = v_entry.id;

        -- If all legs resolved now, settle entry
        if not v_any_open then
            if v_any_lost then
                update entries set status = 'LOST', settled_at = now(), settlement_note = 'One or more legs lost' where id = v_entry.id;
            else
                -- Count pushes and winners for payout multiplier logic
                -- Simplified: 2-leg both WON => 3x, 3-leg all WON => 5x, pushes reduce leg count.
                v_total_legs := jsonb_array_length(new_legs);
                -- effective legs = count where status='WON'
                select count(*) into v_resolved_legs from jsonb_array_elements(new_legs) l where l->>'status' = 'WON';
                if v_resolved_legs = 0 then
                    -- All pushes -> refund
                    update entries set status = 'CANCELLED', settled_at = now(), settlement_note = 'All pushes - refund' where id = v_entry.id;
                else
                    if v_resolved_legs = 2 then
                        v_payout_multiplier := 3.0;
                    elsif v_resolved_legs = 3 then
                        v_payout_multiplier := 5.0;
                    else
                        v_payout_multiplier := 2.0; -- default minimal win
                    end if;
                    v_user_id := v_entry.user_id;
                    v_stake := v_entry.stake;
                    -- Credit user
                    update users set credits = credits + (v_stake * v_payout_multiplier)::int where id = v_user_id;
                    update entries set status = 'WON', settled_at = now(), settlement_note = concat('Paid x', v_payout_multiplier) where id = v_entry.id;
                end if;
            end if;
        end if;

        -- Record settlement event for the specific leg
        insert into settlement_events(entry_id, line_id, result, player_final)
        values (v_entry.id, prop_line_id, coalesce(v_result,'UNKNOWN'), actual_result::int);
    end loop;
end;
$$;
