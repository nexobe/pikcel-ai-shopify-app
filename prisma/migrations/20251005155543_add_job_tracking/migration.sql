-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "pikcelJobId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "inputImageUrl" TEXT NOT NULL,
    "outputImageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "parameters" TEXT,
    "errorMessage" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "productTitle" TEXT,
    "variantId" TEXT,
    "imageId" TEXT,
    "metadata" TEXT,
    "pushedToShopify" BOOLEAN NOT NULL DEFAULT false,
    "pushedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobBatch" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT,
    "toolId" TEXT NOT NULL,
    "toolName" TEXT,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "failedJobs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parameters" TEXT,
    "totalCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_pikcelJobId_key" ON "Job"("pikcelJobId");

-- CreateIndex
CREATE INDEX "Job_shop_status_idx" ON "Job"("shop", "status");

-- CreateIndex
CREATE INDEX "Job_shop_createdAt_idx" ON "Job"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "Job_pikcelJobId_idx" ON "Job"("pikcelJobId");

-- CreateIndex
CREATE INDEX "Job_productId_idx" ON "Job"("productId");

-- CreateIndex
CREATE INDEX "JobBatch_shop_status_idx" ON "JobBatch"("shop", "status");

-- CreateIndex
CREATE INDEX "JobBatch_shop_createdAt_idx" ON "JobBatch"("shop", "createdAt");
