"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../src/generated/prisma/client");
require("dotenv/config");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
const SALT_ROUNDS = 10;
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function phq9Classification(score) {
    if (score <= 4)
        return 'Minimal';
    if (score <= 9)
        return 'Mild';
    if (score <= 14)
        return 'Moderate';
    if (score <= 19)
        return 'Moderately Severe';
    return 'Severe';
}
async function main() {
    console.log('🌱 Starting seed...');
    // 1. Create the PHQ-9 Quiz if it doesn't exist
    let phq9 = await prisma.quiz.findFirst({ where: { title: 'PHQ-9' } });
    if (!phq9) {
        phq9 = await prisma.quiz.create({
            data: {
                title: 'PHQ-9',
                description: 'Patient Health Questionnaire-9 is a multipurpose instrument for screening, diagnosing, monitoring and measuring the severity of depression.',
                category: 'Depression',
                totalQuestions: 9,
                maxScore: 27,
            },
        });
    }
    console.log(`✅ Quiz: ${phq9.title} (id: ${phq9.id})`);
    // 2. Create 1 mock university
    const university = await prisma.university.upsert({
        where: { domain: 'wellmindly.edu' },
        update: {},
        create: {
            name: 'Wellmindly University',
            domain: 'wellmindly.edu',
            verified: true,
        },
    });
    console.log(`✅ University: ${university.name} (id: ${university.id})`);
    // 3. Create 5 mock student accounts
    const students = [
        { firstName: 'Alice', lastName: 'Johnson', email: 'alice@wellmindly.edu' },
        { firstName: 'Bob', lastName: 'Smith', email: 'bob@wellmindly.edu' },
        { firstName: 'Carol', lastName: 'Williams', email: 'carol@wellmindly.edu' },
        { firstName: 'David', lastName: 'Brown', email: 'david@wellmindly.edu' },
        { firstName: 'Eva', lastName: 'Davis', email: 'eva@wellmindly.edu' },
    ];
    for (const s of students) {
        const passwordHash = await bcrypt_1.default.hash('Password123!', SALT_ROUNDS);
        const student = await prisma.user.upsert({
            where: { email: s.email },
            update: {},
            create: {
                email: s.email,
                passwordHash,
                firstName: s.firstName,
                lastName: s.lastName,
                role: 'STUDENT',
                universityId: university.id,
            },
        });
        console.log(`✅ Student: ${student.firstName} ${student.lastName} (id: ${student.id})`);
        // 4. Generate 3 random quiz result histories per student
        const resultCount = 3;
        for (let i = 0; i < resultCount; i++) {
            const score = randomInt(0, 27);
            await prisma.quizResult.create({
                data: {
                    userId: student.id,
                    quizId: phq9.id,
                    overallScore: score,
                    classification: phq9Classification(score),
                },
            });
        }
        console.log(`   📊 Created ${resultCount} quiz results for ${student.firstName}`);
    }
    // 5. Create 1 admin account
    const adminPasswordHash = await bcrypt_1.default.hash('AdminPass123!', SALT_ROUNDS);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@wellmindly.edu' },
        update: {},
        create: {
            email: 'admin@wellmindly.edu',
            passwordHash: adminPasswordHash,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'ADMIN',
        },
    });
    console.log(`✅ Admin: ${admin.firstName} ${admin.lastName} (id: ${admin.id})`);
    console.log('\n🎉 Seeding complete!');
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
