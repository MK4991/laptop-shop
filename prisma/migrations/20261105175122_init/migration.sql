-- CreateTable
CREATE TABLE "brand" (
    "brand_id" BIGSERIAL NOT NULL,
    "brand_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("brand_id")
);

-- CreateTable
CREATE TABLE "laptop" (
    "laptop_id" BIGSERIAL NOT NULL,
    "brand_id" BIGINT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "processor_brand" VARCHAR(30) NOT NULL,
    "processor_model" VARCHAR(100) NOT NULL,
    "processor_generation" INTEGER,
    "ram_capacity" INTEGER NOT NULL,
    "storage_capacity" INTEGER NOT NULL,
    "storage_type" VARCHAR(30) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "condition" VARCHAR(20) NOT NULL,
    "graphics_card" VARCHAR(100) NOT NULL,
    "screen_size" DECIMAL(4,1) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "availability" VARCHAR(20) NOT NULL DEFAULT 'Available',

    CONSTRAINT "laptop_pkey" PRIMARY KEY ("laptop_id")
);

-- CreateTable
CREATE TABLE "laptop_image" (
    "image_id" BIGSERIAL NOT NULL,
    "laptop_id" BIGINT NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "laptop_image_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "administrator" (
    "admin_id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,

    CONSTRAINT "administrator_pkey" PRIMARY KEY ("admin_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_brand_name_key" ON "brand"("brand_name");

-- CreateIndex
CREATE UNIQUE INDEX "administrator_username_key" ON "administrator"("username");

-- CreateIndex
CREATE UNIQUE INDEX "administrator_email_key" ON "administrator"("email");

-- AddForeignKey
ALTER TABLE "laptop" ADD CONSTRAINT "laptop_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("brand_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laptop_image" ADD CONSTRAINT "laptop_image_laptop_id_fkey" FOREIGN KEY ("laptop_id") REFERENCES "laptop"("laptop_id") ON DELETE CASCADE ON UPDATE CASCADE;
