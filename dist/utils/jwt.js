"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
exports.authenticateJWT = authenticateJWT;
exports.authorizeRoles = authorizeRoles;
const jwt_1 = require("../lib/jwt");
Object.defineProperty(exports, "verifyToken", { enumerable: true, get: function () { return jwt_1.verifyToken; } });
Object.defineProperty(exports, "signToken", { enumerable: true, get: function () { return jwt_1.signToken; } });
/**
 * Express middleware — validates the Bearer JWT in the Authorization header.
 *
 * On success:  populates req.user with { sub, email, role, universityId }
 *              and calls next().
 * On failure:  responds immediately with 401 Unauthorized.
 *
 * Usage:
 *   import { authenticateJWT } from '../utils/jwt';
 *   router.get('/protected', authenticateJWT, handler);
 */
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization header missing or malformed' });
        return;
    }
    const token = authHeader.slice(7); // strip "Bearer "
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        if (err instanceof Error) {
            if (err.name === 'TokenExpiredError') {
                res.status(401).json({ error: 'Token has expired' });
                return;
            }
            if (err.name === 'JsonWebTokenError') {
                res.status(401).json({ error: 'Invalid token' });
                return;
            }
        }
        res.status(401).json({ error: 'Authentication failed' });
    }
}
/**
 * Role-guard factory — use after authenticateJWT.
 *
 * Usage:
 *   router.delete('/admin/user/:id', authenticateJWT, authorizeRoles('ADMIN'), handler);
 */
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: insufficient permissions' });
            return;
        }
        next();
    };
}
