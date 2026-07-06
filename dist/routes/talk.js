"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwt_1 = require("../utils/jwt");
const ai_1 = require("../utils/ai");
const prisma_1 = __importDefault(require("../lib/prisma"));
const enums_1 = require("../generated/prisma/enums");
const router = (0, express_1.Router)();
async function runModerationAgent(id, content, type) {
    try {
        const { isSafe, isCrisis, reason, inputTokens, outputTokens } = await (0, ai_1.evaluateContentSafety)(content);
        if (!isSafe) {
            if (type === 'note') {
                await prisma_1.default.talkNote.update({
                    where: { id },
                    data: {
                        status: isCrisis ? enums_1.TalkStatus.FLAGGED : enums_1.TalkStatus.REJECTED,
                        moderationReason: reason || 'Violates community standards',
                        isReported: isCrisis,
                        inputTokens: { increment: inputTokens },
                        outputTokens: { increment: outputTokens },
                    }
                });
            }
            else {
                const reply = await prisma_1.default.talkReply.update({
                    where: { id },
                    data: {
                        status: isCrisis ? enums_1.TalkStatus.FLAGGED : enums_1.TalkStatus.REJECTED,
                        moderationReason: reason || 'Violates community standards',
                        inputTokens: { increment: inputTokens },
                        outputTokens: { increment: outputTokens },
                    }
                });
                if (isCrisis) {
                    await prisma_1.default.talkNote.update({
                        where: { id: reply.noteId },
                        data: { isReported: true },
                    });
                }
            }
        }
    }
    catch (err) {
        console.error(`Error running async moderation agent for ${type} ${id}:`, err);
    }
}
// ==========================================
// 1. TalkRooms Management
// ==========================================
// GET /rooms - Fetch all active rooms
router.get('/rooms', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const rooms = await prisma_1.default.talkRoom.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
        res.status(200).json(rooms);
    }
    catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});
// GET /profile - Fetch current user's TalkMindly profile state
router.get('/profile', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                talkNickname: true,
                talkAvatar: true,
                talkBio: true,
                talkTermsAccepted: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(200).json(user);
    }
    catch (err) {
        console.error('Error fetching Talk profile:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// POST /profile - Set up or update TalkMindly profile
router.post('/profile', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { nickname, avatar, bio, acceptTerms } = req.body;
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if (nickname && nickname !== user.talkNickname) {
            const existing = await prisma_1.default.user.findUnique({
                where: { talkNickname: nickname },
            });
            if (existing) {
                res.status(400).json({ error: 'This nickname is already taken by another peer' });
                return;
            }
        }
        const updateData = {};
        if (acceptTerms !== undefined)
            updateData.talkTermsAccepted = acceptTerms;
        if (bio !== undefined)
            updateData.talkBio = bio;
        if (nickname) {
            if (user.talkNickname && req.user?.role !== 'ADMIN') {
                res.status(400).json({ error: 'Nickname can only be set once' });
                return;
            }
            updateData.talkNickname = nickname;
        }
        if (avatar) {
            if (user.talkAvatar && req.user?.role !== 'ADMIN') {
                res.status(400).json({ error: 'Avatar can only be set once' });
                return;
            }
            updateData.talkAvatar = avatar;
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                talkNickname: true,
                talkAvatar: true,
                talkBio: true,
                talkTermsAccepted: true,
            },
        });
        res.status(200).json(updatedUser);
    }
    catch (err) {
        console.error('Error updating Talk profile:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// POST /rooms (Admin Only) - Create a room
router.post('/rooms', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Room name is required' });
            return;
        }
        const existing = await prisma_1.default.talkRoom.findUnique({ where: { name } });
        if (existing) {
            res.status(400).json({ error: 'Room with this name already exists' });
            return;
        }
        const room = await prisma_1.default.talkRoom.create({
            data: { name, description, isActive: true },
        });
        res.status(201).json(room);
    }
    catch (err) {
        console.error('Error creating room:', err);
        res.status(500).json({ error: 'Failed to create room' });
    }
});
// PUT /rooms/:roomId (Admin Only) - Toggle/update a room
router.put('/rooms/:roomId', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { name, description, isActive } = req.body;
        const room = await prisma_1.default.talkRoom.update({
            where: { id: req.params.roomId },
            data: { name, description, isActive },
        });
        res.status(200).json(room);
    }
    catch (err) {
        console.error('Error updating room:', err);
        res.status(500).json({ error: 'Failed to update room' });
    }
});
// DELETE /rooms/:roomId (Admin Only) - Delete a room
router.delete('/rooms/:roomId', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.talkRoom.delete({
            where: { id: req.params.roomId },
        });
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Error deleting room:', err);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});
// ==========================================
// 2. TalkNotes & Replies Board
// ==========================================
// GET /rooms/:roomId/notes - Fetch paginated room notes
router.get('/rooms/:roomId/notes', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '30', 10);
        const skip = (page - 1) * limit;
        const userId = req.user?.sub;
        const sort = req.query.sort || 'recent';
        const orderBy = {};
        if (sort === 'interactive') {
            orderBy.meTooCount = 'desc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const notes = await prisma_1.default.talkNote.findMany({
            where: {
                roomId: req.params.roomId,
                OR: [
                    { status: enums_1.TalkStatus.APPROVED },
                    { userId: userId }, // Author can see their own flagged/pending notes
                ],
            },
            orderBy,
            skip,
            take: limit,
            include: {
                replies: {
                    where: {
                        OR: [
                            { status: enums_1.TalkStatus.APPROVED },
                            { userId: userId },
                        ],
                    },
                    orderBy: { createdAt: 'asc' },
                },
                reactions: true,
            },
        });
        res.status(200).json(notes);
    }
    catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});
// POST /rooms/:roomId/notes - Submit a new note
router.post('/rooms/:roomId/notes', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing' });
            return;
        }
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({ error: 'Content cannot be empty' });
            return;
        }
        const BANNED_WORDS = [
            'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'nigger', 'retard', 'faggot',
            'suck', 'dick', 'cock', 'pussy', 'sex', 'boobs', 'penis', 'vagina', 'cum', 'horny',
            'blowjob', 'whore', 'slut'
        ];
        const lowerContent = content.toLowerCase();
        const hasProfanity = BANNED_WORDS.some(word => lowerContent.includes(word));
        if (hasProfanity) {
            res.status(400).json({ error: 'Please keep your message friendly and supportive. Profanity or explicit content is not allowed.' });
            return;
        }
        if (content.length > 280) {
            res.status(400).json({ error: 'Content exceeds 280 characters' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                talkTermsAccepted: true,
                talkNickname: true,
                talkAvatar: true,
            }
        });
        if (!user || !user.talkTermsAccepted || !user.talkNickname) {
            res.status(400).json({ error: 'You must accept the terms and set up your peer profile before posting' });
            return;
        }
        // Save note immediately as APPROVED (released on the spot)
        const note = await prisma_1.default.talkNote.create({
            data: {
                roomId: req.params.roomId,
                userId,
                nickname: user.talkNickname,
                avatar: user.talkAvatar || 'panda',
                content,
                status: enums_1.TalkStatus.APPROVED,
                isReported: false,
                inputTokens: 0,
                outputTokens: 0,
            },
            include: {
                replies: true,
                reactions: true,
            },
        });
        // Fire and forget safety monitoring agent asynchronously
        runModerationAgent(note.id, note.content, 'note').catch(err => console.error('Failed to trigger async moderation agent:', err));
        res.status(201).json({
            note,
            isCrisis: false,
            message: "Note dropped on the wall successfully."
        });
    }
    catch (err) {
        console.error('Error creating note:', err);
        res.status(500).json({ error: 'Failed to drop note' });
    }
});
// POST /notes/:noteId/replies - Submit threaded reply
router.post('/notes/:noteId/replies', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing' });
            return;
        }
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({ error: 'Content cannot be empty' });
            return;
        }
        const BANNED_WORDS = [
            'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'nigger', 'retard', 'faggot',
            'suck', 'dick', 'cock', 'pussy', 'sex', 'boobs', 'penis', 'vagina', 'cum', 'horny',
            'blowjob', 'whore', 'slut'
        ];
        const lowerContent = content.toLowerCase();
        const hasProfanity = BANNED_WORDS.some(word => lowerContent.includes(word));
        if (hasProfanity) {
            res.status(400).json({ error: 'Please keep your message friendly and supportive. Profanity or explicit content is not allowed.' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                talkTermsAccepted: true,
                talkNickname: true,
                talkAvatar: true,
            }
        });
        if (!user || !user.talkTermsAccepted || !user.talkNickname) {
            res.status(400).json({ error: 'You must accept the terms and set up your peer profile before replying' });
            return;
        }
        // Save reply immediately as APPROVED (released on the spot)
        const reply = await prisma_1.default.talkReply.create({
            data: {
                noteId: req.params.noteId,
                userId,
                nickname: user.talkNickname,
                avatar: user.talkAvatar || 'panda',
                content,
                status: enums_1.TalkStatus.APPROVED,
                inputTokens: 0,
                outputTokens: 0,
            },
        });
        // Fire and forget safety monitoring agent asynchronously
        runModerationAgent(reply.id, reply.content, 'reply').catch(err => console.error('Failed to trigger async moderation agent:', err));
        res.status(201).json({
            reply,
            isCrisis: false,
            message: "Reply added."
        });
    }
    catch (err) {
        console.error('Error creating reply:', err);
        res.status(500).json({ error: 'Failed to add reply' });
    }
});
// POST /notes/:noteId/react - Toggle reaction
router.post('/notes/:noteId/react', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing' });
            return;
        }
        const { type } = req.body;
        if (!type || !Object.values(enums_1.ReactionType).includes(type)) {
            res.status(400).json({ error: 'Invalid reaction type' });
            return;
        }
        const reactionType = type;
        // Check if user already reacted with this type
        const existing = await prisma_1.default.talkReaction.findUnique({
            where: {
                noteId_userId_type: {
                    noteId: req.params.noteId,
                    userId,
                    type: reactionType,
                },
            },
        });
        if (existing) {
            // Toggle off - Delete reaction
            await prisma_1.default.talkReaction.delete({
                where: { id: existing.id },
            });
            if (reactionType === enums_1.ReactionType.METOO) {
                await prisma_1.default.talkNote.update({
                    where: { id: req.params.noteId },
                    data: { meTooCount: { decrement: 1 } },
                });
            }
            res.status(200).json({ status: 'removed' });
        }
        else {
            // Toggle on - Create reaction
            await prisma_1.default.talkReaction.create({
                data: {
                    noteId: req.params.noteId,
                    userId,
                    type: reactionType,
                },
            });
            if (reactionType === enums_1.ReactionType.METOO) {
                await prisma_1.default.talkNote.update({
                    where: { id: req.params.noteId },
                    data: { meTooCount: { increment: 1 } },
                });
            }
            res.status(201).json({ status: 'added' });
        }
    }
    catch (err) {
        console.error('Error toggling reaction:', err);
        res.status(500).json({ error: 'Failed to update reaction' });
    }
});
// POST /notes/:noteId/report - Flag a note
router.post('/notes/:noteId/report', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing' });
            return;
        }
        const { reason } = (req.body || {});
        // Validate that note exists
        const note = await prisma_1.default.talkNote.findUnique({
            where: { id: req.params.noteId },
        });
        if (!note) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        await prisma_1.default.talkReport.create({
            data: {
                noteId: req.params.noteId,
                userId,
                reason,
            },
        });
        // Update note flag
        await prisma_1.default.talkNote.update({
            where: { id: req.params.noteId },
            data: {
                isReported: true,
                status: enums_1.TalkStatus.FLAGGED, // Flag note pending review
            },
        });
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Error reporting note:', err);
        res.status(500).json({ error: 'Failed to report note' });
    }
});
// POST /replies/:replyId/report - Flag a reply
router.post('/replies/:replyId/report', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing' });
            return;
        }
        const { reason } = (req.body || {});
        // Validate that reply exists
        const reply = await prisma_1.default.talkReply.findUnique({
            where: { id: req.params.replyId },
        });
        if (!reply) {
            res.status(404).json({ error: 'Reply not found' });
            return;
        }
        await prisma_1.default.talkReport.create({
            data: {
                replyId: req.params.replyId,
                userId,
                reason,
            },
        });
        await prisma_1.default.talkReply.update({
            where: { id: req.params.replyId },
            data: {
                status: enums_1.TalkStatus.FLAGGED, // Hide reply pending review
            },
        });
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Error reporting reply:', err);
        res.status(500).json({ error: 'Failed to report reply' });
    }
});
// DELETE /notes/:noteId - Delete user's own note
router.delete('/notes/:noteId', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        const userRole = req.user?.role;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing' });
            return;
        }
        const note = await prisma_1.default.talkNote.findUnique({
            where: { id: req.params.noteId },
        });
        if (!note) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        if (note.userId !== userId && userRole !== 'ADMIN') {
            res.status(403).json({ error: 'Unauthorized to delete this note' });
            return;
        }
        await prisma_1.default.talkNote.delete({
            where: { id: req.params.noteId },
        });
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Error deleting note:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});
// DELETE /replies/:replyId - Delete user's own reply
router.delete('/replies/:replyId', jwt_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.sub;
        const userRole = req.user?.role;
        if (!userId) {
            res.status(401).json({ error: 'User ID missing' });
            return;
        }
        const reply = await prisma_1.default.talkReply.findUnique({
            where: { id: req.params.replyId },
        });
        if (!reply) {
            res.status(404).json({ error: 'Reply not found' });
            return;
        }
        if (reply.userId !== userId && userRole !== 'ADMIN') {
            res.status(403).json({ error: 'Unauthorized to delete this reply' });
            return;
        }
        await prisma_1.default.talkReply.delete({
            where: { id: req.params.replyId },
        });
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Error deleting reply:', err);
        res.status(500).json({ error: 'Failed to delete reply' });
    }
});
// ==========================================
// 3. Admin Moderation Controllers
// ==========================================
// GET /moderation - Retrieve reported/pending items (Admin Only)
router.get('/moderation', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const flaggedNotes = await prisma_1.default.talkNote.findMany({
            where: {
                OR: [
                    { isReported: true },
                    { status: enums_1.TalkStatus.FLAGGED },
                    { status: enums_1.TalkStatus.PENDING },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                reports: true,
                room: true,
            },
        });
        const flaggedReplies = await prisma_1.default.talkReply.findMany({
            where: {
                OR: [
                    { status: enums_1.TalkStatus.FLAGGED },
                    { status: enums_1.TalkStatus.PENDING },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                reports: true,
                note: {
                    include: { room: true },
                },
            },
        });
        res.status(200).json({
            notes: flaggedNotes,
            replies: flaggedReplies,
        });
    }
    catch (err) {
        console.error('Error fetching moderation items:', err);
        res.status(500).json({ error: 'Failed to fetch moderation items' });
    }
});
// POST /moderation/:type/:itemId/resolve (Admin Only) - Approve / Reject reported item
router.post('/moderation/:type/:itemId/resolve', jwt_1.authenticateJWT, (0, jwt_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { type, itemId } = req.params;
        const { action } = req.body;
        if (action !== 'approve' && action !== 'reject') {
            res.status(400).json({ error: 'Invalid moderation action' });
            return;
        }
        if (type === 'note') {
            const status = action === 'approve' ? enums_1.TalkStatus.APPROVED : enums_1.TalkStatus.REJECTED;
            await prisma_1.default.talkNote.update({
                where: { id: itemId },
                data: {
                    status,
                    isReported: false,
                },
            });
        }
        else if (type === 'reply') {
            const status = action === 'approve' ? enums_1.TalkStatus.APPROVED : enums_1.TalkStatus.REJECTED;
            await prisma_1.default.talkReply.update({
                where: { id: itemId },
                data: {
                    status,
                },
            });
        }
        else {
            res.status(400).json({ error: 'Invalid moderation type' });
            return;
        }
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Error resolving moderation item:', err);
        res.status(500).json({ error: 'Failed to resolve moderation item' });
    }
});
exports.default = router;
