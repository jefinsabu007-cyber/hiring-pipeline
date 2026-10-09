const r = require('express').Router();
const { z } = require('zod');
const { Candidate, Interview, Activity, STAGES } = require('../models');
const { auth, allow, log, notify } = require('../middleware/auth');
r.use(auth);

const body = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(),
  position: z.string().min(2), resumeUrl: z.string().optional() });

const canSee = async (req, id) => req.user.role === 'recruiter' || !!(await Interview.exists({ candidate: id, interviewer: req.user._id }));

r.get('/', async (req, res) => {
  const { q, stage, page = 1, limit = 10 } = req.query, f = {};
  if (stage) f.stage = stage;
  if (q) { const re = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = ['name','email','position'].map((k) => ({ [k]: re })); }
  if (req.user.role === 'interviewer') f._id = { $in: await Interview.distinct('candidate', { interviewer: req.user._id }) };
  const [items, total] = await Promise.all([
    Candidate.find(f).sort('-createdAt').skip((page - 1) * limit).limit(+limit), Candidate.countDocuments(f)]);
  res.json({ items, total, pages: Math.ceil(total / limit) || 1 });
});
r.get('/stats', async (req, res) => {
  const byStage = await Candidate.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }]);
  const activity = req.user.role === 'recruiter'
    ? await Activity.find().sort('-createdAt').limit(10).populate('user', 'name').populate('candidate', 'name') : [];
  res.json({ byStage, activity });
});
r.post('/', allow('recruiter'), async (req, res) => {
  const c = await Candidate.create({ ...body.parse(req.body), createdBy: req.user._id });
  log(req, 'added candidate', c._id); res.status(201).json(c);
});
r.get('/:id', async (req, res) => {
  if (!(await canSee(req, req.params.id))) return res.status(403).json({ message: 'Not assigned to you' });
  const c = await Candidate.findById(req.params.id);
  c ? res.json(c) : res.status(404).json({ message: 'Candidate not found' });
});
r.put('/:id', allow('recruiter'), async (req, res) => {
  const c = await Candidate.findByIdAndUpdate(req.params.id, body.partial().parse(req.body), { new: true });
  if (!c) return res.status(404).json({ message: 'Candidate not found' });
  log(req, 'edited candidate', c._id); res.json(c);
});
r.patch('/:id/stage', allow('recruiter'), async (req, res) => {
  const { stage } = z.object({ stage: z.enum(STAGES) }).parse(req.body);
  const c = await Candidate.findByIdAndUpdate(req.params.id, { stage }, { new: true });
  if (!c) return res.status(404).json({ message: 'Candidate not found' });
  log(req, `moved to ${stage}`, c._id); notify(c.email, `Your application is now: ${stage}`); res.json(c);
});
r.post('/:id/notes', async (req, res) => {
  if (!(await canSee(req, req.params.id))) return res.status(403).json({ message: 'Not assigned to you' });
  const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
  const c = await Candidate.findByIdAndUpdate(req.params.id,
    { $push: { notes: { author: req.user.name, role: req.user.role, text } } }, { new: true });
  res.status(201).json(c);
});
r.delete('/:id', allow('recruiter'), async (req, res) => {
  await Promise.all([Candidate.findByIdAndDelete(req.params.id), Interview.deleteMany({ candidate: req.params.id })]);
  res.status(204).end();
});
module.exports = r;
