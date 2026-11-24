CREATE TABLE IF NOT EXISTS "store" (
    "store_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(63) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "logo_url" VARCHAR(500),
    "contact_email" VARCHAR(100),
    "contact_phone" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_pkey" PRIMARY KEY ("store_id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "store_slug_key" ON "store"("slug");

ALTER TABLE "store" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

INSERT INTO "store" ("name", "slug", "is_active")
VALUES ('LIQ TECHNOLOGIES', 'liq-technologies', true)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "store" ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE TABLE "platform_owner" (
    "owner_id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    CONSTRAINT "platform_owner_pkey" PRIMARY KEY ("owner_id")
);
CREATE UNIQUE INDEX "platform_owner_username_key" ON "platform_owner"("username");
CREATE UNIQUE INDEX "platform_owner_email_key" ON "platform_owner"("email");

ALTER TABLE "brand" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "laptop" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "processor_brand_option" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "storage_type_option" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "condition_option" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "custom_specification" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "laptop_specification" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "laptop_image" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "administrator" ADD COLUMN "store_id" BIGINT;
ALTER TABLE "administrator" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT true;

UPDATE "brand" SET "store_id" = (SELECT "store_id" FROM "store" WHERE "slug" = 'liq-technologies');
UPDATE "laptop" SET "store_id" = (SELECT "store_id" FROM "store" WHERE "slug" = 'liq-technologies');
UPDATE "processor_brand_option" SET "store_id" = (SELECT "store_id" FROM "store" WHERE "slug" = 'liq-technologies');
UPDATE "storage_type_option" SET "store_id" = (SELECT "store_id" FROM "store" WHERE "slug" = 'liq-technologies');
UPDATE "condition_option" SET "store_id" = (SELECT "store_id" FROM "store" WHERE "slug" = 'liq-technologies');
UPDATE "custom_specification" SET "store_id" = (SELECT "store_id" FROM "store" WHERE "slug" = 'liq-technologies');
UPDATE "laptop_specification" AS child SET "store_id" = laptop."store_id"
FROM "laptop" WHERE child."laptop_id" = laptop."laptop_id";
UPDATE "laptop_image" AS child SET "store_id" = laptop."store_id"
FROM "laptop" WHERE child."laptop_id" = laptop."laptop_id";
UPDATE "administrator" SET "store_id" = (SELECT "store_id" FROM "store" WHERE "slug" = 'liq-technologies');

ALTER TABLE "brand" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "laptop" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "processor_brand_option" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "storage_type_option" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "condition_option" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "custom_specification" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "laptop_specification" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "laptop_image" ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "administrator" ALTER COLUMN "store_id" SET NOT NULL;

ALTER TABLE "laptop" DROP CONSTRAINT "laptop_brand_id_fkey";
ALTER TABLE "laptop" DROP CONSTRAINT "laptop_processor_brand_fkey";
ALTER TABLE "laptop" DROP CONSTRAINT "laptop_storage_type_fkey";
ALTER TABLE "laptop" DROP CONSTRAINT "laptop_condition_fkey";
ALTER TABLE "laptop_image" DROP CONSTRAINT "laptop_image_laptop_id_fkey";
ALTER TABLE "laptop_specification" DROP CONSTRAINT "laptop_specification_laptop_id_fkey";
ALTER TABLE "laptop_specification" DROP CONSTRAINT "laptop_specification_specification_id_fkey";

DROP INDEX "brand_brand_name_key";
DROP INDEX "processor_brand_option_option_name_key";
DROP INDEX "storage_type_option_option_name_key";
DROP INDEX "condition_option_option_name_key";
DROP INDEX "custom_specification_name_key";
DROP INDEX "administrator_username_key";
DROP INDEX "administrator_email_key";
DROP INDEX "laptop_configuration_unique";

CREATE UNIQUE INDEX "brand_store_id_brand_name_key" ON "brand"("store_id", "brand_name");
CREATE UNIQUE INDEX "brand_brand_id_store_id_key" ON "brand"("brand_id", "store_id");
CREATE UNIQUE INDEX "processor_brand_option_store_id_option_name_key" ON "processor_brand_option"("store_id", "option_name");
CREATE UNIQUE INDEX "processor_brand_option_store_id_option_id_key" ON "processor_brand_option"("store_id", "option_id");
CREATE UNIQUE INDEX "storage_type_option_store_id_option_name_key" ON "storage_type_option"("store_id", "option_name");
CREATE UNIQUE INDEX "storage_type_option_store_id_option_id_key" ON "storage_type_option"("store_id", "option_id");
CREATE UNIQUE INDEX "condition_option_store_id_option_name_key" ON "condition_option"("store_id", "option_name");
CREATE UNIQUE INDEX "condition_option_store_id_option_id_key" ON "condition_option"("store_id", "option_id");
CREATE UNIQUE INDEX "custom_specification_store_id_name_key" ON "custom_specification"("store_id", "name");
CREATE UNIQUE INDEX "custom_specification_specification_id_store_id_key" ON "custom_specification"("specification_id", "store_id");
CREATE UNIQUE INDEX "laptop_laptop_id_store_id_key" ON "laptop"("laptop_id", "store_id");
CREATE UNIQUE INDEX "administrator_store_id_username_key" ON "administrator"("store_id", "username");
CREATE UNIQUE INDEX "administrator_store_id_email_key" ON "administrator"("store_id", "email");
CREATE INDEX "laptop_store_id_idx" ON "laptop"("store_id");
CREATE INDEX "laptop_image_store_id_laptop_id_idx" ON "laptop_image"("store_id", "laptop_id");
CREATE INDEX "laptop_specification_store_id_specification_id_idx" ON "laptop_specification"("store_id", "specification_id");

CREATE UNIQUE INDEX "laptop_configuration_unique"
ON "laptop"(
    "store_id", "brand_id", "model", "processor_brand", "processor_model",
    "processor_generation", "ram_capacity", "storage_capacity", "storage_type", "condition"
) NULLS NOT DISTINCT;

ALTER TABLE "brand" ADD CONSTRAINT "brand_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "laptop" ADD CONSTRAINT "laptop_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "processor_brand_option" ADD CONSTRAINT "processor_brand_option_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "storage_type_option" ADD CONSTRAINT "storage_type_option_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "condition_option" ADD CONSTRAINT "condition_option_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_specification" ADD CONSTRAINT "custom_specification_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "administrator" ADD CONSTRAINT "administrator_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "laptop" ADD CONSTRAINT "laptop_brand_id_store_id_fkey"
FOREIGN KEY ("brand_id", "store_id") REFERENCES "brand"("brand_id", "store_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "laptop" ADD CONSTRAINT "laptop_store_processor_brand_fkey"
FOREIGN KEY ("store_id", "processor_brand") REFERENCES "processor_brand_option"("store_id", "option_name") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "laptop" ADD CONSTRAINT "laptop_store_storage_type_fkey"
FOREIGN KEY ("store_id", "storage_type") REFERENCES "storage_type_option"("store_id", "option_name") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "laptop" ADD CONSTRAINT "laptop_store_condition_fkey"
FOREIGN KEY ("store_id", "condition") REFERENCES "condition_option"("store_id", "option_name") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "laptop_image" ADD CONSTRAINT "laptop_image_laptop_id_store_id_fkey"
FOREIGN KEY ("laptop_id", "store_id") REFERENCES "laptop"("laptop_id", "store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "laptop_specification" ADD CONSTRAINT "laptop_specification_laptop_id_store_id_fkey"
FOREIGN KEY ("laptop_id", "store_id") REFERENCES "laptop"("laptop_id", "store_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "laptop_specification" ADD CONSTRAINT "laptop_specification_specification_id_store_id_fkey"
FOREIGN KEY ("specification_id", "store_id") REFERENCES "custom_specification"("specification_id", "store_id") ON DELETE RESTRICT ON UPDATE CASCADE;
