const service = require('../services/pengaduanService.cjs');

function sendArray(res, items) { res.json({ success: true, message: 'Berhasil', data: items }); }
function sendOne(res, obj) { res.json({ success: true, message: 'Berhasil', data: obj }); }
function send204(res) { res.status(204).end(); }

function listHandler(req, res) { sendArray(res, service.list(req.user)); }

function detailHandler(req, res) {
  const p = service.detail(Number(req.params.id), req.user);
  return sendOne(res, p);
}

function createHandler(req, res) {
  const p = service.create(req.user, req.body);
  return res.status(201).json({ success: true, message: 'Berhasil dibuat', data: p });
}

function updateHandler(req, res) {
  const p = service.update(Number(req.params.id), req.user, req.body);
  return sendOne(res, p);
}

function updateStatusHandler(req, res) {
  const p = service.updateStatus(Number(req.params.id), req.user, req.body);
  return sendOne(res, p);
}

function removeHandler(req, res) {
  service.remove(Number(req.params.id), req.user);
  send204(res);
}

module.exports = { listHandler, detailHandler, createHandler, updateHandler, updateStatusHandler, removeHandler };
