"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(5000),
    DATABASE_URL: zod_1.z.string().url('DATABASE_URL must be a valid URL'),
    JWT_SECRET: zod_1.z.string().min(1, 'JWT_SECRET is required'),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional().default('942167444638-jcpvjkm9j14lqj29lvn3gbcnju4nf5pt.apps.googleusercontent.com'),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional().default('dummy_secret'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().optional().default('info@wellmindly.com'),
    RESEND_API_KEY: zod_1.z.string().optional(),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    GEMINI_MODEL: zod_1.z.string().optional().default('gemini-3.5-flash'),
    ALLOWED_ORIGINS: zod_1.z.string().optional().default('http://localhost:5173,http://localhost:5174,http://localhost:5175,https://wellmindly.com,https://admin.wellmindly.com,https://counselor.wellmindly.com,https://university.wellmindly.com,https://www.wellmindly.com,http://localhost,capacitor://localhost'),
    CHAT_SESSION_MAX_REQUESTS: zod_1.z.coerce.number().default(100),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Invalid environment variables:\n', _env.error.format());
    process.exit(1);
}
exports.env = _env.data;
