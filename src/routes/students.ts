import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';

const router = Router();

/**
 * GET /api/students/me/results
 *
 * Protected by authentication token checks.
 * Extracts current user credentials from req.user,
 * performs database operations to fetch historic quiz result records via Prisma,
 * and structures response payloads to easily feed client graphing engines.
 */
router.get(
  '/me/results',
  authenticateJWT,
  authorizeRoles('STUDENT', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ error: 'User ID missing from token' });
        return;
      }

      // Fetch all historic quiz result records for the authenticated user
      const results = await prisma.quizResult.findMany({
        where: { userId },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              category: true,
              maxScore: true,
            },
          },
        },
        orderBy: { completedAt: 'asc' },
      });

      // --- Structure response payloads for client graphing engines ---

      // 1. Timeline series: ordered data points for line/area charts
      const timeline = results.map((r) => ({
        id: r.id,
        date: r.completedAt.toISOString(),
        score: r.overallScore,
        maxScore: r.quiz.maxScore,
        percentage: r.quiz.maxScore > 0
          ? Math.round((r.overallScore / r.quiz.maxScore) * 100)
          : 0,
        classification: r.classification,
        quizTitle: r.quiz.title,
        quizCategory: r.quiz.category,
      }));

      // 2. Classification distribution: counts per severity bucket for pie/donut charts
      const classificationCounts: Record<string, number> = {};
      for (const r of results) {
        classificationCounts[r.classification] = (classificationCounts[r.classification] || 0) + 1;
      }
      const distribution = Object.entries(classificationCounts).map(([label, count]) => ({
        label,
        count,
      }));

      // 3. Summary statistics for KPI cards
      const totalAttempts = results.length;
      const latestResult = results.length > 0 ? results[results.length - 1] : null;
      const averageScore = totalAttempts > 0
        ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / totalAttempts)
        : 0;

      // 4. Per-quiz breakdown: grouped scores for bar/radar charts
      const quizMap: Record<string, { title: string; category: string; maxScore: number; scores: number[]; dates: string[] }> = {};
      for (const r of results) {
        if (!quizMap[r.quizId]) {
          quizMap[r.quizId] = {
            title: r.quiz.title,
            category: r.quiz.category,
            maxScore: r.quiz.maxScore,
            scores: [],
            dates: [],
          };
        }
        quizMap[r.quizId].scores.push(r.overallScore);
        quizMap[r.quizId].dates.push(r.completedAt.toISOString());
      }
      const quizBreakdown = Object.entries(quizMap).map(([quizId, data]) => ({
        quizId,
        title: data.title,
        category: data.category,
        maxScore: data.maxScore,
        attempts: data.scores.length,
        averageScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
        scores: data.scores,
        dates: data.dates,
      }));

      res.status(200).json({
        userId,
        totalAttempts,
        averageScore,
        latestResult: latestResult
          ? {
              score: latestResult.overallScore,
              classification: latestResult.classification,
              date: latestResult.completedAt.toISOString(),
              quizTitle: latestResult.quiz.title,
            }
          : null,
        timeline,
        distribution,
        quizBreakdown,
      });
    } catch (error) {
      console.error('Error fetching student results:', error);
      res.status(500).json({ error: 'Failed to fetch student results' });
    }
  }
);

export default router;
