const { validationResult } = require('express-validator');

/**
 * Middleware: Check express-validator results and return 400 if errors exist.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(e => e.msg) });
  }
  next();
}

module.exports = { validate };
