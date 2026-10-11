import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, History, Leaf, Pencil, RefreshCw, RotateCcw, Sparkles, Sun, Trash2 } from 'lucide-react';
import { type StoredTask, type StoredPlan } from '../../../shared/src/contracts';
import { generatePlan } from '../lib/api';
import { activePlan, regeneratePlan, resetAll, toggleTask, updateTask } from '../lib/storage';
import { useGarden } from '../lib/hooks';
import { Alert, Busy, CompletionRing, Empty, Eyebrow } from '../components/Shared';

function EditTask({ task, plan, onClose }: { task: StoredTask; plan: StoredPlan; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [instructions, setInstructions] = useState(task.instructions.join('\n'));
  const [duration, setDuration] = useState(String(task.durationMinutes));
  const [materials, setMaterials] = useState(task.materials.join(', '));
  const [error, setError] = useState('');
  function save(e: FormEvent) {
    e.preventDefault(); setError('');
    const steps = instructions.split('\n').map(s => s.trim()).filter(Boolean);
    const items = materials.split(',').map(s => s.trim()).filter(Boolean);
    if (!title.trim() || steps.length === 0 || steps.length > 8 || items.length > 12 || !Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 90) { setError('Add a title, 1–8 instructions and a duration of 1–90 minutes.'); return; }
    try { updateTask(plan.id, task.id, { title: title.trim(), instructions: steps, durationMinutes: Number(duration), materials: items }); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save your edits.'); }
  }
  return <form className="task-edit" onSubmit={save}><label>Task title<input value={title} maxLength={120} onChange={e => setTitle(e.target.value)}/></label><label>Instructions (one step per line)<textarea value={instructions} rows={4} onChange={e => setInstructions(e.target.value)}/></label><div className="form-row"><label>Duration in minutes<input type="number" min={1} max={90} value={duration} onChange={e => setDuration(e.target.value)}/></label><label>Materials (comma-separated)<input value={materials} onChange={e => setMaterials(e.target.value)}/></label></div>{error && <Alert message={error}/>}<div className="edit-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save changes <Check size={16}/></button></div></form>;
}
function Task({ task, plan, onError }: { task: StoredTask; plan: StoredPlan; onError: (e: string) => void }) {
  const [editing, setEditing] = useState(false);
  return <article className={`task-card ${task.completed ? 'done' : ''}`}><div className="task-body">
    <label className="task-check"><input type="checkbox" checked={task.completed} onChange={() => { try { toggleTask(plan.id, task.id); } catch (e) { onError(e instanceof Error ? e.message : 'Unable to save task.'); } }}/><span className="checkbox-face" aria-hidden="true"><Check size={15}/></span><span className="sr-only">{task.completed ? 'Mark incomplete' : 'Mark complete'}: {task.title}</span></label>
    <div className="task-main"><div className="task-heading"><h4>{task.title}</h4><span className="duration"><Clock3 size={14}/> {task.durationMinutes} min</span></div>
      {editing ? <EditTask task={task} plan={plan} onClose={() => setEditing(false)}/> : <><ol className="instruction-list">{task.instructions.map((step, i) => <li key={i}>{step}</li>)}</ol><div className="task-bottom"><span className="materials"><strong>You'll need:</strong> {task.materials.length ? task.materials.join(' · ') : 'Just your attention'}</span><button className="edit-task" onClick={() => setEditing(true)}><Pencil size={14}/> Edit</button></div></>}
    </div></div></article>;
}
function Day({ day, plan, onError }: { day: number; plan: StoredPlan; onError: (e: string) => void }) {
  const tasks = plan.tasks.filter(t => t.day === day);
  const done = tasks.every(t => t.completed);
  return <section className="day-group"><div className="day-label"><span className={`day-number ${done ? 'finished' : ''}`}>{done ? <Check size={18}/> : String(day).padStart(2,'0')}</span><div><h3>Day {day}</h3><p>{done ? 'All done. Beautiful work!' : `${tasks.filter(t => t.completed).length} of ${tasks.length} tasks complete`}</p></div></div><div className="day-tasks">{tasks.map(task => <Task key={task.id} task={task} plan={plan} onError={onError}/>)}</div></section>;
}
export function Garden() {
  const state = useGarden(), plan = activePlan(state), profile = state.profile;
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [regenError, setRegenError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReset, setShowReset] = useState(false);
  if (!plan || !profile) return <div className="page-light container garden-empty">{state.warning && <><Alert message={state.warning}/><button className="btn btn-danger" onClick={() => { if (window.confirm("Clear all GardenBuddy data from this browser? This cannot be undone.")) { try { resetAll(); } catch (e) { window.alert(e instanceof Error ? e.message : "Reset failed."); } } }}>Reset incompatible saved data</button></>}<Empty title="Your garden is waiting to begin" description="Tell us a little about your space and we'll build your first seven-day care plan."/></div>;
  const done = plan.tasks.filter(t => t.completed).length;
  const minutes = plan.tasks.filter(t => t.completed).reduce((n,t) => n + t.durationMinutes,0);
  const history = state.plans.filter(p => p.status === 'archived' && p.gardenId === profile.id).sort((a,b) => b.version-a.version);
  async function regenerate() {
    if (busy) return;
    const incomplete = plan!.tasks.length - done;
    if (!window.confirm(`Generate a NEW seven-day plan? ${incomplete ? `${incomplete} unfinished task(s) will remain only in the archived version.` : 'Your current completed plan will be archived.'} Your current plan remains unchanged if generation fails.`)) return;
    setBusy(true); setError(''); setRegenError(false);
    try { const candidate = await generatePlan(profile!.preferences, { id: profile!.selectedPlantId, name: profile!.selectedPlantName }); regeneratePlan(candidate); }
    catch (err) { setError(err instanceof Error ? err.message : 'Plan regeneration failed. Your existing plan remains active.'); setRegenError(true); }
    finally { setBusy(false); }
  }
  function clear() {
    if (!window.confirm('Permanently delete your garden profile, all plan versions, saved progress and diagnosis history from THIS browser? This cannot be undone.')) return;
    try { resetAll(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not clear your data.'); }
  }
  return <div className="garden-page"><div className="container garden-wrap"><div className="garden-heading"><div><Eyebrow>YOUR PERSONAL GROWING SPACE</Eyebrow><h1>Good things are <em>growing.</em></h1><p>Welcome back! Every little bit of care is progress.</p></div><Link to="/setup" className="btn btn-outline">Start a different plant <ArrowRight size={16}/></Link></div>
    {state.warning && <Alert message={state.warning}/>}{error && <Alert message={error} onRetry={regenError ? () => void regenerate() : undefined}/>} 
    <div className="garden-overview"><div className="profile-panel"><div className="profile-picture" aria-hidden="true">🌿</div><div><span className="small-overline">YOUR GARDEN</span><h2>{profile.name}</h2><p>Growing <strong>{profile.selectedPlantName}</strong> in {profile.preferences.city}</p><div className="profile-tags"><span><Sun size={14}/> {profile.preferences.sunlight} light</span><span><Clock3 size={14}/> {profile.preferences.dailyTimeMinutes} min/day</span><span><Leaf size={14}/> {profile.preferences.space}</span></div></div></div>
    <div className="progress-panel"><div><span className="small-overline">YOUR JOURNEY SO FAR</span><h3>Look how far you've come.</h3><div className="progress-stat"><strong>{done}</strong> <span>of {plan.tasks.length} tasks completed</span></div><p>~{minutes} minutes of planned activity completed</p></div><CompletionRing tasks={plan.tasks}/></div></div>
    <div className="garden-content"><div className="garden-plan"><div className="plan-title-row"><div><Eyebrow>ONE DAY AT A TIME</Eyebrow><h2>{plan.title}</h2><p>{plan.generalNote}</p></div><span className="version-badge">Plan v{plan.version}</span></div><div className="plan-toolbar"><span><CalendarDays size={18}/> Your 7-day care journey</span><button className="btn btn-small btn-secondary" onClick={regenerate} disabled={busy}><RefreshCw size={16} className={busy ? 'spin' : ''}/>{busy ? 'Regenerating…' : 'Regenerate plan'}</button></div>
      {busy && <Busy title="Creating your new care plan…" description="Your current tasks and progress are safe until the replacement passes validation."/>}
      <div className="days-list">{[1,2,3,4,5,6,7].map(day => <Day key={`${plan.id}-${day}`} day={day} plan={plan} onError={setError}/>)}</div>
      <div className="plan-end"><CheckCircle2 size={23}/><div><strong>Keep nurturing your garden.</strong><p>Observe the plant and adjust watering or timing as local conditions change.</p></div></div>
    </div><aside className="garden-sidebar"><div className="side-panel tip-panel"><span className="tip-icon">✳</span><Eyebrow>A GENTLE REMINDER</Eyebrow><h3>Progress, not perfection.</h3><p>Some days you'll do it all. Some days you may only check a leaf. Every moment of attention counts.</p><div className="tip-plant">🌱</div></div><div className="side-panel history-panel"><div className="sidebar-heading"><History size={21}/><h3>Plan history</h3></div><p>Every new plan keeps your previous version safe.</p><button className="history-toggle" onClick={() => setShowHistory(s => !s)} aria-expanded={showHistory}>View past plans ({history.length}) <ChevronDown size={17} className={showHistory ? 'rotate' : ''}/></button>{showHistory && <div className="history-list">{history.length ? history.map(p => <details key={p.id}><summary>Version {p.version} · {p.plantName}<small>{new Date(p.createdAt).toLocaleDateString()}</small></summary><p>{p.title}</p><p>{p.tasks.filter(t=>t.completed).length}/{p.tasks.length} completed</p>{[1,2,3,4,5,6,7].map(day => <div key={day} className="history-day"><strong>Day {day}</strong><ul>{p.tasks.filter(t => t.day === day).map(t => <li key={t.id}>{t.completed ? '✓ ' : '○ '}<strong>{t.title}</strong> · {t.durationMinutes} min<ul>{t.instructions.map((step,i) => <li key={i}>{step}</li>)}</ul>{t.materials.length > 0 && <small>Materials: {t.materials.join(', ')}</small>}</li>)}</ul></div>)}</details>) : <p>No old plans yet. The first regeneration will appear here.</p>}</div>}</div><div className="side-panel settings-panel"><div className="sidebar-heading"><RotateCcw size={20}/><h3>Garden data</h3></div><p>Saved in this browser, not synced across devices.</p><button className="text-button danger" onClick={() => setShowReset(s => !s)}><Trash2 size={15}/> {showReset ? 'Cancel reset' : 'Reset garden data'}</button>{showReset && <div className="reset-warning"><p>This removes every saved plan and diagnosis from this browser.</p><button className="btn btn-danger" onClick={clear}>Delete my garden</button></div>}</div>
    <div className="sidebar-footer"><Sparkles size={16}/> You've got this, gardener!</div></aside></div>
  </div></div>;
}
