/*
  Warnings:

  - A unique constraint covering the columns `[brand_id,model,processor_brand,processor_model,processor_generation,ram_capacity,storage_capacity,storage_type,condition,graphics_card,screen_size]` on the table `laptop` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
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
    "condition",
    "graphics_card",
    "screen_size"
)
NULLS NOT DISTINCT;
