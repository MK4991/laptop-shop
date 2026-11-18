CREATE TABLE "processor_brand_option" (
    "option_id" BIGSERIAL NOT NULL,
    "option_name" VARCHAR(30) NOT NULL,
    CONSTRAINT "processor_brand_option_pkey" PRIMARY KEY ("option_id")
);

CREATE TABLE "storage_type_option" (
    "option_id" BIGSERIAL NOT NULL,
    "option_name" VARCHAR(30) NOT NULL,
    CONSTRAINT "storage_type_option_pkey" PRIMARY KEY ("option_id")
);

CREATE TABLE "condition_option" (
    "option_id" BIGSERIAL NOT NULL,
    "option_name" VARCHAR(20) NOT NULL,
    CONSTRAINT "condition_option_pkey" PRIMARY KEY ("option_id")
);

CREATE UNIQUE INDEX "processor_brand_option_option_name_key" ON "processor_brand_option"("option_name");
CREATE UNIQUE INDEX "storage_type_option_option_name_key" ON "storage_type_option"("option_name");
CREATE UNIQUE INDEX "condition_option_option_name_key" ON "condition_option"("option_name");

INSERT INTO "processor_brand_option" ("option_name")
SELECT DISTINCT "processor_brand" FROM "laptop" WHERE "processor_brand" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "processor_brand_option" ("option_name") VALUES ('Intel'), ('AMD'), ('Apple'), ('Other')
ON CONFLICT DO NOTHING;

INSERT INTO "storage_type_option" ("option_name")
SELECT DISTINCT "storage_type" FROM "laptop" WHERE "storage_type" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "storage_type_option" ("option_name") VALUES ('SSD'), ('HDD'), ('NVMe SSD'), ('eMMC'), ('Other')
ON CONFLICT DO NOTHING;

INSERT INTO "condition_option" ("option_name")
SELECT DISTINCT "condition" FROM "laptop" WHERE "condition" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "condition_option" ("option_name") VALUES ('New'), ('Used')
ON CONFLICT DO NOTHING;

ALTER TABLE "laptop"
ADD CONSTRAINT "laptop_processor_brand_fkey"
FOREIGN KEY ("processor_brand") REFERENCES "processor_brand_option"("option_name")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "laptop"
ADD CONSTRAINT "laptop_storage_type_fkey"
FOREIGN KEY ("storage_type") REFERENCES "storage_type_option"("option_name")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "laptop"
ADD CONSTRAINT "laptop_condition_fkey"
FOREIGN KEY ("condition") REFERENCES "condition_option"("option_name")
ON DELETE RESTRICT ON UPDATE CASCADE;
