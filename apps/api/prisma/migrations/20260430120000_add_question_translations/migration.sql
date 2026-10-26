-- Add translations columns for RegistrationQuestion localization.
-- translations covers question / informationalText / correctAnswer (plain text).
-- options_translations stores per-locale arrays for SELECT/CHECKBOX options.
-- Scalar fields (question, options, correctAnswer, ...) stay as legacy fallback;
-- correctOptions always references scalar options[] for answer evaluation
-- (a participant's response is matched against scalar values regardless of
-- the locale the participant saw the question in).

ALTER TABLE "registration_questions"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "options_translations" JSONB NOT NULL DEFAULT '{}';
