CREATE TABLE "ReviewHistory" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentimentLabel" TEXT NOT NULL,
    "sentimentConfidence" DOUBLE PRECISION NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewHistory_reviewId_createdAt_idx" ON "ReviewHistory"("reviewId", "createdAt");

CREATE INDEX "ReviewHistory_userId_createdAt_idx" ON "ReviewHistory"("userId", "createdAt");

ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
