const { errorBody } = require('../errors.cjs');

module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = status >= 500 ? 'Terjadi kesalahan internal.' : err.message;
  if (status >= 500) console.error('Kesalahan internal:', err.name, err.message);
  if (res.headersSent) return next(err);
  res.status(status).json(errorBody(message, code, err.errors));
};
