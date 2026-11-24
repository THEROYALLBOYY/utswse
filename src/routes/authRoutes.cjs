const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController.cjs');
const { loginValidator } = require('../middleware/validationMiddleware.cjs');

router.post('/login', loginValidator, ctrl.loginHandler);
router.post('/logout', ctrl.logoutHandler);

module.exports = router;
