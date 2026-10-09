const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });
exports.STAGES = ['Applied','Screening','Technical Interview','HR Interview','Offered','Rejected','Hired'];

exports.User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Google-only accounts have no password
  password: { type: String, select: false, required: function () { return !this.googleId; } },
  role: { type: String, enum: ['recruiter','interviewer'], required: true },
  googleId: { type: String, unique: true, sparse: true },
  provider: { type: String, enum: ['local','google'], default: 'local' },
  avatar: String,
  // brute-force protection (never returned by default)
  failedLogins: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  lastLoginAt: Date,
}, { timestamps: true }));

exports.Candidate = model('Candidate', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  phone: String, position: { type: String, required: true }, resumeUrl: String,
  stage: { type: String, enum: exports.STAGES, default: 'Applied' },
  notes: [{ author: String, role: String, text: String, at: { type: Date, default: Date.now } }],
  createdBy: ref('User'),
}, { timestamps: true }));

exports.Interview = model('Interview', new Schema({
  candidate: { ...ref('Candidate'), required: true },
  interviewer: { ...ref('User'), required: true },
  scheduledAt: { type: Date, required: true },
  mode: { type: String, default: 'Video' }, location: String,
  status: { type: String, enum: ['scheduled','completed','cancelled'], default: 'scheduled' },
}, { timestamps: true }));

const fb = new Schema({
  interview: { ...ref('Interview'), required: true, unique: true },
  candidate: ref('Candidate'), interviewer: ref('User'),
  rating: { type: Number, min: 1, max: 5, required: true },
  recommendation: { type: String, enum: ['hire','no_hire','maybe'], default: 'maybe' },
  comments: { type: String, required: true },
}, { timestamps: true });
exports.Feedback = model('Feedback', fb);

exports.Activity = model('Activity', new Schema({
  user: ref('User'), candidate: ref('Candidate'), action: String,
}, { timestamps: true }));
