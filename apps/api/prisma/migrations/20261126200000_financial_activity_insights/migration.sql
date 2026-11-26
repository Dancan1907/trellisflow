-- Add deterministic insights that summarize ordinary financial activity.
ALTER TYPE "InsightType" ADD VALUE IF NOT EXISTS 'FINANCIAL_ACTIVITY_SUMMARY';
ALTER TYPE "InsightType" ADD VALUE IF NOT EXISTS 'TOP_SPENDING_CATEGORY';
