import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';

const router = Router();

/**
 * GET /api/admin/metrics
 *
 * Protected by administrative security middleware.
 * Returns structured response data summarizing all rows in the QuizResult collection
 * to output cross-sectional system metrics (total submissions grouped by active classifications).
 */
router.get(
  '/metrics',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (_req: Request, res: Response) => {
    try {
      // 1. Total submission count across the entire system
      const totalSubmissions = await prisma.quizResult.count();

      // 2. Group by classification — cross-sectional severity distribution
      const classificationGroups = await prisma.quizResult.groupBy({
        by: ['classification'],
        _count: { id: true },
        _avg: { overallScore: true },
        _max: { overallScore: true },
        _min: { overallScore: true },
      });

      const classificationMetrics = classificationGroups.map((g) => ({
        classification: g.classification,
        count: g._count.id,
        averageScore: g._avg.overallScore !== null ? Math.round(g._avg.overallScore) : 0,
        maxScore: g._max.overallScore ?? 0,
        minScore: g._min.overallScore ?? 0,
      }));

      // 3. Group by quiz — submissions per assessment type
      const quizGroups = await prisma.quizResult.groupBy({
        by: ['quizId'],
        _count: { id: true },
        _avg: { overallScore: true },
      });

      // Fetch quiz titles for display
      const quizIds = quizGroups.map((g) => g.quizId);
      const quizzes = await prisma.quiz.findMany({
        where: { id: { in: quizIds } },
        select: { id: true, title: true, category: true, maxScore: true },
      });
      const quizLookup: Record<string, { title: string; category: string; maxScore: number }> = {};
      for (const q of quizzes) {
        quizLookup[q.id] = { title: q.title, category: q.category, maxScore: q.maxScore };
      }

      const quizMetrics = quizGroups.map((g) => ({
        quizId: g.quizId,
        title: quizLookup[g.quizId]?.title ?? 'Unknown',
        category: quizLookup[g.quizId]?.category ?? 'Unknown',
        maxScore: quizLookup[g.quizId]?.maxScore ?? 0,
        totalSubmissions: g._count.id,
        averageScore: g._avg.overallScore !== null ? Math.round(g._avg.overallScore) : 0,
      }));

      // 4. Submission volume over time — daily counts for trend charts
      const allResults = await prisma.quizResult.findMany({
        select: { completedAt: true },
        orderBy: { completedAt: 'asc' },
      });

      const dailyVolume: Record<string, number> = {};
      for (const r of allResults) {
        const dayKey = r.completedAt.toISOString().slice(0, 10); // YYYY-MM-DD
        dailyVolume[dayKey] = (dailyVolume[dayKey] || 0) + 1;
      }
      const submissionTrend = Object.entries(dailyVolume).map(([date, count]) => ({
        date,
        count,
      }));

      // 5. Total unique users who have submitted at least one quiz
      const uniqueUsers = await prisma.quizResult.groupBy({
        by: ['userId'],
      });

      res.status(200).json({
        totalSubmissions,
        totalUniqueUsers: uniqueUsers.length,
        classificationMetrics,
        quizMetrics,
        submissionTrend,
      });
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      res.status(500).json({ error: 'Failed to fetch admin metrics' });
    }
  }
);

export default router;
