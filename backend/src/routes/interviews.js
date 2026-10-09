const r = require('express').Router();
const { z } = require('zod');
const { Interview, User, Candidate } = require('../models');
const { auth, allow, log, notify } = require('../middleware/auth');
r.use(auth);
const body = z.object({ candidate: z.string(), interviewer: z.string(), scheduledAt: z.coerce.date(),
  mode: z.string().optional(), location: z.string().optional(),
  status: z.enum(['scheduled','completed','cancelled']).optional() });
const pop = (q) => q.populate('candidate', 'name position stage').populate('interviewer', 'name email');

r.get('/', async (req, res) => {
  const f = {};
  if (req.user.role === 'interviewer') f.interviewer = req.user._id;
  if (req.query.candidate) f.candidate = req.query.candidate;
  if (req.query.upcoming === 'true') { f.scheduledAt = { $gte: new Date() }; f.status = 'scheduled'; }
  res.json(await pop(Interview.find(f).sort('scheduledAt')));
});
r.post('/', allow('recruiter'), async (req, res) => {
  const d = body.parse(req.body);
  const [iv, c] = await Promise.all([User.findOne({ _id: d.interviewer, role: 'interviewer' }), Candidate.findById(d.candidate)]);
  if (!iv || !c) return res.status(400).json({ message: 'Invalid candidate or interviewer' });
  const i = await Interview.create(d);
  log(req, `scheduled interview with ${iv.name}`, c._id); notify(iv.email, `Interview scheduled with ${c.name}`);
  res.status(201).json(await pop(Interview.findById(i._id)));
});
r.put('/:id', allow('recruiter'), async (req, res) => {
  const i = await Interview.findByIdAndUpdate(req.params.id, body.partial().parse(req.body), { new: true });
  i ? res.json(i) : res.status(404).json({ message: 'Interview not found' });
});
r.delete('/:id', allow('recruiter'), async (req, res) => { await Interview.findByIdAndDelete(req.params.id); res.status(204).end(); });
module.exports = r;
