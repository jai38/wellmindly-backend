"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const jwt_1 = require("../lib/jwt");
(0, vitest_1.describe)('Quizzes and Health API Routes', () => {
    (0, vitest_1.describe)('GET /health', () => {
        (0, vitest_1.it)('should return 200 and healthy status', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/health');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('ok');
        });
    });
    (0, vitest_1.describe)('GET /api/admin/quizzes', () => {
        (0, vitest_1.it)('should block unauthorized admin requests', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/admin/quizzes');
            (0, vitest_1.expect)(res.status).toBe(401); // Unauthorized without JWT
        });
    });
    (0, vitest_1.describe)('POST /api/quizzes/submit', () => {
        (0, vitest_1.it)('should block unauthorized quiz submissions', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/quizzes/submit')
                .send({ answers: {} });
            (0, vitest_1.expect)(res.status).toBe(401); // Requires JWT authentication header
        });
    });
    (0, vitest_1.describe)('POST /api/quizzes/submit (Authenticated Sanity Test)', () => {
        (0, vitest_1.it)('should successfully submit a quiz and return non-null AI feedback descriptive report', async () => {
            const student = await prisma_1.default.user.findFirst({
                where: { role: 'STUDENT' }
            });
            (0, vitest_1.expect)(student).not.toBeNull();
            if (!student)
                return;
            const token = (0, jwt_1.signToken)({
                sub: student.id,
                email: student.email,
                role: student.role,
                universityId: student.universityId,
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/quizzes/submit')
                .set('Authorization', `Bearer ${token}`)
                .send({
                quizTitle: 'PHQ-9',
                quizCategory: 'Clinical',
                overallScore: 8,
                maxScore: 27,
                answers: { 1: 3, 2: 2, 3: 3 }
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.aiFeedback).not.toBeNull();
            (0, vitest_1.expect)(res.body.aiFeedback.headline).toBeDefined();
            (0, vitest_1.expect)(res.body.aiFeedback.narrative).toBeDefined();
            (0, vitest_1.expect)(res.body.aiFeedback.tip).toBeDefined();
            (0, vitest_1.expect)(res.body.aiFeedback.insights).toBeInstanceOf(Array);
            (0, vitest_1.expect)(res.body.aiFeedback.insights.length).toBeGreaterThan(0);
        }, 15000);
    });
});
