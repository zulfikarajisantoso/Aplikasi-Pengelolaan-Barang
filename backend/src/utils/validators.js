const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// At least one lowercase, one uppercase, one digit, length checked separately.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidEmail(v) {
  return isNonEmptyString(v) && v.length >= 8 && v.length <= 100 && EMAIL_RE.test(v);
}

function isValidPassword(v) {
  return isNonEmptyString(v) && v.length >= 8 && v.length <= 100 && PASSWORD_RE.test(v);
}

function inRange(str, min, max) {
  return isNonEmptyString(str) && str.length >= min && str.length <= max;
}

function maxLen(str, max) {
  return str === undefined || str === null || str === '' || (typeof str === 'string' && str.length <= max);
}

function isNumeric(v) {
  if (v === undefined || v === null || v === '') return false;
  const n = Number(v);
  return !Number.isNaN(n) && Number.isFinite(n);
}

module.exports = {
  EMAIL_RE,
  PASSWORD_RE,
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  inRange,
  maxLen,
  isNumeric,
};
