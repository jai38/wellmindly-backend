"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
// Mock the mailer sendEmail utility to avoid actual email operations
vitest_1.vi.mock('../utils/mailer', () => ({
    sendEmail: vitest_1.vi.fn().mockResolvedValue(true),
    getOtpTemplate: vitest_1.vi.fn().mockReturnValue('<html>MOCK OTP</html>'),
}));
vitest_1.vi.mock('../lib/prisma', () => ({
    default: {
        user: {
            findUnique: vitest_1.vi.fn().mockResolvedValue(null),
        },
    },
}));
(0, vitest_1.describe)('Auth API Routes', () => {
    (0, vitest_1.describe)('POST /api/auth/send-otp', () => {
        (0, vitest_1.it)('should fail if email is not provided', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/send-otp')
                .send({});
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBe('Email is required');
        });
        (0, vitest_1.it)('should successfully request an OTP', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/send-otp')
                .send({ email: 'test-student@wellmindly.com' });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.message).toBe('Verification code sent to your email.');
        });
    });
    (0, vitest_1.describe)('POST /api/auth/register', () => {
        (0, vitest_1.it)('should fail registration with missing fields', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send({ email: 'test-student@wellmindly.com' });
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBeDefined();
        });
    });
    (0, vitest_1.describe)('POST /api/auth/login', () => {
        (0, vitest_1.it)('should fail login with empty credentials', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({});
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBeDefined();
        });
    });
});
