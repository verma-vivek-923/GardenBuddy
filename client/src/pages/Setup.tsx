import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, CircleCheck, Leaf, MapPin, Sparkles, Sun, Timer } from 'lucide-react';
import { preferencesSchema, type Plant, type Preferences } from '../../../shared/src/contracts';
import { recommend, generatePlan } from '../lib/api';
import { activateGarden, activePlan, saveDraft } from '../lib/storage';
import { useGarden } from '../lib/hooks';
import { Alert, Busy, Eyebrow, PlantCard } from '../components/Shared';

const defaults: Preferences = { city: '', space: 'balcony', sunlight: 'partial', experience: 'beginner', goal: 'herbs', dailyTimeMinutes: 15 };
const space = [{value:'indoor',label:'Indoor pots',emoji:'🪴'},{value:'balcony',label:'Balcony',emoji:'🌤️'},{value:'terrace',label:'Terrace / rooftop',emoji:'🏡'},{value:'backyard',label:'Backyard / garden',emoji:'🌳'}];
const sunlight = [{value:'low',label:'Low / shade'},{value:'partial',label:'Partial sunlight'},{value:'full',label:'Full sunlight'},{value:'unsure',label:'Not sure yet'}];
const experience = [{value:'beginner',label:'Just starting'},{value:'intermediate',label:'Know a little'},{value:'experienced',label:'Experienced'}];
const goals = [{value:'herbs',label:'Fresh herbs'},{value:'vegetables',label:'Vegetables'},{value:'flowers',label:'Colorful flowers'},{value:'ornamental',label:'Leafy greens'},{value:'general',label:'Just exploring'}];
const minutes: Preferences['dailyTimeMinutes'][] = [5,10,15,30,45];

export function Setup() {
  const current = useGarden(), navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences>(() => current.settings.draftPreferences ?? current.profile?.preferences ?? defaults);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState<'recommend'|'plan'|null>(null);
  const [problem, setProblem] = useState('');
  function field<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences(p => ({...p,[key]:value}));
    setErrors(e => ({...e,[key]:''}));
    if (plants) { setPlants(null); setChosen(null); }
  }
  function validate(): boolean {
    const result = preferencesSchema.safeParse(preferences);
    if (result.success) { setErrors({}); return true; }
    const next: Record<string,string> = {};
    for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
    setErrors(next); return false;
  }
  async function getPlants(e?: FormEvent) {
    e?.preventDefault();
    if (!validate() || busy) return;
    setBusy('recommend'); setProblem(''); setPlants(null); setChosen(null);
    try { const result = await recommend(preferences); setPlants(result.recommendations); try { saveDraft(preferences); } catch (ex) { setProblem(ex instanceof Error ? `${ex.message} You can still review these suggestions.` : "Preferences could not be stored."); } }
    catch (err) { setProblem(err instanceof Error ? err.message : 'Could not find plants. Try again.'); }
    finally { setBusy(null); }
  }
  async function startGarden() {
    const plant = plants?.find(p => p.id === chosen);
    if (!plant || busy) return;
    const old = activePlan(current);
    if (old && !window.confirm(`Create a new plan for ${plant.name}? Your current garden and task progress will move to plan history; unfinished tasks will not carry over.`)) return;
    setBusy('plan'); setProblem('');
    try {
      const candidate = await generatePlan(preferences, { id: plant.id, name: plant.name });
      activateGarden(preferences, plant, candidate);
      navigate('/garden');
    } catch (err) { setProblem(err instanceof Error ? err.message : 'Unable to create your plan. Your existing garden is safe.'); }
    finally { setBusy(null); }
  }
  return <div className="page-light"><section className="container setup-wrap"><div className="page-intro"><Link className="back-link" to="/"><ArrowLeft size={17}/> Back to home</Link><Eyebrow>LET'S PLANT THE SEED</Eyebrow><h1>Your garden starts <em>right here.</em></h1><p>Answer a few quick questions. We'll help you find a plant that's happy in your space and your schedule.</p></div>
    <div className="progress-steps" aria-label="Garden setup progress"><span className="current"><b>1</b> Your space</span><span className={plants ? 'current' : ''}><b>2</b> Choose your plant</span><span><b>3</b> Grow together</span></div>
    <div className="setup-layout"><div className="setup-panel">
      <div className="panel-title"><span className="panel-icon"><Leaf size={24}/></span><div><h2>Tell us about your space</h2><p>No perfect answers needed. We'll work with what you have.</p></div></div>
      <form onSubmit={getPlants} noValidate>
        <div className="form-group"><label htmlFor="city"><MapPin size={17}/> Where are you growing?</label><p className="hint">Your city or approximate region helps us suggest plants, not real-time weather.</p><input id="city" name="city" autoComplete="address-level2" placeholder="e.g. Indore, Madhya Pradesh" value={preferences.city} maxLength={100} aria-invalid={!!errors.city} aria-describedby={errors.city ? 'city-error' : undefined} onChange={e => field('city',e.target.value)}/>{errors.city && <small id="city-error" className="field-error">{errors.city}</small>}</div>
        <fieldset className="form-group"><legend><Leaf size={17}/> Your growing space</legend><p className="hint">Think of where you'll actually keep the plant.</p><div className="space-grid">{space.map(o => <label className={`option-card ${preferences.space === o.value ? 'active' : ''}`} key={o.value}><input type="radio" name="space" value={o.value} checked={preferences.space === o.value} onChange={() => field('space',o.value as Preferences['space'])}/><span className="option-emoji">{o.emoji}</span><span>{o.label}</span>{preferences.space === o.value && <CircleCheck size={17}/>}</label>)}</div>{errors.space && <small className="field-error">{errors.space}</small>}</fieldset>
        <fieldset className="form-group"><legend><Sun size={17}/> How much sunlight?</legend><p className="hint">Estimate the direct sunlight reaching your growing space.</p><div className="choice-grid">{sunlight.map(o => <label className={`choice ${preferences.sunlight === o.value ? 'active' : ''}`} key={o.value}><input type="radio" name="sunlight" value={o.value} checked={preferences.sunlight === o.value} onChange={() => field('sunlight',o.value as Preferences['sunlight'])}/>{o.label}</label>)}</div>{errors.sunlight && <small className="field-error">{errors.sunlight}</small>}</fieldset>
        <div className="form-row"><div className="form-group"><label htmlFor="experience">Your experience</label><select id="experience" value={preferences.experience} onChange={e => field('experience',e.target.value as Preferences['experience'])}>{experience.map(o => <option value={o.value} key={o.value}>{o.label}</option>)}</select>{errors.experience && <small className="field-error">{errors.experience}</small>}</div><div className="form-group"><label htmlFor="goal">What would you like to grow?</label><select id="goal" value={preferences.goal} onChange={e => field('goal',e.target.value as Preferences['goal'])}>{goals.map(o => <option value={o.value} key={o.value}>{o.label}</option>)}</select>{errors.goal && <small className="field-error">{errors.goal}</small>}</div></div>
        <fieldset className="form-group last-field"><legend><Timer size={17}/> Your daily time budget</legend><p className="hint">Even five minutes a day can make a difference.</p><div className="choice-grid time-choices">{minutes.map(n => <label className={`choice ${preferences.dailyTimeMinutes === n ? 'active' : ''}`} key={n}><input type="radio" name="dailyTimeMinutes" value={n} checked={preferences.dailyTimeMinutes === n} onChange={() => field('dailyTimeMinutes',n)}/>{n} min</label>)}</div>{errors.dailyTimeMinutes && <small className="field-error">{errors.dailyTimeMinutes}</small>}</fieldset>
        {problem && <Alert message={problem} onRetry={plants ? startGarden : () => void getPlants()}/>}
        <button className="btn btn-primary btn-block btn-large" type="submit" disabled={!!busy}>{busy === 'recommend' ? 'Finding your plants…' : plants ? 'Find new suggestions' : 'Find my perfect plants'}<ArrowRight size={18}/></button>
        <p className="form-fineprint">Personalized suggestions use AI and may need seasonal adjustments.</p>
      </form>
    </div><aside className="setup-aside"><div className="aside-art">🌿</div><Eyebrow>GOOD TO KNOW</Eyebrow><h3>Every space has potential.</h3><p>You don't need a big backyard or fancy tools. All you need is the right plant and a little consistency.</p><div className="aside-divider"/><p className="aside-small"><Sparkles size={17}/> We'll create a manageable care routine around your time.</p></aside></div>
    {busy === 'recommend' && <Busy title="Finding plants that fit your life…" description="Considering sunlight, space, goals and care time."/>}
    {plants && <section className="results" id="plant-results" aria-live="polite"><div className="results-header"><div><Eyebrow>CURATED JUST FOR YOU</Eyebrow><h2>Meet your <em>three matches.</em></h2><p>Every garden has a beginning. Which one feels like yours?</p></div><button className="text-button" disabled={!!busy} onClick={() => { setPlants(null); setChosen(null); setProblem(''); document.getElementById('city')?.focus(); }}>Edit preferences <ArrowRight size={17}/></button></div>
      <div className="plants-grid">{plants.map((plant, index) => <PlantCard key={plant.id} plant={plant} index={index} selected={chosen === plant.id} onSelect={() => { setChosen(plant.id); setProblem(''); }}/>)}</div>
      {chosen && <div className="selected-banner"><span><CircleCheck size={22}/> <strong>{plants.find(p => p.id === chosen)?.name}</strong> is your pick. Let's make a plan together.</span><button className="btn btn-primary" disabled={!!busy} onClick={startGarden}>{busy === 'plan' ? 'Growing your plan…' : 'Create my 7-day plan'}<ArrowUpRight size={17}/></button></div>}
      {busy === 'plan' && <Busy title="Crafting your 7-day care routine…" description="The plan is saved only if all seven days are complete."/>}
    </section>}
  </section></div>;
}
