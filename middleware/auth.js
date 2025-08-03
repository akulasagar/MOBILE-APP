const jwt = require('jsonwebtoken');

function auth(req, res, next) {
    // Get token from the header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user from payload to the request object
        req.user = decoded.user;
        next(); // Move on to the next piece of middleware/the route handler
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
}

module.exports = auth;