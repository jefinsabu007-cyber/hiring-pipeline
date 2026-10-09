const r = require('express').Router();
const { User } = require('../models'); const { auth, allow } = require('../middleware/auth');
r.get('/interviewers', auth, allow('recruiter'), async (req, res) => res.json(await User.find({ role: 'interviewer' }).select('name email')));
module.exports = r;
