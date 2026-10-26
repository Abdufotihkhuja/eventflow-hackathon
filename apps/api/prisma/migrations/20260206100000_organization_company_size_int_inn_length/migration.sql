-- AlterTable: company_size VARCHAR(100) -> INTEGER (число сотрудников)
-- Существующие значения: только чисто числовые строки конвертируются в integer, остальные -> NULL
ALTER TABLE "organizations"
  ALTER COLUMN "company_size" TYPE INTEGER
  USING (
    CASE
      WHEN "company_size" ~ '^\s*\d+\s*$' THEN TRIM("company_size")::INTEGER
      ELSE NULL
    END
  );
