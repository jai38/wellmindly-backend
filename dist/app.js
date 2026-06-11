"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const auth_1 = __importDefault(require("./routes/auth"));
const quizzes_1 = __importDefault(require("./routes/quizzes"));
const students_1 = __importDefault(require("./routes/students"));
const admin_1 = __importDefault(require("./routes/admin"));
const university_1 = __importDefault(require("./routes/university"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/quizzes', quizzes_1.default);
app.use('/api/students', students_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/university', university_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is healthy' });
});
app.listen(env_1.env.PORT, () => {
    console.log(`Server is running on port ${env_1.env.PORT}`);
});
