const { login } = require('../services/authService.cjs');
const { errorBody } = require('../errors.cjs');
const { issueToken, revokeToken, config } = require('../security.cjs');

function loginHandler(req, res) {
  const user = login(req.body, req.ip || '127.0.0.1');
  return res.json({ success: true, message: 'Login berhasil', data: user });
}

function logoutHandler(req, res) {
  const header = req.get('Authorization') || '';
  const token = header.split(' ')[1];
  if (token) revokeToken(token);
  return res.json({ success: true, message: 'Logout berhasil' });
}

module.exports = { loginHandler, logoutHandler };
