-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- AlterTable
ALTER TABLE "users"
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "provider_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_challenges" (
    "id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "state_hash" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "code_verifier_encrypted" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_by_ip" TEXT,
    "created_by_user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_user_id_key"
ON "auth_identities"("provider", "provider_user_id");

CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");
CREATE INDEX "auth_identities_provider_provider_email_idx"
ON "auth_identities"("provider", "provider_email");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_challenges_state_hash_key" ON "oauth_challenges"("state_hash");
CREATE INDEX "oauth_challenges_provider_expires_at_idx"
ON "oauth_challenges"("provider", "expires_at");
CREATE INDEX "oauth_challenges_used_at_idx" ON "oauth_challenges"("used_at");

-- AddForeignKey
ALTER TABLE "auth_identities"
ADD CONSTRAINT "auth_identities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
