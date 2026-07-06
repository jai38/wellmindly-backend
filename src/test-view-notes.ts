import prisma from './lib/prisma';

async function test() {
  try {
    console.log("Fetching last 5 notes...");
    const notes = await prisma.talkNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const note of notes) {
      console.log(`\nNote ID: ${note.id}`);
      console.log(`Content: "${note.content}"`);
      console.log(`Status: ${note.status}`);
      console.log(`Moderation Reason: ${note.moderationReason}`);
    }
  } catch (err: any) {
    console.error("Failed to fetch notes:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
