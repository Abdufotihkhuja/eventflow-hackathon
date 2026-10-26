-- Category icons are uploaded images (URL/path), not name strings. The default
-- seed mistakenly stored Lucide-style names ("book", "users", ...) which break
-- the admin's <img> rendering. Clear them so a real icon can be uploaded; the
-- public catalog falls back to a built-in icon by slug until then.
UPDATE "event_categories"
SET "icon" = NULL
WHERE "slug" IN (
  'business-training',
  'business-meetings',
  'workshops',
  'conference',
  'forum',
  'hackathon',
  'ideathon'
)
AND "icon" IN ('book', 'users', 'wrench', 'mic', 'message-square', 'code', 'lightbulb');

-- Drop the load-test placeholder category — it should never appear in the catalog.
DELETE FROM "event_categories" WHERE "slug" = 'baseline-category';
