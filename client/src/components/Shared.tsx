import { AlertCircle, ArrowRight, LoaderCircle, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Plant, StoredTask } from '../../../shared/src/contracts';

export function Eyebrow({ children }: { children: React.ReactNode }) { return <span className="eyebrow"><span className="eyebrow-dot"/> {children}</span>; }
export function Alert({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="alert" role="alert"><AlertCircle size={20}/><div><p>{message}</p>{onRetry && <button className="text-button" onClick={onRetry}>Try again <ArrowRight size={15}/></button>}</div></div>; }
export function Busy({ title, description }: { title: string; description?: string }) { return <div className="busy" role="status" aria-live="polite"><LoaderCircle className="spin" size={25}/><div><strong>{title}</strong>{description && <p>{description}</p>}</div></div>; }
export function Empty({ title, description, link = '/setup', linkText = 'Start my garden' }: { title: string; description: string; link?: string; linkText?: string }) { return <div className="empty-state"><div className="empty-art">✳</div><h2>{title}</h2><p>{description}</p><Link to={link} className="btn btn-primary">{linkText}<MoveUpRight size={17}/></Link></div>; }
export function PlantCard({ plant, index, selected, onSelect }: { plant: Plant; index: number; selected: boolean; onSelect: () => void }) {
  return <article className={`plant-card ${selected ? 'selected' : ''}`}>
    <div className={`plant-visual plant-visual-${index}`} aria-hidden="true"><span>{['🌿','🪴','🌻'][index]}</span><div className="plant-number">0{index+1}</div></div>
    <div className="plant-details"><div className="plant-meta"><span>{plant.beginnerSuitable ? 'Beginner friendly' : 'Some experience helps'}</span><span className="pill">{plant.careEffort}</span></div>
      <h3>{plant.name}</h3><p className="scientific">{plant.scientificName || 'Scientific name not supplied'}</p><p>{plant.suitabilityReason}</p>
      <div className="plant-stats"><div><span>LIGHT</span><strong>{plant.sunlight}</strong></div><div><span>SPACE</span><strong>{plant.space}</strong></div></div>
      <div className="plant-notes"><strong>Good to know</strong><ul>{plant.careNotes.map((n,i) => <li key={i}>{n}</li>)}</ul></div>
      <p className="regional"><strong>Seasonal note:</strong> {plant.regionalCaveat}</p>
      <button className={`btn ${selected ? 'btn-primary' : 'btn-secondary'} choose-btn`} onClick={onSelect} aria-pressed={selected}>{selected ? '✓ Selected plant' : 'Choose this plant'} <ArrowRight size={17}/></button>
    </div>
  </article>;
}
export function CompletionRing({ tasks }: { tasks: StoredTask[] }) {
  const done = tasks.filter(t => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return <div className="ring" style={{ background: `conic-gradient(#a4cf76 ${pct}%, rgba(255,255,255,.16) ${pct}% 100%)` }} role="img" aria-label={`${pct}% of tasks completed`}>
    <div className="ring-middle"><span>{pct}%</span><small>complete</small></div>
  </div>;
}
