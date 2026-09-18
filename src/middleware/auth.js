const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
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
        return res.status(401).json({ message: 'Unauthorized: Missing token header' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload; // Payload should contain user role e.g. req.user.role
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
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
            return res.status(403).json({ message: 'Forbidden: No role assigned' });
        }

        // Get all effective roles for the user based on hierarchy
        const userPermissions = ROLE_HIERARCHY[userRole] || [];

        // Check if user has at least one of the allowed roles
        const hasPermission = allowedRoles.some(role => userPermissions.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};

module.exports = { verifyToken, authorize };






// ============How to use it==============
// const express = require('express');
// const router = express.Router();
// const { verifyToken, authorize } = require('./authMiddleware');

// // Accessible by Student, Teacher, and Admin (Student route)
// router.get('/courses', verifyToken, authorize('student'), (req, res) => {
//     res.json({ message: 'List of enrolled courses' });
// });

// // Accessible by Teacher and Admin only
// router.post('/grades', verifyToken, authorize('teacher'), (req, res) => {
//     res.json({ message: 'Grade submitted successfully' });
// });

// // Accessible by Admin ONLY
// router.delete('/user/:id', verifyToken, authorize('admin'), (req, res) => {
//     res.json({ message: 'User account removed' });
// });

// // Route accessible explicitly by either Teacher OR Student (excluding hierarchy)
// router.get('/forum', verifyToken, authorize('teacher', 'student'), (req, res) => {
//     res.json({ message: 'Discussion board access' });
// });

