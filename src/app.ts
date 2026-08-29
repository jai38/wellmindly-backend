import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import authRouter from './routes/auth';
import quizzesRouter from './routes/quizzes';
import studentsRouter from './routes/students';
import adminRouter from './routes/admin';
import universityRouter from './routes/university';
import chatRouter from './routes/chat';
import contactsRouter from './routes/contacts';
import talkRouter from './routes/talk';
import v1AdminRouter from './routes/v1/admin';
import v1CounselorsRouter from './routes/v1/counselors';
import v1StudentsRouter from './routes/v1/students';
import { startReminderScheduler } from './utils/reminderService';

const app = express();

// Secure security headers
app.use(helmet());

// Configure secure CORS policy checks
const allowedOrigins = env.ALLOWED_ORIGINS.split(',');
const mobileOrigins = ['http://localhost', 'capacitor://localhost'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isWellmindly = /^https:\/\/(.*\.)?wellmindly\.com$/i.test(origin);
      if (
        isWellmindly ||
        allowedOrigins.indexOf(origin) !== -1 ||
        mobileOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes('*')
      ) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

const strictAuthLimiter = rateLimit({
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

// Legacy routes
app.use('/api/auth', authRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/university', universityRouter);
app.use('/api/chat', chatRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/talk', talkRouter);

// API v1 Production Endpoints
app.use('/api/v1/admin', v1AdminRouter);
app.use('/api/v1/counselors', v1CounselorsRouter);
app.use('/api/v1/students', v1StudentsRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// Start background automated session reminder scheduler
if (env.ENABLE_REMINDER_SCHEDULER) {
  startReminderScheduler();
} else {
  console.log('Reminder scheduler disabled (ENABLE_REMINDER_SCHEDULER=false)');
}

app.listen(process.env.PORT || env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

export default app;
