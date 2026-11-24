CREATE TABLE "store_social_link" (
    "social_link_id" BIGSERIAL NOT NULL,
    "store_id" BIGINT NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "store_social_link_pkey" PRIMARY KEY ("social_link_id"),
    CONSTRAINT "store_social_link_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("store_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "store_social_link_store_id_display_order_idx" ON "store_social_link"("store_id", "display_order");
