-- CreateEnum
CREATE TYPE "TalkStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('SUPPORT', 'HUG', 'METOO');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizFeedback" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisHotline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisHotline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityOnboarding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "universityName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniversityOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselorOnboarding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "credentials" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounselorOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalkRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkNote" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TalkStatus" NOT NULL DEFAULT 'APPROVED',
    "meTooCount" INTEGER NOT NULL DEFAULT 0,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" DOUBLE PRECISION,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkReply" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TalkStatus" NOT NULL DEFAULT 'APPROVED',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkReaction" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalkReport" (
    "id" TEXT NOT NULL,
    "noteId" TEXT,
    "replyId" TEXT,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizFeedback_resultId_key" ON "QuizFeedback"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_email_feature_key" ON "Waitlist"("email", "feature");

-- CreateIndex
CREATE INDEX "DailyCheckin_userId_createdAt_idx" ON "DailyCheckin"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CrisisHotline_category_idx" ON "CrisisHotline"("category");

-- CreateIndex
CREATE INDEX "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");

-- CreateIndex
CREATE INDEX "UniversityOnboarding_createdAt_idx" ON "UniversityOnboarding"("createdAt");

-- CreateIndex
CREATE INDEX "CounselorOnboarding_createdAt_idx" ON "CounselorOnboarding"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TalkRoom_name_key" ON "TalkRoom"("name");

-- CreateIndex
CREATE INDEX "TalkNote_roomId_status_createdAt_idx" ON "TalkNote"("roomId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TalkNote_userId_createdAt_idx" ON "TalkNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TalkReply_noteId_status_createdAt_idx" ON "TalkReply"("noteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TalkReply_userId_createdAt_idx" ON "TalkReply"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TalkReaction_noteId_userId_type_key" ON "TalkReaction"("noteId", "userId", "type");

-- CreateIndex
CREATE INDEX "TalkReport_createdAt_idx" ON "TalkReport"("createdAt");

-- CreateIndex
CREATE INDEX "QuizResult_userId_completedAt_idx" ON "QuizResult"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizFeedback" ADD CONSTRAINT "QuizFeedback_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "QuizResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckin" ADD CONSTRAINT "DailyCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkNote" ADD CONSTRAINT "TalkNote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TalkRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkNote" ADD CONSTRAINT "TalkNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkReply" ADD CONSTRAINT "TalkReply_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "TalkNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkReply" ADD CONSTRAINT "TalkReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkReaction" ADD CONSTRAINT "TalkReaction_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "TalkNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkReaction" ADD CONSTRAINT "TalkReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkReport" ADD CONSTRAINT "TalkReport_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "TalkNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkReport" ADD CONSTRAINT "TalkReport_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "TalkReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkReport" ADD CONSTRAINT "TalkReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
