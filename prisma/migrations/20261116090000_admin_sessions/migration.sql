CREATE TABLE "admin_session" (
    "sid" VARCHAR(255) NOT NULL,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX "admin_session_expires_at_idx" ON "admin_session"("expires_at");
