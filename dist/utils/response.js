"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, statusCode = 200, meta) {
    const body = {
        success: true,
        data,
        ...(meta ? { meta } : {}),
    };
    res.status(statusCode).json(body);
}
function sendError(res, code, message, statusCode = 400, details) {
    const body = {
        success: false,
        error: {
            code,
            message,
            ...(details ? { details } : {}),
        },
    };
    res.status(statusCode).json(body);
}
