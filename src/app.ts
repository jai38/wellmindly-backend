import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import authRouter from './routes/auth';
import quizzesRouter from './routes/quizzes';
import studentsRouter from './routes/students';
import adminRouter from './routes/admin';
import universityRouter from './routes/university';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/university', universityRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});
