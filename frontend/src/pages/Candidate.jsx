import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api'; import { useStore } from '../store';
import { Card, Btn, Input, Select, Textarea, Spinner, ErrorMsg, fmt } from '../components/ui.jsx';

export default function Candidate() {
  const { id } = useParams(), user = useStore((s) => s.user), isRec = user.role === 'recruiter';
  const [c, setC] = useState(null), [ivs, setIvs] = useState([]), [fbs, setFbs] = useState([]), [staff, setStaff] = useState([]);
  const [err, setErr] = useState(''), [edit, setEdit] = useState(null), [note, setNote] = useState(''), [sch, setSch] = useState({}), [fb, setFb] = useState({ rating: 3, recommendation: 'maybe' });

  const load = useCallback(async () => {
    try {
      const [cand, i, f] = await Promise.all([api(`/candidates/${id}`), api(`/interviews?candidate=${id}`), api(`/feedback?candidate=${id}`)]);
      setC(cand); setIvs(i); setFbs(f); setErr('');
      if (isRec) setStaff(await api('/users/interviewers'));
    } catch (e) { setErr(e.message); }
  }, [id, isRec]);
  useEffect(() => { load(); }, [load]);
  const run = (fn) => async (e) => { e?.preventDefault(); try { await fn(); setErr(''); load(); } catch (x) { setErr(x.message); } };

  if (!c) return err ? <ErrorMsg error={err} /> : <Spinner />;
  const pending = ivs.filter((i) => i.status === 'scheduled' && i.interviewer._id === user.id);

  return (<div className="space-y-4">
    <Link to="/" className="text-sm text-[#ffc83d] hover:underline">← Back</Link><ErrorMsg error={err} />
    <Card>
      {edit ? <form onSubmit={run(async () => { await api(`/candidates/${id}`, { method: 'PUT', body: edit }); setEdit(null); })} className="grid gap-2 sm:grid-cols-2">
        {['name','email','phone','position'].map((k) => <Input key={k} placeholder={k} defaultValue={c[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />)}
        <div className="flex gap-2"><Btn>Save</Btn><Btn type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn></div>
      </form> : <div className="flex items-start justify-between">
        <div><h1 className="text-xl font-bold">{c.name}</h1><p className="text-sm text-[#a8a595]">{c.position} · {c.email} {c.phone && `· ${c.phone}`}</p>
          <span className="mt-2 inline-block rounded-full border border-[#ffc83d]/25 bg-[#ffc83d]/15 px-3 py-1 text-xs font-semibold text-[#ffd76a]">{c.stage}</span></div>
        {isRec && <Btn variant="ghost" onClick={() => setEdit({})}>Edit</Btn>}
      </div>}
    </Card>
    <div className="grid gap-4 md:grid-cols-2">
      <Card><h2 className="mb-2 font-semibold">Interviews</h2>
        {ivs.map((i) => <p key={i._id} className="border-t border-white/10 py-1 text-sm">{fmt(i.scheduledAt)} · {i.interviewer.name} · {i.mode} · <i>{i.status}</i>
          {isRec && <button className="ml-2 text-rose-400 hover:underline" onClick={run(() => api(`/interviews/${i._id}`, { method: 'DELETE' }))}>delete</button>}</p>)}
        {!ivs.length && <p className="text-sm text-[#a8a595]">None yet.</p>}
        {isRec && <form onSubmit={run(async () => { await api('/interviews', { method: 'POST', body: { ...sch, candidate: id } }); setSch({}); })} className="mt-3 space-y-2">
          <Select required value={sch.interviewer || ''} onChange={(e) => setSch({ ...sch, interviewer: e.target.value })}><option value="">Select interviewer</option>{staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select>
          <Input type="datetime-local" required value={sch.scheduledAt || ''} onChange={(e) => setSch({ ...sch, scheduledAt: e.target.value })} />
          <Btn>Schedule interview</Btn></form>}
      </Card>
      <Card><h2 className="mb-2 font-semibold">Feedback</h2>
        {fbs.map((f) => <div key={f._id} className="border-t border-white/10 py-2 text-sm"><b>{f.interviewer?.name}</b> · {f.rating}/5 · {f.recommendation}<p>{f.comments}</p></div>)}
        {!fbs.length && <p className="text-sm text-[#a8a595]">No feedback yet.</p>}
        {!isRec && pending.length > 0 && <form onSubmit={run(async () => { await api('/feedback', { method: 'POST', body: { ...fb, interview: fb.interview || pending[0]._id, rating: +fb.rating } }); setFb({ rating: 3, recommendation: 'maybe' }); })} className="mt-3 space-y-2">
          <Select value={fb.interview || pending[0]._id} onChange={(e) => setFb({ ...fb, interview: e.target.value })}>{pending.map((i) => <option key={i._id} value={i._id}>{fmt(i.scheduledAt)}</option>)}</Select>
          <div className="flex gap-2"><Select value={fb.rating} onChange={(e) => setFb({ ...fb, rating: e.target.value })}>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</Select>
            <Select value={fb.recommendation} onChange={(e) => setFb({ ...fb, recommendation: e.target.value })}><option value="hire">Hire</option><option value="maybe">Maybe</option><option value="no_hire">No hire</option></Select></div>
          <Textarea required placeholder="Comments" value={fb.comments || ''} onChange={(e) => setFb({ ...fb, comments: e.target.value })} /><Btn>Submit feedback</Btn></form>}
      </Card>
    </div>
    <Card><h2 className="mb-2 font-semibold">Notes</h2>
      {c.notes.map((n, i) => <p key={i} className="border-t border-white/10 py-1 text-sm"><b>{n.author}</b> ({n.role}): {n.text}<span className="ml-2 text-xs text-[#a8a595]">{fmt(n.at)}</span></p>)}
      <form onSubmit={run(async () => { await api(`/candidates/${id}/notes`, { method: 'POST', body: { text: note } }); setNote(''); })} className="mt-2 flex gap-2">
        <Input placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} required /><Btn>Add</Btn></form>
    </Card>
  </div>);
}
