"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
exports.requireRoles = requireRoles;
const jwt_1 = require("../lib/jwt");
const response_1 = require("../utils/response");
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        (0, response_1.sendError)(res, 'UNAUTHORIZED', 'Missing or invalid authorization token header', 401);
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        (0, response_1.sendError)(res, 'INVALID_TOKEN', 'Token verification failed or token expired', 401);
        return;
    }
}
function requireRoles(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendError)(res, 'UNAUTHORIZED', 'Authentication required', 401);
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            (0, response_1.sendError)(res, 'FORBIDDEN', `Access denied. Required roles: ${allowedRoles.join(', ')}`, 403);
            return;
        }
        next();
    };
}
