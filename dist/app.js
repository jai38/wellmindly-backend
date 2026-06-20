"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const auth_1 = __importDefault(require("./routes/auth"));
const quizzes_1 = __importDefault(require("./routes/quizzes"));
const students_1 = __importDefault(require("./routes/students"));
const admin_1 = __importDefault(require("./routes/admin"));
const university_1 = __importDefault(require("./routes/university"));
const chat_1 = __importDefault(require("./routes/chat"));
const app = (0, express_1.default)();
// Secure security headers
app.use((0, helmet_1.default)());
// Configure secure CORS policy checks
const allowedOrigins = env_1.env.ALLOWED_ORIGINS.split(',');
const mobileOrigins = ['http://localhost', 'capacitor://localhost'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 ||
            mobileOrigins.indexOf(origin) !== -1 ||
            allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
// API rate limiting
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});
const strictAuthLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again after a minute' },
});
// Mount limiters to endpoints
app.use('/api', generalLimiter);
app.use('/api/auth/register', strictAuthLimiter);
app.use('/api/auth/login', strictAuthLimiter);
app.use('/api/auth/forgot-password', strictAuthLimiter);
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/quizzes', quizzes_1.default);
app.use('/api/students', students_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/university', university_1.default);
app.use('/api/chat', chat_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is healthy' });
});
app.listen(env_1.env.PORT, () => {
    console.log(`Server is running on port ${env_1.env.PORT}`);
});
