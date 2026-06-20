import prisma from './src/lib/prisma';

async function main() {
  const quizzes = await prisma.quiz.findMany({
    include: {
      questions: true
    }
  });
  console.log('--- DATABASE QUIZZES & QUESTIONS ---');
  for (const q of quizzes) {
    console.log(`Quiz Title: ${q.title}`);
    console.log(`Quiz ID: ${q.id}`);
    console.log(`Questions Count: ${q.questions.length}`);
    console.log('-----------------------------');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
