const errorHandler = (err, req, res, next) => {
    // Log the error to the console for the developer to see
    console.error("--- UNHANDLED ERROR ---");
    console.error(err.stack);

    // Set a default status code of 500 (Internal Server Error) if one isn't already set
    const statusCode = res.statusCode ? res.statusCode : 500;

    res.status(statusCode);

    // Send a clean, consistent JSON response back to the front-end
    res.json({
        message: err.message,
        // In a real production app, you would hide the 'stack' for security.
        // For development, it's very useful for debugging.
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;