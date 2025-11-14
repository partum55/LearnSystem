-- V002__Alter_enum_columns_to_varchar.sql
-- Change ENUM columns to VARCHAR to work better with Hibernate

-- Drop the enum type constraints and convert to VARCHAR
ALTER TABLE users
    ALTER COLUMN role TYPE VARCHAR(20),
    ALTER COLUMN locale TYPE VARCHAR(5);

-- Drop the enum types (they're no longer needed)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_locale CASCADE;

-- Add CHECK constraints to ensure data integrity
ALTER TABLE users
    ADD CONSTRAINT check_user_role
    CHECK (role IN ('SUPERADMIN', 'TEACHER', 'STUDENT', 'TA'));

ALTER TABLE users
    ADD CONSTRAINT check_user_locale
    CHECK (locale IN ('UK', 'EN'));

