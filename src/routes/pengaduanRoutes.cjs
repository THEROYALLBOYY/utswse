
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pengaduanController.cjs');
const { requireAuth } = require('../middleware/authMiddleware.cjs');
const { requireRole } = require('../middleware/roleMiddleware.cjs');
const { createValidator, updateValidator, statusValidator } = require('../middleware/validationMiddleware.cjs');
const { validateIdParam } = require('../middleware/idMiddleware.cjs');

router.use(requireAuth);
router.get('/', ctrl.listHandler);
router.get('/:id', validateIdParam, ctrl.detailHandler);
router.post('/', requireRole('mahasiswa'), createValidator, ctrl.createHandler);
router.put('/:id', requireRole('mahasiswa'), validateIdParam, updateValidator, ctrl.updateHandler);
router.patch('/:id/status', requireRole('admin'), validateIdParam, statusValidator, ctrl.updateStatusHandler);
router.delete('/:id', requireRole('mahasiswa'), validateIdParam, ctrl.removeHandler);

module.exports = router;
