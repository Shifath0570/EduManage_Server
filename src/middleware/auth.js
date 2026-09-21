// const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

// const JWKS = createRemoteJWKSet(
//     new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
// );

// const verifyToken = async (req, res, next) => {
//     const authHeader = req?.headers.authorization;
//     if (!authHeader) {
//         return res.status(401).json({ message: 'Unauthorized' });
//     }
//     const token = authHeader.split(' ')[1];
//     if (!token) {
//         return res.status(401).json({ message: 'Unauthorized' });
//     }

//     try {
//         const { payload } = await jwtVerify(token, JWKS);
//         // Attach user payload to request for use in routes
//         req.user = payload;
//         next();
//     } catch (error) {
//         return res.status(403).json({ message: 'Forbidden' });
//     }
// };

// module.exports = verifyToken;

const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const JWKS = createRemoteJWKSet(
    new URL(`${clientUrl}/api/auth/jwks`)
);

// Define role hierarchy: Higher roles include access to lower roles
const ROLE_HIERARCHY = {
    admin: ['admin', 'teacher', 'student'],
    teacher: ['teacher', 'student'],
    student: ['student']
};

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing token header' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = {
            id: payload.sub || payload.id,
            email: payload.email,
            name: payload.name,
            role: (payload.role || 'student').toLowerCase().trim(),
            ...payload
        };
        next();
    } catch (error) {
        console.error('JWT Verification error:', error.message);
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid or expired token' });
    }
};

/**
 * Restricts access to specified roles. 
 * Supports both single role string ('teacher') or array of roles (['teacher', 'student'])
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role; // e.g., 'admin', 'teacher', or 'student'

        if (!userRole) {
            return res.status(403).json({ success: false, message: 'Forbidden: No role assigned' });
        }

        // Get all effective roles for the user based on hierarchy
        const userPermissions = ROLE_HIERARCHY[userRole] || [];

        // Check if user has at least one of the allowed roles
        const hasPermission = allowedRoles.some(role => userPermissions.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};

module.exports = { verifyToken, authorize };

