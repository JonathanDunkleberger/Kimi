-- Securely deduct credits from a user ensuring non-negative balance.
-- Usage: select * from rpc deduct_credits(p_user_id := 'uuid', p_amount := 50);
-- Returns boolean success.

create or replace function public.deduct_credits(p_user_id uuid, p_amount integer)
returns boolean
language plpgsql
as $$
declare
    v_current integer;
begin
    if p_amount <= 0 then
        return false;
    end if;
    update users
       set credits = credits - p_amount
     where id = p_user_id
       and credits >= p_amount;
    if found then
        return true;
    else
        return false;
    end if;
end;
$$;

-- Optional: revoke execute from anon if RLS enabled later, allow only authenticated role.
-- revoke execute on function public.deduct_credits(uuid, integer) from anon;
