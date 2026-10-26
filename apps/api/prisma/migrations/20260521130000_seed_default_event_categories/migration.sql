-- Seed the standard event categories (тематики) that the public catalog
-- ("События по тематике") expects. Slugs match the frontend landing config so
-- counts and category filtering line up. Idempotent: re-running skips existing
-- slugs.

INSERT INTO "event_categories"
  ("id", "name", "slug", "icon", "translations", "translation_meta", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Бизнес-тренинг', 'business-training', 'book',
   '{"name":{"ru":"Бизнес-тренинг","uz":"Biznes trening","en":"Business training"}}', '{}', 1, true, now(), now()),
  (gen_random_uuid(), 'Бизнес встречи', 'business-meetings', 'users',
   '{"name":{"ru":"Бизнес встречи","uz":"Biznes uchrashuvlar","en":"Business meetings"}}', '{}', 2, true, now(), now()),
  (gen_random_uuid(), 'Воркшопы', 'workshops', 'wrench',
   '{"name":{"ru":"Воркшопы","uz":"Vorkshoplar","en":"Workshops"}}', '{}', 3, true, now(), now()),
  (gen_random_uuid(), 'Конференции', 'conference', 'mic',
   '{"name":{"ru":"Конференции","uz":"Konferensiyalar","en":"Conferences"}}', '{}', 4, true, now(), now()),
  (gen_random_uuid(), 'Форумы', 'forum', 'message-square',
   '{"name":{"ru":"Форумы","uz":"Forumlar","en":"Forums"}}', '{}', 5, true, now(), now()),
  (gen_random_uuid(), 'Хакатоны', 'hackathon', 'code',
   '{"name":{"ru":"Хакатоны","uz":"Xakaton","en":"Hackathon"}}', '{}', 6, true, now(), now()),
  (gen_random_uuid(), 'Идеатоны', 'ideathon', 'lightbulb',
   '{"name":{"ru":"Идеатоны","uz":"Ideaton","en":"Ideathon"}}', '{}', 7, true, now(), now())
ON CONFLICT ("slug") DO NOTHING;
