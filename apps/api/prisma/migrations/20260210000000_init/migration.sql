-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('ACCOUNT_PERFORMANCE', 'POST_PERFORMANCE', 'KEYWORD_TREND', 'CREATOR_DISCOVERY', 'COMPETITOR_BENCHMARK', 'CONTENT_ANALYSIS', 'AUDIENCE_INSIGHTS', 'TOPIC_LANDSCAPE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('KEYWORD_SPIKE', 'KEYWORD_TREND_CHANGE', 'MENTION_ALERT', 'COMPETITOR_POST', 'ENGAGEMENT_MILESTONE', 'FOLLOWER_MILESTONE');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'XLSX', 'PDF', 'JSON');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "emailVerified" TIMESTAMP(3),
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadsConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "biography" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "lastSyncAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadsConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountInsightsSnapshot" (
    "id" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER,
    "likes" INTEGER,
    "replies" INTEGER,
    "reposts" INTEGER,
    "quotes" INTEGER,
    "followersCount" INTEGER,
    "followersByCountry" JSONB,
    "followersByCity" JSONB,
    "followersByAge" JSONB,
    "followersByGender" JSONB,

    CONSTRAINT "AccountInsightsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostInsight" (
    "id" TEXT NOT NULL,
    "threadsMediaId" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "text" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "permalink" TEXT,
    "topicTag" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "quotes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostInsightSnapshot" (
    "id" TEXT NOT NULL,
    "postInsightId" TEXT NOT NULL,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "replies" INTEGER NOT NULL,
    "reposts" INTEGER NOT NULL,
    "quotes" INTEGER NOT NULL,
    "shares" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostInsightSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedKeyword" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordTrendData" (
    "id" TEXT NOT NULL,
    "trackedKeywordId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "postCount" INTEGER NOT NULL,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalReplies" INTEGER NOT NULL DEFAULT 0,
    "totalReposts" INTEGER NOT NULL DEFAULT 0,
    "avgEngagement" DOUBLE PRECISION,
    "topPostId" TEXT,
    "topCreatorId" TEXT,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KeywordTrendData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "biography" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "observedPostCount" INTEGER NOT NULL DEFAULT 0,
    "avgLikes" DOUBLE PRECISION,
    "avgReplies" DOUBLE PRECISION,
    "avgReposts" DOUBLE PRECISION,
    "avgEngagement" DOUBLE PRECISION,
    "primaryTopics" TEXT[],
    "postFrequency" TEXT,
    "lastPostAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSnapshot" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "observedPosts" INTEGER NOT NULL,
    "avgLikes" DOUBLE PRECISION,
    "avgReplies" DOUBLE PRECISION,
    "avgReposts" DOUBLE PRECISION,
    "avgEngagement" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedCreator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedCreator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPost" (
    "id" TEXT NOT NULL,
    "threadsMediaId" TEXT NOT NULL,
    "creatorId" TEXT,
    "username" TEXT NOT NULL,
    "text" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "permalink" TEXT,
    "topicTag" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "isQuotePost" BOOLEAN NOT NULL DEFAULT false,
    "discoveredVia" TEXT,
    "discoveryKeyword" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPostSnapshot" (
    "id" TEXT NOT NULL,
    "publicPostId" TEXT NOT NULL,
    "likes" INTEGER NOT NULL,
    "replies" INTEGER NOT NULL,
    "reposts" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicPostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicPostId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'TEXT',
    "mediaUrls" TEXT[],
    "replyToId" TEXT,
    "replyControl" TEXT,
    "topicTag" TEXT,
    "pollOptions" TEXT[],
    "pollDuration" INTEGER,
    "linkUrl" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "threadsMediaId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "parameters" JSONB NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
    "resultSummary" JSONB,
    "resultData" JSONB,
    "resultCount" INTEGER,
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackedKeywordId" TEXT,
    "type" "AlertType" NOT NULL,
    "condition" JSONB NOT NULL,
    "channels" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadsConnection_userId_key" ON "ThreadsConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadsConnection_threadsUserId_key" ON "ThreadsConnection"("threadsUserId");

-- CreateIndex
CREATE INDEX "AccountInsightsSnapshot_threadsUserId_date_idx" ON "AccountInsightsSnapshot"("threadsUserId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AccountInsightsSnapshot_threadsUserId_date_key" ON "AccountInsightsSnapshot"("threadsUserId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PostInsight_threadsMediaId_key" ON "PostInsight"("threadsMediaId");

-- CreateIndex
CREATE INDEX "PostInsight_threadsUserId_publishedAt_idx" ON "PostInsight"("threadsUserId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "PostInsight_topicTag_idx" ON "PostInsight"("topicTag");

-- CreateIndex
CREATE INDEX "PostInsight_engagementRate_idx" ON "PostInsight"("engagementRate" DESC);

-- CreateIndex
CREATE INDEX "PostInsightSnapshot_postInsightId_capturedAt_idx" ON "PostInsightSnapshot"("postInsightId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "TrackedKeyword_userId_isActive_idx" ON "TrackedKeyword"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedKeyword_userId_keyword_key" ON "TrackedKeyword"("userId", "keyword");

-- CreateIndex
CREATE INDEX "KeywordTrendData_trackedKeywordId_date_idx" ON "KeywordTrendData"("trackedKeywordId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "KeywordTrendData_trackedKeywordId_date_key" ON "KeywordTrendData"("trackedKeywordId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_threadsUserId_key" ON "Creator"("threadsUserId");

-- CreateIndex
CREATE INDEX "CreatorSnapshot_creatorId_capturedAt_idx" ON "CreatorSnapshot"("creatorId", "capturedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedCreator_userId_creatorId_key" ON "TrackedCreator"("userId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicPost_threadsMediaId_key" ON "PublicPost"("threadsMediaId");

-- CreateIndex
CREATE INDEX "PublicPost_username_idx" ON "PublicPost"("username");

-- CreateIndex
CREATE INDEX "PublicPost_publishedAt_idx" ON "PublicPost"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "PublicPost_topicTag_idx" ON "PublicPost"("topicTag");

-- CreateIndex
CREATE INDEX "PublicPost_discoveryKeyword_idx" ON "PublicPost"("discoveryKeyword");

-- CreateIndex
CREATE INDEX "PublicPostSnapshot_publicPostId_capturedAt_idx" ON "PublicPostSnapshot"("publicPostId", "capturedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedPost_userId_publicPostId_key" ON "TrackedPost"("userId", "publicPostId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_userId_creatorId_key" ON "Competitor"("userId", "creatorId");

-- CreateIndex
CREATE INDEX "ScheduledPost_userId_scheduledFor_idx" ON "ScheduledPost"("userId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_scheduledFor_idx" ON "ScheduledPost"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadsConnection" ADD CONSTRAINT "ThreadsConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostInsightSnapshot" ADD CONSTRAINT "PostInsightSnapshot_postInsightId_fkey" FOREIGN KEY ("postInsightId") REFERENCES "PostInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedKeyword" ADD CONSTRAINT "TrackedKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordTrendData" ADD CONSTRAINT "KeywordTrendData_trackedKeywordId_fkey" FOREIGN KEY ("trackedKeywordId") REFERENCES "TrackedKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSnapshot" ADD CONSTRAINT "CreatorSnapshot_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedCreator" ADD CONSTRAINT "TrackedCreator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedCreator" ADD CONSTRAINT "TrackedCreator_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicPost" ADD CONSTRAINT "PublicPost_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicPostSnapshot" ADD CONSTRAINT "PublicPostSnapshot_publicPostId_fkey" FOREIGN KEY ("publicPostId") REFERENCES "PublicPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedPost" ADD CONSTRAINT "TrackedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedPost" ADD CONSTRAINT "TrackedPost_publicPostId_fkey" FOREIGN KEY ("publicPostId") REFERENCES "PublicPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_trackedKeywordId_fkey" FOREIGN KEY ("trackedKeywordId") REFERENCES "TrackedKeyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

