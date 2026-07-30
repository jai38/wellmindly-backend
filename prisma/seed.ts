import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import 'dotenv/config';

const isLocalhost = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1');
const connectionString = process.env.DATABASE_URL?.split('?')[0];

const pool = new Pool({
  connectionString,
  ssl: isLocalhost ? undefined : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LikertOptions = [
  { label: "Strongly agree", points: 5 },
  { label: "Agree", points: 4 },
  { label: "Neither", points: 3 },
  { label: "Disagree", points: 2 },
  { label: "Strongly disagree", points: 1 }
];

const quizzesToSeed = [
  {
    title: "Emotional check-in",
    description: "A two-minute snapshot. See how you’re really doing, and watch it shift over the weeks.",
    category: "Wellbeing",
    maxScore: 35,
    questions: [
      { text: "I feel like my daily load is comfortable and manageable." },
      { text: "I wake up feeling fresh, rested, and recharged." },
      { text: "My mind feels quiet, calm, and able to settle easily." },
      { text: "I feel genuinely connected to the people around me." },
      { text: "My mood feels steady, and I can roll with small setbacks." },
      { text: "I am kind and understanding with myself when things go wrong." },
      { text: "I feel hopeful and quietly positive about what lies ahead." }
    ],
    options: LikertOptions
  },
  {
    title: "Mood snapshot",
    description: "A one-tap picture check. Fast, honest, and it adds a tile to your moodboard.",
    category: "Quick",
    maxScore: 88,
    questions: [
      { text: "Which feels most like right now?" }
    ],
    options: [
      { label: "Bright", points: 88 },
      { label: "Steady", points: 64 },
      { label: "Tangled", points: 40 },
      { label: "Heavy", points: 20 },
      { label: "Tender", points: 48 },
      { label: "Wired", points: 55 }
    ]
  },
  {
    title: "Mental load",
    description: "A brief self-reflection checking the weight of your daily to-do list.",
    category: "Mind & mood",
    maxScore: 20,
    questions: [
      { text: "My daily workload feels comfortable and manageable." },
      { text: "I rarely feel like I am playing catch-up with my tasks." },
      { text: "I have only a few mental tabs open in my head right now." },
      { text: "I can easily put down my responsibilities and rest when needed." }
    ],
    options: LikertOptions
  },
  {
    title: "Headspace",
    description: "Understand how busy or calm your thoughts feel under focus.",
    category: "Mind & mood",
    maxScore: 25,
    questions: [
      { text: "My mind feels quiet and calm today." },
      { text: "I find it easy to quiet my thoughts and stop overthinking." },
      { text: "At night, my thoughts settle down easily and let me sleep." },
      { text: "I find it easy to focus on one task at a time." },
      { text: "I feel like I have enough space in my head to think clearly." }
    ],
    options: LikertOptions
  },
  {
    title: "Your circle",
    description: "Reflect on connection, belonging, and your campus support network.",
    category: "Wellbeing",
    maxScore: 25,
    questions: [
      { text: "I've got people in my life I can be completely real with." },
      { text: "I feel like I belong and fit in here." },
      { text: "Reaching out when I'm struggling feels doable." },
      { text: "When something good happens, I have people to share it with." },
      { text: "I feel understood and gotten by those around me." }
    ],
    options: LikertOptions
  },
  {
    title: "Running on empty",
    description: "Reflect on fatigue, pacing, and sleep sustainability.",
    category: "Wellbeing",
    maxScore: 25,
    questions: [
      { text: "I wake up feeling rested and refreshed after sleeping." },
      { text: "I have steady energy for the things that matter to me." },
      { text: "I take regular, proper breaks to recharge." },
      { text: "My current pace feels steady and sustainable." },
      { text: "I find that rest actually helps me feel recharged." }
    ],
    options: LikertOptions
  },
  {
    title: "Signature strengths",
    description: "Your top character strengths: the qualities you lead with, on a card made to share.",
    category: "Strengths",
    maxScore: 60,
    questions: [
      { text: "I light up at new things — questions, ideas, and rabbit holes." },
      { text: "I prefer to go deep rather than wide to actually understand things." },
      { text: "I would rather make or build things than just talk about them." },
      { text: "I notice when someone is off and try to make them feel safe." },
      { text: "I say the real thing kindly so people know where they stand." },
      { text: "I naturally act as the one who keeps my group of people together." },
      { text: "I bend without breaking, and hard days don't take me all the way down." },
      { text: "I follow through and keep going even when it stops being fun." },
      { text: "I do the scary thing anyway — the email, the talk, or the ask." },
      { text: "I catch and appreciate the small good things others scroll past." },
      { text: "I have a strong sense of what's right and I stick to it." },
      { text: "I bring lightness and help people not carry things so heavily." }
    ],
    options: LikertOptions
  },
  {
    title: "Personality profile",
    description: "Five core traits that add up to an archetype that’s unmistakably you.",
    category: "Identity",
    maxScore: 50,
    questions: [
      { text: "I love trying new experiences and ideas." },
      { text: "I have a vivid imagination and enjoy abstract thinking." },
      { text: "I get things done and like to be organised." },
      { text: "I follow through on what I plan to do." },
      { text: "I feel energised around other people." },
      { text: "I start conversations and enjoy being social." },
      { text: "I’m considerate and care about others’ feelings." },
      { text: "I trust people and assume the best in them." },
      { text: "I stay calm and steady under pressure." },
      { text: "I rarely let small setbacks rattle me." }
    ],
    options: LikertOptions
  },
  {
    title: "What matters most",
    description: "A quick this-or-that that reveals the values you quietly lead with.",
    category: "Values",
    maxScore: 8,
    questions: [
      { text: "A surprising adventure vs. A safe, settled plan" },
      { text: "Deep time with one friend vs. Winning at something hard" },
      { text: "Total freedom to choose vs. Learning and growing" },
      { text: "Trying something risky vs. Helping someone you love" },
      { text: "Being recognised for your work vs. A calm, secure week" },
      { text: "Mastering a new skill vs. Doing it your own way" },
      { text: "A loyal close circle vs. An open road, no plan" },
      { text: "Becoming wiser vs. Achieving a big goal" }
    ],
    options: [
      { label: "Option A", points: 1 },
      { label: "Option B", points: 1 }
    ]
  },
  {
    title: "Strength & shadow",
    description: "Your greatest strength and its flip side: usually the same trait, turned up.",
    category: "Insight",
    maxScore: 40,
    questions: [
      { text: "I deeply feel what the people around me are feeling." },
      { text: "I notice straight away when someone’s a bit off." },
      { text: "I push hard to reach the goals I set." },
      { text: "I’m driven to accomplish and make progress." },
      { text: "I like doing things my own way, on my own terms." },
      { text: "I resist being boxed in by rules or routine." },
      { text: "I work hard to keep everyone around me happy." },
      { text: "I’ll smooth things over to avoid conflict." }
    ],
    options: LikertOptions
  },
  {
    title: "Your season",
    description: "A 90-second read on the self-discovery season you are currently in.",
    category: "Reflective",
    maxScore: 4,
    questions: [
      { text: "Resting / pulling inward vs. Out in the world" },
      { text: "Rebuilding, finding footing vs. Changing, in transition" },
      { text: "Low and quiet energy vs. Growing energy again" },
      { text: "Quiet reflection vs. Action and motion" }
    ],
    options: [
      { label: "Option A", points: 1 },
      { label: "Option B", points: 1 }
    ]
  }
];

function getMockClassification(quizTitle: string, score: number): string {
  if (quizTitle === "Emotional check-in") {
    const avg = score / 7;
    let label = "Heavier Stretch";
    if (avg >= 4) label = "Doing Well";
    else if (avg >= 2.5) label = "Finding Footing";
    
    return JSON.stringify({
      classification: label,
      aiFeedback: {
        headline: label === "Doing Well" ? "Steady flow" : label === "Finding Footing" ? "Steering through standard days" : "Feeling a bit weighed down",
        narrative: label === "Doing Well" ? "You have a solid rhythm going. Your energy and connections feel supportive." : "Things are a bit mixed. You have steady moments but are carrying a noticeable load.",
        tip: "Write down three small things that helped you breathe easier today.",
        insights: [
          "Your connections provide a real sense of belonging right now.",
          "Morning routine adjustments could help you feel more rested."
        ]
      },
      answers: {
        scores: { "Breathing room": Math.round(score * 2.8), "Rested": Math.round(score * 2.5) },
        summary: label,
        responses: [4, 3, 3, 4, 4, 3, 4]
      }
    });
  } else if (quizTitle === "Mood snapshot") {
    let label = "Steady";
    if (score >= 88) label = "Bright";
    else if (score >= 64) label = "Steady";
    else if (score >= 48) label = "Tender";
    else if (score >= 40) label = "Tangled";
    else label = "Heavy";
    
    return JSON.stringify({
      classification: label,
      aiFeedback: {
        headline: `A ${label.toLowerCase()} snapshot`,
        narrative: `You checked in as feeling ${label.toLowerCase()}. Sitting in this space for a moment is fine.`,
        tip: "Notice the feeling without trying to change it immediately.",
        insights: ["This snapshot is part of a moving picture. Tomorrow could feel different."]
      },
      answers: {
        label,
        tone: score
      }
    });
  } else {
    // Mental load
    const pct = (score / 20) * 100;
    let label = "Steady";
    if (pct >= 75) label = "Excellent";
    else if (pct >= 50) label = "Steady";
    else label = "Taking Care";
    
    return JSON.stringify({
      classification: label,
      aiFeedback: {
        headline: label === "Excellent" ? "Light load" : label === "Steady" ? "Manageable pacing" : "Tabs piling up",
        narrative: "Your daily workload is in focus. Checking how much you carry helps you pace yourself.",
        tip: "Pick one task to delay or delegate today.",
        insights: ["Your focus is steady, but screen time limits might buy back energy."]
      },
      answers: {
        scores: { "Breathing room": Math.round(score * 5) },
        summary: label,
        responses: [4, 3, 3, 4]
      }
    });
  }
}

async function main() {
  console.log('🌱 Starting seed...');

  // SAFETY: No deleteMany() cleanups to preserve existing student accounts, check-ins, feedbacks, and submissions!

  // 1. Seed Quizzes conditionally (Upsert-like checking)
  const seededQuizzes: Record<string, any> = {};
  for (const qDef of quizzesToSeed) {
    let quiz = await prisma.quiz.findFirst({
      where: { title: qDef.title }
    });

    if (!quiz) {
      quiz = await prisma.quiz.create({
        data: {
          title: qDef.title,
          description: qDef.description,
          category: qDef.category,
          totalQuestions: qDef.questions.length,
          maxScore: qDef.maxScore
        }
      });
      console.log(`✅ Created Quiz: ${quiz.title}`);
    } else {
      quiz = await prisma.quiz.update({
        where: { id: quiz.id },
        data: {
          description: qDef.description,
          category: qDef.category,
          totalQuestions: qDef.questions.length,
          maxScore: qDef.maxScore
        }
      });
      console.log(`✨ Updated Quiz: ${quiz.title}`);
    }
    seededQuizzes[qDef.title] = quiz;

    // Sync Questions conditionally
    for (let i = 0; i < qDef.questions.length; i++) {
      const qText = qDef.questions[i].text;
      let question = await prisma.question.findFirst({
        where: { quizId: quiz.id, index: i }
      });

      if (!question) {
        question = await prisma.question.create({
          data: {
            quizId: quiz.id,
            index: i,
            text: qText,
            type: "MULTIPLE_CHOICE",
            options: {
              create: qDef.options.map(opt => ({
                label: opt.label,
                points: opt.points
              }))
            }
          }
        });
      } else {
        question = await prisma.question.update({
          where: { id: question.id },
          data: {
            text: qText
          }
        });
      }
    }
  }

  // 2. Create 1 mock university conditionally
  let university = await prisma.university.findFirst({
    where: { domain: 'wellmindly.com' }
  });
  if (!university) {
    university = await prisma.university.create({
      data: {
        name: 'Wellmindly University',
        domain: 'wellmindly.com',
        verified: true,
      },
    });
  }
  console.log(`✅ University: ${university.name} (id: ${university.id})`);

  let universityCom = await prisma.university.findFirst({
    where: { domain: 'wellmindly.com' }
  });
  if (!universityCom) {
    universityCom = await prisma.university.create({
      data: {
        name: 'Wellmindly University Com',
        domain: 'wellmindly.com',
        verified: true,
      },
    });
  }
  console.log(`✅ University Com: ${universityCom.name} (id: ${universityCom.id})`);

  // 3. Create 5 mock student accounts conditionally
  const students = [
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice@wellmindly.com' },
    { firstName: 'Bob', lastName: 'Smith', email: 'bob@wellmindly.com' },
    { firstName: 'Carol', lastName: 'Williams', email: 'carol@wellmindly.com' },
    { firstName: 'David', lastName: 'Brown', email: 'david@wellmindly.com' },
    { firstName: 'Eva', lastName: 'Davis', email: 'eva@wellmindly.com' },
  ];

  const targetQuizzes = ["Emotional check-in", "Mood snapshot", "Mental load"];

  for (const s of students) {
    let student = await prisma.user.findUnique({
      where: { email: s.email }
    });

    if (!student) {
      const passwordHash = await bcrypt.hash('Password123!', SALT_ROUNDS);
      student = await prisma.user.create({
        data: {
          email: s.email,
          passwordHash,
          firstName: s.firstName,
          lastName: s.lastName,
          role: 'STUDENT',
          universityId: university.id,
        },
      });
      console.log(`✅ Seeded Student: ${student.firstName} ${student.lastName}`);

      // 4. Generate random staggered quiz result histories only for newly-seeded students
      for (const qTitle of targetQuizzes) {
        const targetQuiz = seededQuizzes[qTitle];
        if (targetQuiz) {
          // Generate 3 entries per quiz staggered over 14 days
          for (let dayAgo = 12; dayAgo >= 0; dayAgo -= 5) {
            const score = randomInt(Math.round(targetQuiz.maxScore * 0.4), targetQuiz.maxScore);
            const classification = getMockClassification(qTitle, score);
            const completedAt = new Date();
            completedAt.setDate(completedAt.getDate() - dayAgo - randomInt(0, 2));

            await prisma.quizResult.create({
              data: {
                userId: student.id,
                quizId: targetQuiz.id,
                overallScore: score,
                classification,
                completedAt,
              },
            });
          }
        }
      }
      console.log(`   📊 Created staggered mock quiz results for newly created student: ${student.firstName}`);
    } else {
      console.log(`ℹ️ Student ${student.firstName} ${student.lastName} already exists. Skipping results generation to preserve data.`);
    }
  }

  // 5. Create 1 admin account conditionally
  const adminEmails = ['admin@wellmindly.com'];
  for (const adminEmail of adminEmails) {
    let admin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    if (!admin) {
      const adminPasswordHash = await bcrypt.hash('AdminPass123!', SALT_ROUNDS);
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: adminPasswordHash,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'ADMIN',
        },
      });
      console.log(`✅ Admin: ${admin.firstName} ${admin.lastName} (${adminEmail})`);
    } else {
      console.log(`ℹ️ Admin ${adminEmail} already exists. Skipping.`);
    }
  }

  // 5.5 Create 1 university staff account conditionally
  let universityUser = await prisma.user.findUnique({
    where: { email: 'university@wellmindly.com' }
  });
  if (!universityUser) {
    const uniPasswordHash = await bcrypt.hash('AdminPass123!', SALT_ROUNDS);
    universityUser = await prisma.user.create({
      data: {
        email: 'university@wellmindly.com',
        passwordHash: uniPasswordHash,
        firstName: 'University',
        lastName: 'Admin',
        role: 'UNIVERSITY',
        universityId: university.id,
      },
    });
    console.log(`✅ University Admin: ${universityUser.firstName} ${universityUser.lastName} (id: ${universityUser.id})`);
  } else {
    console.log(`ℹ️ University Admin ${universityUser.firstName} already exists. Skipping.`);
  }

  let universityUserCom = await prisma.user.findUnique({
    where: { email: 'university@wellmindly.com' }
  });
  if (!universityUserCom) {
    const uniPasswordHash = await bcrypt.hash('AdminPass123!', SALT_ROUNDS);
    universityUserCom = await prisma.user.create({
      data: {
        email: 'university@wellmindly.com',
        passwordHash: uniPasswordHash,
        firstName: 'University',
        lastName: 'Admin',
        role: 'UNIVERSITY',
        universityId: universityCom.id,
      },
    });
    console.log(`✅ University Admin (Com): ${universityUserCom.firstName} ${universityUserCom.lastName} (id: ${universityUserCom.id})`);
  } else {
    console.log(`ℹ️ University Admin (Com) ${universityUserCom.firstName} already exists. Skipping.`);
  }

  // 6. Seed TalkRooms conditionally
  const defaultRooms = [
    { name: "Academic Pressure", description: "Exam stress, grades, workload, and finding your rhythm." },
    { name: "Social & Loneliness", description: "Making friends, feeling isolated, and fitting in." },
    { name: "Stress & Overwhelm", description: "When everything piles up and it feels hard to catch your breath." },
    { name: "General Reflection", description: "Quiet thoughts, late-night ponderings, and whatever is on your mind." }
  ];

  // 7. Seed Test Counselors
  console.log('🌱 Seeding Test Counselors...');
  const testCounselors = [
    {
      firstName: 'Jai',
      lastName: 'Malani',
      email: 'jmalani44@gmail.com',
      credentials: 'M.Sc. Clinical Psychology, Licensed Counselor',
      specializations: ['Anxiety', 'Student Wellbeing', 'CBT', 'Stress Management'],
      bio: 'Licensed counselor dedicated to student mental health, stress reduction, and emotional wellbeing.',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    },
  ];

  for (const cData of testCounselors) {
    let user = await prisma.user.findUnique({ where: { email: cData.email } });
    const passwordHash = await bcrypt.hash('CounselorPass123!', SALT_ROUNDS);

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cData.email,
          passwordHash,
          firstName: cData.firstName,
          lastName: cData.lastName,
          role: 'COUNSELOR',
          timezone: 'UTC',
        },
      });

      const profile = await prisma.counselorProfile.create({
        data: {
          userId: user.id,
          credentials: cData.credentials,
          specializations: cData.specializations,
          bio: cData.bio,
          avatarUrl: cData.avatarUrl,
          status: 'ACTIVE',
        },
      });

      // Add weekly recurring availability (Mon-Fri 09:00 - 17:00)
      for (let day = 1; day <= 5; day++) {
        await prisma.counselorAvailability.create({
          data: {
            counselorId: profile.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
            slotDurationMins: 45,
            isAvailable: true,
          },
        });
      }

      console.log(`✅ Created Counselor: ${user.firstName} ${user.lastName} (${cData.email})`);
    } else {
      console.log(`ℹ️ Counselor ${cData.email} already exists. Skipping.`);
    }
  }

  console.log('\n🎉 Seeding complete!');
}

main()
  .then(async () => {
    await pool.end();
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    await prisma.$disconnect();
    process.exit(1);
  });
