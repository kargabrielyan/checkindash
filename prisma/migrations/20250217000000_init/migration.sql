-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('IN_OFFICE', 'OUT_OF_OFFICE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "PresenceStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "beaconUrl" TEXT,
    "beaconHttpStatus" INTEGER,
    "beaconLatencyMs" INTEGER,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presence_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "presence_events_userId_timestamp_idx" ON "presence_events"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "presence_events_timestamp_idx" ON "presence_events"("timestamp");

-- CreateIndex
CREATE INDEX "presence_events_status_timestamp_idx" ON "presence_events"("status", "timestamp");

-- AddForeignKey
ALTER TABLE "presence_events" ADD CONSTRAINT "presence_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
