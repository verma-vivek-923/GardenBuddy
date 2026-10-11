import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Leaf, ShieldAlert, Trash2 } from 'lucide-react';
import { diagnose } from '../lib/api';
import { saveDiagnosis } from '../lib/storage';
import { useCapabilities, useGarden } from '../lib/hooks';
import { Alert, Busy, Eyebrow } from '../components/Shared';
import type { z } from 'zod';
import { diagnosisSchema } from '../../../shared/src/contracts';

const MAX_IMAGE = 5 * 1024 * 1024;
type Result = z.infer<typeof diagnosisSchema>;
export function Diagnose() {
  const { caps, error: capabilityError } = useCapabilities(), garden = useGarden();
  const [file, setFile] = useState<File|null>(null), [preview, setPreview] = useState('');
  const [plantName, setPlantName] = useState(garden.profile?.selectedPlantName ?? '');
  const [symptoms, setSymptoms] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState<Result|null>(null);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(f?: File) {
    setError(''); setResult(null);
    if (!f) { setFile(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setFile(null); setError('Choose a JPEG, PNG or WebP image.'); return; }
    if (f.size > MAX_IMAGE) { setFile(null); setError('Choose an image smaller than 5 MB.'); return; }
    setFile(f);
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    if (!file) { setError('Choose a plant photo before submitting.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const result = await diagnose(file, plantName.trim(), symptoms.trim());
      setResult(result.diagnosis);
      try { saveDiagnosis(result.diagnosis, plantName.trim(), symptoms.trim()); }
      catch (ex) { setError(`${ex instanceof Error ? ex.message : 'Could not save results.'} Your diagnosis is still displayed below.`); }
    } catch (ex) { setError(ex instanceof Error ? ex.message : 'Could not analyze the photo.'); }
    finally { setBusy(false); }
  }
  return <div className="page-light"><div className="container diagnose-wrap"><Link className="back-link" to="/garden"><ArrowLeft size={17}/> Back to my garden</Link><div className="page-intro"><Eyebrow>YOUR PLANT CARE COMPANION</Eyebrow><h1>Let's take a <em>closer look.</em></h1><p>Noticing a change in your plant? A photo can help you explore possible causes, not confirm a disease.</p></div>
    {capabilityError && <Alert message={capabilityError}/>} {!caps?.diagnosis ? <div className="unavailable"><ShieldAlert size={32}/><h2>Photo diagnosis isn't available yet</h2><p>This feature requires a configured, compatible vision model that the operator has verified. We won't guess from a picture or pretend to analyze it.</p><Link to="/garden" className="btn btn-primary">Return to my garden <ArrowRight size={16}/></Link></div> : <div className="diagnose-grid"><div className="setup-panel"><div className="panel-title"><span className="panel-icon"><Camera size={24}/></span><div><h2>Show us your plant</h2><p>Clear, well-lit photos work best.</p></div></div><form onSubmit={submit}>
      <label htmlFor="diagnosis-photo" className={`upload-zone ${preview ? 'has-image' : ''}`}>{preview ? <img src={preview} alt="Preview of the selected plant photo"/> : <><ImagePlus size={35}/><strong>Choose a photo to upload</strong><span>JPG, PNG or WebP · Maximum 5 MB</span></>}</label>
      <input id="diagnosis-photo" className="visually-hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => choose(e.target.files?.[0])} />
      {file && <div className="chosen-file"><span>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</span><button type="button" className="text-button" onClick={() => { choose(); const input = document.getElementById('diagnosis-photo') as HTMLInputElement|null; if (input) input.value = ''; }}><Trash2 size={16}/> Remove</button></div>}
      <div className="form-group"><label htmlFor="plant-name">Plant name <span className="optional">(optional)</span></label><input id="plant-name" maxLength={120} placeholder="e.g. basil, mint, rose" value={plantName} onChange={e => setPlantName(e.target.value)}/></div><div className="form-group"><label htmlFor="symptoms">What have you noticed? <span className="optional">(optional)</span></label><textarea id="symptoms" maxLength={500} rows={4} placeholder="e.g. Leaves are turning yellow at the edges…" value={symptoms} onChange={e => setSymptoms(e.target.value)}/></div>
      {error && <Alert message={error}/>}<button className="btn btn-primary btn-block" type="submit" disabled={busy || !file}>{busy ? 'Looking at your plant…' : 'Analyze my plant'} <ArrowRight size={17}/></button><p className="form-fineprint">Your image goes to the configured AI provider. We save only the text result in this browser, never the image.</p></form></div>
      <aside className="setup-aside diagnosis-aside"><div className="aside-art">🪴</div><Eyebrow>A LITTLE ADVICE</Eyebrow><h3>Plants have their own stories.</h3><p>A photo is only one clue. Check watering, light, drainage, and local conditions before making changes.</p></aside></div>}
    {busy && <Busy title="Examining visible signs…" description="AI suggestions can be uncertain. Look for evidence before changing your care."/>}
    {result && <section className="diagnosis-result" aria-live="polite"><Eyebrow>YOUR PHOTO INSIGHTS</Eyebrow><h2>Here's what we <em>noticed.</em></h2><div className="result-grid"><article><h3>Visible observations</h3><ul>{result.observations.map((x,i) => <li key={i}>{x}</li>)}</ul></article><article><h3>Possible explanations</h3>{result.possibleCauses.map((c,i) => <div key={i} className="cause"><strong>{c.cause} <span className="pill">{c.likelihood}</span></strong><p>{c.reason}</p></div>)}</article><article><h3>Gentle next steps</h3><ol>{result.recommendations.map((x,i) => <li key={i}>{x}</li>)}</ol></article></div><div className="alert"><ShieldAlert size={22}/><div><strong>Important: this isn't a confirmed diagnosis.</strong><p>{result.uncertaintyNote}</p><p>{result.seekExpertHelpWhen}</p></div></div></section>}
    {garden.diagnoses.length > 0 && <section className="diagnosis-history"><Eyebrow>PAST OBSERVATIONS</Eyebrow><h2>Your plant notes</h2><div className="diagnosis-history-list">{garden.diagnoses.slice().reverse().map(d => <details key={d.id}><summary><Leaf size={17}/> {d.plantName || 'Plant photo'} <span>{new Date(d.createdAt).toLocaleDateString()}</span></summary><p>{d.observations.join(' · ')}</p><p><strong>Suggestions:</strong> {d.recommendations.join(' · ')}</p><p>{d.uncertaintyNote}</p></details>)}</div></section>}
  </div></div>;
}
