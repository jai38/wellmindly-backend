"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const jwt_1 = require("../utils/jwt");
const router = (0, express_1.Router)();
/**
 * GET /api/university/metrics
 *
 * Protected by specialized university authentication roles.
 * Fetches the host user's University identity profile constraints,
 * joins related student identity parameters anonymously,
 * compiles cluster scoring averages,
 * and restricts row reads to avoid data exposure.
 */
router.get('/metrics', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('UNIVERSITY', 'ADMIN'), async (req, res) => {
    try {
        const userId = req.user?.sub;
        const universityId = req.user?.universityId;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing from token' });
            return;
        }
        if (!universityId) {
            res.status(403).json({ error: 'No university affiliation found on this account' });
            return;
        }
        // Verify the university exists and fetch profile constraints
        const university = await prisma_1.default.university.findUnique({
            where: { id: universityId },
            select: { id: true, name: true, domain: true, verified: true },
        });
        if (!university) {
            res.status(404).json({ error: 'University profile not found' });
            return;
        }
        // Fetch all student users affiliated with this university (identity parameters)
        const affiliatedStudentIds = await prisma_1.default.user.findMany({
            where: {
                universityId,
                role: 'STUDENT',
            },
            select: { id: true },
        });
        const studentIds = affiliatedStudentIds.map((u) => u.id);
        const totalStudents = studentIds.length;
        if (totalStudents === 0) {
            res.status(200).json({
                university: {
                    id: university.id,
                    name: university.name,
                    domain: university.domain,
                },
                totalStudents: 0,
                totalSubmissions: 0,
                clusterAverage: 0,
                classificationDistribution: [],
                quizMetrics: [],
                submissionTrend: [],
            });
            return;
        }
        // Restrict row reads to only students affiliated with this university
        const results = await prisma_1.default.quizResult.findMany({
            where: { userId: { in: studentIds } },
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
        const totalSubmissions = results.length;
        // Compile cluster scoring averages (anonymous — no student identity exposed)
        const clusterAverage = totalSubmissions > 0
            ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / totalSubmissions)
            : 0;
        // Classification distribution across the university cluster
        const classificationCounts = {};
        for (const r of results) {
            classificationCounts[r.classification] = (classificationCounts[r.classification] || 0) + 1;
        }
        const classificationDistribution = Object.entries(classificationCounts).map(([label, count]) => ({
            label,
            count,
            percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
        }));
        // Per-quiz cluster metrics (anonymous aggregates only)
        const quizMap = {};
        for (const r of results) {
            if (!quizMap[r.quizId]) {
                quizMap[r.quizId] = {
                    title: r.quiz.title,
                    category: r.quiz.category,
                    maxScore: r.quiz.maxScore,
                    scores: [],
                };
            }
            quizMap[r.quizId].scores.push(r.overallScore);
        }
        const quizMetrics = Object.entries(quizMap).map(([quizId, data]) => ({
            quizId,
            title: data.title,
            category: data.category,
            maxScore: data.maxScore,
            totalSubmissions: data.scores.length,
            averageScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
            minScore: Math.min(...data.scores),
            maxObservedScore: Math.max(...data.scores),
        }));
        // Submission volume over time — daily counts for trend visualization
        const dailyVolume = {};
        for (const r of results) {
            const dayKey = r.completedAt.toISOString().slice(0, 10);
            dailyVolume[dayKey] = (dailyVolume[dayKey] || 0) + 1;
        }
        const submissionTrend = Object.entries(dailyVolume).map(([date, count]) => ({
            date,
            count,
        }));
        // Participation rate: how many affiliated students have submitted at least one quiz
        const participatingStudentIds = new Set(results.map((r) => r.userId));
        const participationRate = totalStudents > 0
            ? Math.round((participatingStudentIds.size / totalStudents) * 100)
            : 0;
        res.status(200).json({
            university: {
                id: university.id,
                name: university.name,
                domain: university.domain,
            },
            totalStudents,
            participatingStudents: participatingStudentIds.size,
            participationRate,
            totalSubmissions,
            clusterAverage,
            classificationDistribution,
            quizMetrics,
            submissionTrend,
        });
    }
    catch (error) {
        console.error('Error fetching university metrics:', error);
        res.status(500).json({ error: 'Failed to fetch university metrics' });
    }
});
exports.default = router;
