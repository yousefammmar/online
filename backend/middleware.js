const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'huawei_super_secret_key_123';

function requireAuth(req, res, next) {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, email, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
}

module.exports = {
    requireAuth,
    requireAdmin,
    JWT_SECRET
};
