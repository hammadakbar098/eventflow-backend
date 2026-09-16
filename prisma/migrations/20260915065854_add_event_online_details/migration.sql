-- CreateTable
CREATE TABLE "EventOnlineDetails" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "platform" VARCHAR(100) NOT NULL,
    "accessUrl" VARCHAR(2048) NOT NULL,
    "accessCode" VARCHAR(100),
    "accessInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOnlineDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventOnlineDetails_eventId_key" ON "EventOnlineDetails"("eventId");

-- AddForeignKey
ALTER TABLE "EventOnlineDetails" ADD CONSTRAINT "EventOnlineDetails_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
