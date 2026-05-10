-- CreateEnum
CREATE TYPE "StickerKind" AS ENUM ('FWC', 'COCA_COLA', 'NATION');

-- AlterTable
ALTER TABLE "Sticker" ADD COLUMN "stickerKind" "StickerKind" NOT NULL DEFAULT 'NATION';
ALTER TABLE "Sticker" ADD COLUMN "nationCode" TEXT;
