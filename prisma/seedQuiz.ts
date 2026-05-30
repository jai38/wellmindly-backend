import prisma from '../src/lib/prisma';

async function main() {
  // Check if PHQ-9 quiz already exists
  let quiz = await prisma.quiz.findFirst({
    where: { title: 'PHQ-9 Wellness Assessment' }
  });

  if (!quiz) {
    console.log('Creating PHQ-9 Quiz template...');
    quiz = await prisma.quiz.create({
      data: {
        title: 'PHQ-9 Wellness Assessment',
        description: 'A brief, 9-question depression severity assessment.',
        category: 'Clinical',
        totalQuestions: 5, // Mocking 5 for our standard wizard test
        maxScore: 15,
      }
    });
  }

  // Clear existing questions for this quiz to avoid duplicates
  await prisma.question.deleteMany({
    where: { quizId: quiz.id }
  });

  const PHQ9_QUESTIONS = [
    { text: "Little interest or pleasure in doing things?" },
    { text: "Feeling down, depressed, or hopeless?" },
    { text: "Trouble falling or staying asleep, or sleeping too much?" },
    { text: "Feeling tired or having little energy?" },
    { text: "Poor appetite or overeating?" }
  ];

  const OPTIONS = [
    { label: "Not at all", points: 0 },
    { label: "Several days", points: 1 },
    { label: "More than half the days", points: 2 },
    { label: "Nearly every day", points: 3 }
  ];

  for (let i = 0; i < PHQ9_QUESTIONS.length; i++) {
    const qData = PHQ9_QUESTIONS[i];
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        index: i,
        text: qData.text,
        type: "MULTIPLE_CHOICE",
        options: {
          create: OPTIONS.map(opt => ({
            label: opt.label,
            points: opt.points
          }))
        }
      }
    });
  }

  console.log(`Successfully seeded Quiz [${quiz.id}] with ${PHQ9_QUESTIONS.length} structured questions.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
