"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const jwt_1 = require("../utils/jwt");
const router = (0, express_1.Router)();
const generalContactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    email: zod_1.z.string().email('Invalid email address'),
    subject: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1, 'Message is required'),
});
const universityContactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    email: zod_1.z.string().email('Invalid email address'),
    universityName: zod_1.z.string().min(1, 'University name is required'),
    role: zod_1.z.string().min(1, 'Role is required'),
    phone: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1, 'Message is required'),
});
const counselorContactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    email: zod_1.z.string().email('Invalid email address'),
    phone: zod_1.z.string().optional(),
    credentials: zod_1.z.string().min(1, 'Credentials are required'),
    experience: zod_1.z.string().min(1, 'Experience detail is required'),
    message: zod_1.z.string().min(1, 'Message is required'),
});
// --- Public Endpoints ---
router.post('/general', async (req, res) => {
    try {
        const data = generalContactSchema.parse(req.body);
        const request = await prisma_1.default.contactRequest.create({ data });
        res.status(201).json({ success: true, message: 'Message sent successfully', data: request });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Error creating general contact:', error);
        res.status(500).json({ error: 'Failed to submit contact request' });
    }
});
router.post('/university', async (req, res) => {
    try {
        const data = universityContactSchema.parse(req.body);
        const request = await prisma_1.default.universityOnboarding.create({ data });
        res.status(201).json({ success: true, message: 'University onboarding request sent successfully', data: request });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Error creating university contact:', error);
        res.status(500).json({ error: 'Failed to submit university onboarding request' });
    }
});
router.post('/counselor', async (req, res) => {
    try {
        const data = counselorContactSchema.parse(req.body);
        const request = await prisma_1.default.counselorOnboarding.create({ data });
        res.status(201).json({ success: true, message: 'Counselor application submitted successfully', data: request });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Error creating counselor contact:', error);
        res.status(500).json({ error: 'Failed to submit counselor onboarding request' });
    }
});
// --- Admin Endpoints (Auth required + ADMIN role) ---
router.get('/general', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [contacts, total] = await Promise.all([
            prisma_1.default.contactRequest.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.default.contactRequest.count(),
        ]);
        res.status(200).json({ contacts, total, page, limit });
    }
    catch (error) {
        console.error('Error fetching general contacts:', error);
        res.status(500).json({ error: 'Failed to fetch general contacts' });
    }
});
router.get('/university', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [requests, total] = await Promise.all([
            prisma_1.default.universityOnboarding.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.default.universityOnboarding.count(),
        ]);
        res.status(200).json({ requests, total, page, limit });
    }
    catch (error) {
        console.error('Error fetching university contacts:', error);
        res.status(500).json({ error: 'Failed to fetch university requests' });
    }
});
router.get('/counselor', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [requests, total] = await Promise.all([
            prisma_1.default.counselorOnboarding.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.default.counselorOnboarding.count(),
        ]);
        res.status(200).json({ requests, total, page, limit });
    }
    catch (error) {
        console.error('Error fetching counselor contacts:', error);
        res.status(500).json({ error: 'Failed to fetch counselor applications' });
    }
});
router.delete('/general/:id', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.contactRequest.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Contact request deleted' });
    }
    catch (error) {
        console.error('Error deleting contact request:', error);
        res.status(500).json({ error: 'Failed to delete contact request' });
    }
});
router.delete('/university/:id', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.universityOnboarding.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'University request deleted' });
    }
    catch (error) {
        console.error('Error deleting university request:', error);
        res.status(500).json({ error: 'Failed to delete university onboarding request' });
    }
});
router.delete('/counselor/:id', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.counselorOnboarding.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Counselor request deleted' });
    }
    catch (error) {
        console.error('Error deleting counselor request:', error);
        res.status(500).json({ error: 'Failed to delete counselor onboarding request' });
    }
});
exports.default = router;
