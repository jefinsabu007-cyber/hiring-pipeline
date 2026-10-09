const jwt = require('jsonwebtoken');
const { User, Activity } = require('../models');
exports.auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    const { id } = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = await User.findById(id);
    if (!req.user) throw new Error();
    next();
  } catch { res.status(401).json({ message: 'Unauthorized' }); }
};
exports.allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Forbidden for your role' });
exports.log = (req, action, candidate) => Activity.create({ user: req.user._id, candidate, action }).catch(() => {});
exports.notify = (to, subject) => console.log(`[MOCK EMAIL] to=${to} subject="${subject}"`);
