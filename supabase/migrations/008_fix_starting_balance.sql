-- 008_fix_starting_balance.sql
-- Change default balance to 1,000,000 (1,000K coins) and update trigger

-- Update the default on the users table
ALTER TABLE public.users ALTER COLUMN balance SET DEFAULT 1000000;

-- Update the trigger function to use 1,000,000
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, balance)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), 1000000)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the leaderboard view to use new starting balance for profit calc
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  id, username, avatar_emoji, balance,
  wins, losses, current_streak,
  (balance - 1000000) AS profit,
  CASE WHEN (wins + losses) > 0
    THEN ROUND(wins::NUMERIC / (wins + losses) * 100, 1)
    ELSE 0
  END AS win_rate,
  total_wagered, total_won
FROM public.users
ORDER BY balance DESC;
