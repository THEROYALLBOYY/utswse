const { errorBody } = require('../errors.cjs');

function requireRole(...roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const userRole = (req.user && req.user.role) || '';
    if (!allowed.includes(userRole)) {
      return res.status(403).json(errorBody('Akses ditolak. Role tidak memiliki izin untuk fitur ini.', 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { requireRole };
