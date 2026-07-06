"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
(0, vitest_1.describe)('TalkMindly API Routes', () => {
    (0, vitest_1.describe)('GET /api/talk/rooms', () => {
        (0, vitest_1.it)('should block unauthorized room lists retrieval', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/talk/rooms');
            (0, vitest_1.expect)(res.status).toBe(401); // Requires JWT authentication header
        });
    });
    (0, vitest_1.describe)('POST /api/talk/rooms', () => {
        (0, vitest_1.it)('should block unauthorized room creations', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/talk/rooms')
                .send({ name: 'Exam Stress Room', description: 'Discuss exams' });
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    (0, vitest_1.describe)('POST /api/talk/rooms/:roomId/notes', () => {
        (0, vitest_1.it)('should block unauthorized note dropping', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/talk/rooms/some-room-uuid/notes')
                .send({ content: 'Feeling anxious about tests', nickname: 'Calm Fox', avatar: 'fox' });
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    (0, vitest_1.describe)('POST /api/talk/notes/:noteId/replies', () => {
        (0, vitest_1.it)('should block unauthorized replies posting', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/talk/notes/some-note-uuid/replies')
                .send({ content: 'I feel that too', nickname: 'Soft Panda', avatar: 'panda' });
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    (0, vitest_1.describe)('POST /api/talk/notes/:noteId/react', () => {
        (0, vitest_1.it)('should block unauthorized reactions toggling', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/talk/notes/some-note-uuid/react')
                .send({ type: 'METOO' });
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    (0, vitest_1.describe)('DELETE /api/talk/notes/:noteId', () => {
        (0, vitest_1.it)('should block unauthorized note deletions', async () => {
            const res = await (0, supertest_1.default)(app_1.default).delete('/api/talk/notes/some-note-uuid');
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
});
