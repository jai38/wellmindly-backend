"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const google_auth_library_1 = require("google-auth-library");
const prisma_1 = __importDefault(require("../lib/prisma"));
const jwt_1 = require("../lib/jwt");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
const googleClient = new google_auth_library_1.OAuth2Client(env_1.env.GOOGLE_CLIENT_ID);
/**
 * POST /api/auth/google/callback
 *
 * Accepts a Google ID token from the frontend (sent after Google Sign-In),
 * validates it, checks university domain membership, and issues a JWT.
 *
 * Body: { idToken: string }
 */
router.post('/google/callback', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        res.status(400).json({ error: 'idToken is required' });
        return;
    }
    // 1. Verify the Google ID token
    let ticket;
    try {
        ticket = await googleClient.verifyIdToken({
            idToken,
            audience: env_1.env.GOOGLE_CLIENT_ID,
        });
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired Google token' });
        return;
    }
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        res.status(401).json({ error: 'Google token payload is missing email' });
        return;
    }
    const { sub: googleId, email, given_name: firstName = '', family_name: lastName = '' } = payload;
    // 2. Extract the domain from the email and look up a verified university
    const domain = email.split('@')[1];
    const university = await prisma_1.default.university.findUnique({
        where: { domain },
    });
    // 3. Upsert the user — create on first login, find on subsequent logins
    const user = await prisma_1.default.user.upsert({
        where: { email },
        update: {
            googleId,
            // Keep universityId in sync in case the university was verified after first login
            ...(university ? { universityId: university.id } : {}),
        },
        create: {
            email,
            googleId,
            firstName,
            lastName,
            role: 'STUDENT',
            universityId: university?.id ?? null,
        },
    });
    // 4. Issue a structured JWT
    const token = (0, jwt_1.signToken)({
        sub: user.id,
        email: user.email,
        role: user.role,
        universityId: user.universityId,
    });
    res.status(200).json({
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            universityId: user.universityId,
            universityDomain: university?.domain ?? null,
            universityVerified: university?.verified ?? false,
        },
    });
});
/**
 * POST /api/auth/login
 *
 * Traditional email/password login for Admins and University Staff.
 */
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    const user = await prisma_1.default.user.findUnique({
        where: { email },
        include: { university: true },
    });
    if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    // Validate password
    const bcrypt = require('bcrypt'); // require dynamically or add to top
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    // Optional: Ensure the requested role matches their profile
    if (role && user.role !== role) {
        res.status(403).json({ error: 'Unauthorized role access' });
        return;
    }
    const token = (0, jwt_1.signToken)({
        sub: user.id,
        email: user.email,
        role: user.role,
        universityId: user.universityId,
    });
    res.status(200).json({
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            universityId: user.universityId,
            universityDomain: user.university?.domain ?? null,
            universityVerified: user.university?.verified ?? false,
        },
    });
});
exports.default = router;
