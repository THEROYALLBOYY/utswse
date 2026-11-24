
const { parseId } = require('../errors.cjs');

function validateIdParam(req, res, next) {
  try {
    req.params.id = String(parseId(req.params.id));
    next();
  } catch (e) { return next(e); }
}

module.exports = { validateIdParam };
