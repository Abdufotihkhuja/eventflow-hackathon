-- Поднимаем ранее созданные CUSTOM-роли "mentor" до встроенной роли, чтобы у
-- них появился builtInKey (по нему фронт подбирает иконку и перевод) и они не
-- дублировались при следующем сидировании встроенных ролей.

UPDATE "event_recipient_roles"
SET
  "kind" = 'BUILT_IN',
  "built_in_key" = 'MENTOR',
  "sort_order" = 25,
  "source_mapping" = 'REGISTRATION'
WHERE "code" = 'mentor'
  AND "built_in_key" IS NULL;
