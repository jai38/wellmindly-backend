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
 * GET /api/quizzes/:id/questions
 *
 * Fetches all questions for a specific quiz ID.
 * Serves a clean JSON schema listing structural metadata fields,
 * question strings, indexing numbers, and lookup parameters (options)
 * for rendering on client views.
 */
router.get('/:id/questions', async (req, res) => {
    const id = req.params.id;
    try {
        // Verify the quiz exists
        const quiz = await prisma_1.default.quiz.findUnique({
            where: { id },
        });
        if (!quiz) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }
        // Fetch the questions and joined options, ordered by index
        const questions = await prisma_1.default.question.findMany({
            where: { quizId: id },
            include: {
                options: {
                    select: {
                        id: true,
                        label: true,
                        points: true,
                    },
                    orderBy: { points: 'asc' }, // Order options logically by point value
                },
            },
            orderBy: {
                index: 'asc',
            },
        });
        // Format the response into a clean schema structure for client views
        const schema = {
            quizId: quiz.id,
            title: quiz.title,
            category: quiz.category,
            totalQuestions: questions.length,
            questions: questions.map((q) => ({
                id: q.id,
                index: q.index,
                type: q.type,
                text: q.text,
                options: q.options,
            })),
        };
        res.status(200).json(schema);
    }
    catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: 'Failed to fetch quiz questions' });
    }
});
/**
 * POST /api/quizzes/submit
 *
 * Ingests a payload array container tracking question scores.
 * Protected by user role middleware validation guards.
 * Server-side controller parses cumulative parameters,
 * assigns score threshold strings (e.g., PHQ-9 aggregate > 15 triggers 'Severe Depression' alert flag tags),
 * stores values to the QuizResult database table using Prisma,
 * and responds with the processed database object.
 */
router.post('/submit', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('STUDENT', 'ADMIN'), async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing from token' });
            return;
        }
        // Check if the body itself is an array or contains answers/scores
        let scoresArray = [];
        let quizId = req.body.quizId || req.query.quizId;
        if (Array.isArray(req.body)) {
            scoresArray = req.body;
        }
        else if (req.body && Array.isArray(req.body.answers)) {
            scoresArray = req.body.answers;
        }
        else if (req.body && Array.isArray(req.body.scores)) {
            scoresArray = req.body.scores;
        }
        else if (req.body && typeof req.body.answers === 'object') {
            // Record<string, number> format
            scoresArray = Object.entries(req.body.answers).map(([key, value]) => ({
                questionId: key,
                score: Number(value),
            }));
        }
        if (!scoresArray || scoresArray.length === 0) {
            res.status(400).json({ error: 'Payload must contain a non-empty array of question scores or answers mapping' });
            return;
        }
        // Extract quizId from array items if not found
        if (!quizId && Array.isArray(req.body) && req.body.length > 0) {
            quizId = req.body[0]?.quizId;
        }
        // Fallback: fetch the first Quiz from the database if not provided
        if (!quizId) {
            const defaultQuiz = await prisma_1.default.quiz.findFirst({
                orderBy: { createdAt: 'asc' },
            });
            if (defaultQuiz) {
                quizId = defaultQuiz.id;
            }
            else {
                res.status(404).json({ error: 'No quiz found to associate this submission with' });
                return;
            }
        }
        // Verify the quiz exists
        const quiz = await prisma_1.default.quiz.findUnique({
            where: { id: quizId },
        });
        if (!quiz) {
            res.status(404).json({ error: `Quiz with ID [${quizId}] not found` });
            return;
        }
        // Parse cumulative parameters (sum the score/points)
        let overallScore = 0;
        for (const item of scoresArray) {
            if (typeof item === 'number') {
                overallScore += item;
            }
            else if (item && typeof item === 'object') {
                const scoreVal = item.score !== undefined ? item.score : (item.points !== undefined ? item.points : item.value);
                if (typeof scoreVal === 'number') {
                    overallScore += scoreVal;
                }
                else if (typeof scoreVal === 'string') {
                    const parsed = parseInt(scoreVal, 10);
                    if (!isNaN(parsed)) {
                        overallScore += parsed;
                    }
                }
            }
        }
        // Assign score threshold strings based on PHQ-9 aggregate rules
        let classification = 'Minimal Depression';
        const isPhq9 = quiz.title.toLowerCase().includes('phq-9') || quiz.category.toLowerCase().includes('clinical');
        if (isPhq9) {
            if (quiz.maxScore === 15) {
                // 5-question variant (Max score: 15)
                if (overallScore >= 13) {
                    classification = 'Severe Depression';
                }
                else if (overallScore >= 9) {
                    classification = 'Moderate Stress';
                }
                else if (overallScore >= 5) {
                    classification = 'Mild Stress';
                }
                else {
                    classification = 'Minimal Stress';
                }
            }
            else {
                // Standard 9-question PHQ-9 or other clinical quiz
                if (overallScore > 15) {
                    classification = 'Severe Depression';
                }
                else if (overallScore >= 10) {
                    classification = 'Moderate Depression';
                }
                else if (overallScore >= 5) {
                    classification = 'Mild Depression';
                }
                else {
                    classification = 'Minimal Depression';
                }
            }
        }
        else {
            // Generic fallback based on percentage of maxScore
            const pct = quiz.maxScore > 0 ? (overallScore / quiz.maxScore) * 100 : 0;
            if (pct >= 80)
                classification = 'Severe Stress';
            else if (pct >= 50)
                classification = 'Moderate Stress';
            else if (pct >= 20)
                classification = 'Mild Stress';
            else
                classification = 'Minimal Stress';
        }
        // Explicit override as requested: e.g. aggregate > 15 triggers 'Severe Depression' alert flag tags
        if (overallScore > 15) {
            classification = 'Severe Depression';
        }
        // Store values to the QuizResult database table using Prisma
        const quizResult = await prisma_1.default.quizResult.create({
            data: {
                userId,
                quizId,
                overallScore,
                classification,
            },
            include: {
                quiz: {
                    select: {
                        title: true,
                        category: true,
                    },
                },
            },
        });
        // Respond with the processed database object
        res.status(201).json(quizResult);
    }
    catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ error: 'Failed to process quiz submission' });
    }
});
exports.default = router;
