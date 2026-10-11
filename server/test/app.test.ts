import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { GroqProvider, ApiError, type AiProvider } from '../src/ai';
import type { Preferences } from '../../shared/src/contracts';
const prefs: Preferences = { city: 'Indore', space: 'balcony', sunlight: 'partial', experience: 'beginner', goal: 'herbs', dailyTimeMinutes: 15 };
const rec = { recommendations: ['Mint','Basil','Coriander'].map((name,i) => ({id:`plant-${i+1}`,name,scientificName:'Mentha',suitabilityReason:'Container-friendly with a little care.',sunlight:'Partial light',space:'Pot with drainage',careEffort:'Low',beginnerSuitable:true,careNotes:['Check moisture before watering'],regionalCaveat:'Check seasonal conditions locally.'})) };
const plan = { plan: { title:'7 days with Mint',generalNote:'Adjust for local growing conditions.',tasks: Array.from({length:7},(_,i) => ({id:`task-${i+1}`,day:i+1,title:`Care task ${i+1}`,instructions:['Inspect growing medium','Check drainage'],durationMinutes:10,materials:[]})) } };
const diagnosis = { diagnosis: {observations:['Yellowing at one edge'],possibleCauses:[{cause:'Watering stress',likelihood:'possible' as const,reason:'Multiple causes can produce yellow leaves'}],recommendations:['Check moisture and drainage'],uncertaintyNote:'Not a confirmed diagnosis.',seekExpertHelpWhen:'Decline accelerates.'} };
const stub: AiProvider = { recommendations: async () => rec, plan: async () => plan, diagnose: async () => diagnosis };
const env = { GROQ_API_KEY:'test-key',GROQ_TEXT_MODEL:'test-text', GROQ_VISION_MODEL:'test-vision', ENABLE_VISION_DIAGNOSIS:'true', GROQ_VISION_VERIFIED:'true', CLIENT_ORIGIN:'http://localhost:5173' };
const api = createApp({ai:stub,env});

describe('API contract', () => {
  it('health never reveals configuration', async () => {
    const response = await request(api).get('/api/health');
    expect(response.status).toBe(200); expect(response.body).toEqual({status:'ok'});
  });
  it('validates preferences and returns three distinct plants', async () => {
    const ok = await request(api).post('/api/recommendations').send({preferences:prefs});
    expect(ok.status).toBe(200); expect(ok.body.recommendations).toHaveLength(3);
    const bad = await request(api).post('/api/recommendations').send({preferences:{...prefs,dailyTimeMinutes:99}});
    expect(bad.status).toBe(400); expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('requires seven unique days and unique task IDs from provider', async () => {
    const ok = await request(api).post('/api/plans').send({preferences:prefs,selectedPlant:{id:'plant-1',name:'Mint'}});
    expect(ok.status).toBe(200); expect(new Set(ok.body.plan.tasks.map((t:{day:number}) => t.day)).size).toBe(7);
    const broken: AiProvider = { ...stub, plan: async () => ({...plan,plan:{...plan.plan,tasks:plan.plan.tasks.slice(0,6)}}) };
    const res = await request(createApp({ai:broken,env})).post('/api/plans').send({preferences:prefs,selectedPlant:{id:'plant-1',name:'Mint'}});
    expect(res.status).toBe(502); expect(res.body.error.code).toBe('INVALID_AI_RESPONSE');
  });
  it('rejects malformed JSON', async () => {
    const r = await request(api).post('/api/recommendations').set('Content-Type','application/json').send('{bad-json');
    expect(r.status).toBe(400); expect(r.body.error.code).toBe('INVALID_JSON');
  });
  it('rejects missing text key', async () => {
    const groq = new GroqProvider({});
    const r = await request(createApp({ai:groq,env:{}})).post('/api/recommendations').send({preferences:prefs});
    expect(r.status).toBe(503); expect(r.body.error.code).toBe('AI_NOT_CONFIGURED');
  });
  it('rejects wrong images, unsupported mime and upload size', async () => {
    const bad = await request(api).post('/api/diagnose').attach('image',Buffer.from('not an image'),{filename:'leaf.png',contentType:'image/png'});
    expect(bad.status).toBe(415); expect(bad.body.error.code).toBe('INVALID_IMAGE_CONTENT');
    const mime = await request(api).post('/api/diagnose').attach('image',Buffer.from('hello'),{filename:'x.txt',contentType:'text/plain'});
    expect(mime.status).toBe(415);
    const big = await request(createApp({ai:stub,env:{...env,MAX_IMAGE_SIZE_MB:'1'}})).post('/api/diagnose').attach('image',Buffer.alloc(1024*1024+1),{filename:'leaf.png',contentType:'image/png'});
    expect(big.status).toBe(413);
  });
  it('prevents diagnosis unless explicitly opted into verified vision', async () => {
    const r = await request(createApp({ai:stub,env:{...env,GROQ_VISION_VERIFIED:'false'}})).post('/api/diagnose');
    expect(r.status).toBe(503); expect(r.body.error.code).toBe('VISION_UNAVAILABLE');
  });
});

describe('Groq provider error mapping', () => {
  it('does not send unvalidated model JSON and retries at most once', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({choices:[{message:{content:'{"recommendations":[]}'}}]}),{status:200}));
    const service = new GroqProvider(env, fetcher as typeof fetch);
    await expect(service.recommendations(prefs)).rejects.toMatchObject({status:502,code:'INVALID_AI_RESPONSE'} satisfies Partial<ApiError>);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('maps network/timeout failure to safe 503 after bounded retry', async () => {
    const fetcher = vi.fn(async () => { throw new DOMException('aborted','TimeoutError'); });
    const service = new GroqProvider(env, fetcher as typeof fetch);
    await expect(service.plan(prefs,{id:'plant-1',name:'Mint'})).rejects.toMatchObject({status:503,code:'AI_UNAVAILABLE'});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
