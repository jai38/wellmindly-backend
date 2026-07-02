"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
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
});
