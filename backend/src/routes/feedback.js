const r = require('express').Router();
const { z } = require('zod');
const { Feedback, Interview } = require('../models');
const { auth, allow, log } = require('../middleware/auth');
r.use(auth);
const body = z.object({ rating: z.number().int().min(1).max(5), comments: z.string().min(3),
  recommendation: z.enum(['hire','no_hire','maybe']).optional() });
const pop = (q) => q.populate('interviewer', 'name').populate('candidate', 'name');

r.get('/', async (req, res) => {
  const f = {};
  if (req.user.role === 'interviewer') f.interviewer = req.user._id;
  if (req.query.candidate) f.candidate = req.query.candidate;
  res.json(await pop(Feedback.find(f).sort('-createdAt')));
});
r.post('/', allow('interviewer'), async (req, res) => {
  const interviewId = z.string().parse(req.body.interview);
  const iv = await Interview.findOne({ _id: interviewId, interviewer: req.user._id });
  if (!iv) return res.status(403).json({ message: 'Not your interview' });
  if (await Feedback.exists({ interview: iv._id })) return res.status(409).json({ message: 'Feedback already submitted' });
  const f = await Feedback.create({ ...body.parse(req.body), interview: iv._id, candidate: iv.candidate, interviewer: req.user._id });
  iv.status = 'completed'; await iv.save();
  log(req, 'submitted feedback', iv.candidate); res.status(201).json(f);
});
r.put('/:id', allow('interviewer'), async (req, res) => {
  const f = await Feedback.findOneAndUpdate({ _id: req.params.id, interviewer: req.user._id }, body.partial().parse(req.body), { new: true });
  f ? res.json(f) : res.status(404).json({ message: 'Feedback not found' });
});
r.delete('/:id', allow('interviewer'), async (req, res) => {
  await Feedback.findOneAndDelete({ _id: req.params.id, interviewer: req.user._id }); res.status(204).end();
});
module.exports = r;
