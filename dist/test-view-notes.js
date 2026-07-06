"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
async function test() {
    try {
        console.log("Fetching last 5 notes...");
        const notes = await prisma_1.default.talkNote.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        for (const note of notes) {
            console.log(`\nNote ID: ${note.id}`);
            console.log(`Content: "${note.content}"`);
            console.log(`Status: ${note.status}`);
            console.log(`Moderation Reason: ${note.moderationReason}`);
        }
    }
    catch (err) {
        console.error("Failed to fetch notes:", err);
    }
    finally {
        await prisma_1.default.$disconnect();
    }
}
test();
