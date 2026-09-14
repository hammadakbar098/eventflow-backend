/*
  Warnings:

  - A unique constraint covering the columns `[refreshTokenHash]` on the table `AuthSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");
