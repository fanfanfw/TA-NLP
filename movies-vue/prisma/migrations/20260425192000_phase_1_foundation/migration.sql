CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE INDEX "User_approvalStatus_idx" ON "User"("approvalStatus");

CREATE INDEX "User_role_idx" ON "User"("role");

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
