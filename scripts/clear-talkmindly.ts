import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL?.split('?')[0];

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Clearing TalkMindly messages, replies, reactions, reports...');
  
  // Delete reactions, replies, reports first due to foreign key constraints
  const deletedReactions = await prisma.talkReaction.deleteMany({});
  console.log(`- Deleted ${deletedReactions.count} reactions`);

  const deletedReports = await prisma.talkReport.deleteMany({});
  console.log(`- Deleted ${deletedReports.count} reports`);

  const deletedReplies = await prisma.talkReply.deleteMany({});
  console.log(`- Deleted ${deletedReplies.count} replies`);

  const deletedNotes = await prisma.talkNote.deleteMany({});
  console.log(`- Deleted ${deletedNotes.count} notes/posts`);

  // Delete chat messages (from 1-on-1 counselor chats if any)
  const deletedChatMessages = await prisma.chatMessage.deleteMany({});
  console.log(`- Deleted ${deletedChatMessages.count} chat messages`);

  // Delete daily checkins
  const deletedCheckins = await prisma.dailyCheckin.deleteMany({});
  console.log(`- Deleted ${deletedCheckins.count} daily check-ins`);

  // Delete quiz results
  const deletedQuizResults = await prisma.quizResult.deleteMany({});
  console.log(`- Deleted ${deletedQuizResults.count} quiz results`);

  // Delete students (role = STUDENT)
  console.log('🧹 Clearing student user accounts...');
  const deletedStudents = await prisma.user.deleteMany({
    where: { role: 'STUDENT' }
  });
  console.log(`- Deleted ${deletedStudents.count} student user accounts`);
  
  console.log('🎉 Clean completed successfully!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
