ALTER TABLE "laptop_specification"
ADD COLUMN "number_value" DOUBLE PRECISION;

UPDATE "laptop_specification" AS value_row
SET "number_value" = value_row."value"::double precision
FROM "custom_specification" AS definition
WHERE value_row."specification_id" = definition."specification_id"
  AND definition."input_type" = 'number'
  AND value_row."value" ~ '^[+-]?([0-9]+([.]([0-9]*)?)?|[.]([0-9]+))([eE][+-]?[0-9]+)?$';

DROP INDEX "laptop_configuration_unique";

ALTER TABLE "laptop"
DROP COLUMN "graphics_card",
DROP COLUMN "screen_size";

CREATE UNIQUE INDEX "laptop_configuration_unique"
ON "laptop"(
    "brand_id",
    "model",
    "processor_brand",
    "processor_model",
    "processor_generation",
    "ram_capacity",
    "storage_capacity",
    "storage_type",
    "condition"
)
NULLS NOT DISTINCT;
