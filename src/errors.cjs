class HttpError extends Error {
  constructor(status, message, errors, code) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (errors) this.errors = errors;
    if (code) this.code = code;
  }
}

function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,9}$/.test(value)) {
    throw new HttpError(400, 'ID pengaduan tidak valid.', [
      { field: 'id', message: 'ID harus bilangan bulat positif (contoh: 1).' }
    ], 'VALIDATION_ERROR');
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new HttpError(400, 'ID pengaduan tidak valid.', [
      { field: 'id', message: 'ID di luar rentang yang didukung.' }
    ], 'VALIDATION_ERROR');
  }
  return n;
}

function errorBody(message, code, errors) {
  const body = { success: false, message, code: code || 'ERROR' };
  if (errors) body.errors = errors;
  return body;
}

module.exports = { HttpError, parseId, errorBody };
