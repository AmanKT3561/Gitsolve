'use strict';

// Centralized error handler. Must be registered LAST in app.js.
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: err.publicMessage || err.message || 'Internal Server Error',
  });
};
