CREATE TYPE "ReviewStatus" AS ENUM ('visible', 'hidden_by_admin', 'deleted_by_admin', 'deleted_by_user');

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbMediaType" TEXT NOT NULL,
    "tmdbMediaId" TEXT NOT NULL,
    "tmdbTitleSnapshot" TEXT NOT NULL,
    "tmdbPosterPathSnapshot" TEXT,
    "content" TEXT NOT NULL,
    "sentimentLabel" TEXT NOT NULL,
    "sentimentConfidence" DOUBLE PRECISION NOT NULL,
    "sentimentScoresJson" JSONB NOT NULL,
    "modelVersion" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'visible',
    "moderationMessage" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_userId_tmdbMediaType_tmdbMediaId_key" ON "Review"("userId", "tmdbMediaType", "tmdbMediaId");

CREATE INDEX "Review_tmdbMediaType_tmdbMediaId_status_idx" ON "Review"("tmdbMediaType", "tmdbMediaId", "status");

CREATE INDEX "Review_sentimentLabel_idx" ON "Review"("sentimentLabel");

CREATE INDEX "Review_status_idx" ON "Review"("status");

CREATE INDEX "Review_moderatedById_idx" ON "Review"("moderatedById");

ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
