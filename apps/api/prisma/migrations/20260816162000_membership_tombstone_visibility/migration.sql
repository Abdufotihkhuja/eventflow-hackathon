-- User-controlled hiding for former scope tombstones. Membership/history stays
-- intact; this only controls account-level discovery output.
ALTER TABLE "memberships" ADD COLUMN "hidden_at" TIMESTAMP(3);
