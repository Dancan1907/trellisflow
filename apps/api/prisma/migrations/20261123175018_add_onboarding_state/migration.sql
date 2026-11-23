-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_seen_welcome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quick_tour_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quick_tour_skipped" BOOLEAN NOT NULL DEFAULT false;
