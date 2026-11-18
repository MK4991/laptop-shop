CREATE TABLE "custom_specification" (
    "specification_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "input_type" VARCHAR(20) NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "custom_specification_pkey" PRIMARY KEY ("specification_id")
);

CREATE TABLE "laptop_specification" (
    "laptop_id" BIGINT NOT NULL,
    "specification_id" BIGINT NOT NULL,
    "value" VARCHAR(250) NOT NULL,
    CONSTRAINT "laptop_specification_pkey" PRIMARY KEY ("laptop_id", "specification_id")
);

CREATE UNIQUE INDEX "custom_specification_name_key" ON "custom_specification"("name");
CREATE INDEX "laptop_specification_specification_id_idx" ON "laptop_specification"("specification_id");

ALTER TABLE "laptop_specification"
ADD CONSTRAINT "laptop_specification_laptop_id_fkey"
FOREIGN KEY ("laptop_id") REFERENCES "laptop"("laptop_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "laptop_specification"
ADD CONSTRAINT "laptop_specification_specification_id_fkey"
FOREIGN KEY ("specification_id") REFERENCES "custom_specification"("specification_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
