-- Enable new modes for Daily Tango challenges and store richer attempt metadata

CREATE TYPE "public"."daily_tango_mode" AS ENUM ('word', 'memory', 'reaction');

-- Existing unique constraint only allowed a single challenge per day.
-- We now support one per mode/day.
DROP INDEX IF EXISTS "daily_tango_challenges_challenge_date_key";

ALTER TABLE "public"."daily_tango_challenges"
    ADD COLUMN     "mode" "public"."daily_tango_mode" NOT NULL DEFAULT 'word',
    ALTER COLUMN   "solution_game_id" DROP NOT NULL;

CREATE UNIQUE INDEX "daily_tango_challenges_challenge_date_mode_key"
    ON "public"."daily_tango_challenges"("challenge_date", "mode");

ALTER TABLE "public"."daily_tango_attempts"
    ADD COLUMN "score" INTEGER,
    ADD COLUMN "duration_ms" INTEGER,
    ADD COLUMN "payload" JSONB;
