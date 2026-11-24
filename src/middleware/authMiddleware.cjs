const { verifyToken } = require('../security.cjs');
const { errorBody } = require('../errors.cjs');

function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const parts = header.split(' ');
  const token = parts[0] === 'Bearer' && parts.length === 2 ? parts[1] : null;
  if (!token) {
    return res.status(401).json(errorBody('Token wajib.', 'UNAUTHORIZED'));
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(err.status || 401).json(errorBody(err.message, err.code));
  }
}

module.exports = { requireAuth, requireBearer: requireAuth, verifyToken };
