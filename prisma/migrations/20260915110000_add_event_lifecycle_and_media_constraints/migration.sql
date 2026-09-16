-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" VARCHAR(500),
ADD COLUMN "postponedAt" TIMESTAMP(3),
ADD COLUMN "postponementReason" VARCHAR(500);

-- Enforce one cover image per event while allowing multiple gallery images.
CREATE UNIQUE INDEX "EventMedia_one_cover_per_event"
ON "EventMedia"("eventId")
WHERE "type" = 'COVER';
