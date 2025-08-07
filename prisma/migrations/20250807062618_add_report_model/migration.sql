-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isBoosted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jsonSettings" JSONB,
ADD COLUMN     "lookingFor" "public"."Gender",
ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
