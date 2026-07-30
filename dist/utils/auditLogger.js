"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
const prisma_1 = __importDefault(require("../lib/prisma"));
function logAuditEvent(options) {
    // Execute asynchronously without blocking request handling thread
    prisma_1.default.auditLog
        .create({
        data: {
            actorId: options.actorId || null,
            action: options.action,
            targetEntity: options.targetEntity,
            targetId: options.targetId || null,
            ipAddress: options.ipAddress || null,
            details: options.details ? options.details : undefined,
        },
    })
        .catch((err) => {
        console.error('[AuditLogger Error] Failed to write audit log:', err);
    });
}
