-- Add imageUrl column to Player
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
