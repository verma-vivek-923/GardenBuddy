import {
  recommendationsResponseSchema, planResponseSchema, diagnosisResponseSchema,
  type Plant, type Preferences
} from '../../../shared/src/contracts';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export class ClientApiError extends Error { constructor(public code: string, message: string) { super(message); } }
async function send(path: string, options: RequestInit = {}, timeout = 30000): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${BASE}/api${path}`, { ...options, signal: controller.signal });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const p = payload as { error?: { code?: string; message?: string } } | null;
      throw new ClientApiError(p?.error?.code || 'REQUEST_FAILED', p?.error?.message || `Request failed (${response.status}).`);
    }
    return payload;
  } catch (error) {
    if (error instanceof ClientApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ClientApiError('TIMEOUT', 'Request timed out. Please try again.');
    throw new ClientApiError('NETWORK_ERROR', 'Could not reach the GardenBuddy server. Check that the API is running.');
  } finally { clearTimeout(t); }
}
const json = (data: object): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export async function getCapabilities(): Promise<{ recommendations: boolean; diagnosis: boolean }> {
  const result = await send('/capabilities');
  if (typeof result !== 'object' || result === null || !('diagnosis' in result) || !('recommendations' in result)) throw new ClientApiError('BAD_RESPONSE','Invalid capability response.');
  return result as { recommendations: boolean; diagnosis: boolean };
}
export async function recommend(preferences: Preferences) {
  const parsed = recommendationsResponseSchema.safeParse(await send('/recommendations', json({ preferences })));
  if (!parsed.success) throw new ClientApiError('BAD_RESPONSE', 'AI returned incomplete plant suggestions. Please try again.');
  return parsed.data;
}
export async function generatePlan(preferences: Preferences, selectedPlant: Pick<Plant, 'id'|'name'>) {
  const parsed = planResponseSchema.safeParse(await send('/plans', json({ preferences, selectedPlant })));
  if (!parsed.success) throw new ClientApiError('BAD_RESPONSE', 'AI returned an incomplete care plan. Your saved garden is unchanged.');
  return parsed.data;
}
export async function diagnose(image: File, plantName: string, symptoms: string) {
  const data = new FormData(); data.append('image', image); data.append('plantName', plantName); data.append('symptoms', symptoms);
  const parsed = diagnosisResponseSchema.safeParse(await send('/diagnose', { method: 'POST', body: data }, 35000));
  if (!parsed.success) throw new ClientApiError('BAD_RESPONSE', 'AI returned an incomplete photo result. Please try again.');
  return parsed.data;
}
