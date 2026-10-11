import { z } from 'zod';
import {
  diagnosesSchema, diagnosisRecordSchema, planResponseSchema, preferencesSchema,
  profileSchema, settingsSchema, storedPlansSchema, type DiagnosisRecord, type GardenProfile,
  type Preferences, type Settings, type StoredPlan, type StoredTask
} from '../../../shared/src/contracts';

const PREFIX = 'gardenbuddy:v1:';
const keys = { profile: `${PREFIX}profile`, plans: `${PREFIX}plans`, diagnoses: `${PREFIX}diagnoses`, settings: `${PREFIX}settings` } as const;
const extendedSettings = settingsSchema.extend({ draftPreferences: preferencesSchema.optional() });
type GardenSettings = Settings & { draftPreferences?: Preferences };
export type Snapshot = { profile: GardenProfile | null; plans: StoredPlan[]; diagnoses: DiagnosisRecord[]; settings: GardenSettings; warning: string | null };
export class StorageError extends Error { constructor(message = 'Browser storage is unavailable or full. Your change was not saved.') { super(message); } }
function storage(): Storage { if (typeof window === 'undefined' || !window.localStorage) throw new StorageError(); return window.localStorage; }
function read<T>(key: string, schema: z.ZodType<T>, fallback: T, warnings: string[]): T {
  try {
    const value = storage().getItem(key);
    if (value === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(value) as unknown);
    if (parsed.success) return parsed.data;
    warnings.push(`Some saved ${key.split(':').at(-1)} data is incompatible. It was not changed.`);
  } catch { warnings.push(`Unable to read saved ${key.split(':').at(-1)} data.`); }
  return fallback;
}
export function loadSnapshot(): Snapshot {
  const warnings: string[] = [];
  const profile = read(keys.profile, profileSchema.nullable(), null, warnings);
  const plans = read(keys.plans, storedPlansSchema, [], warnings);
  const diagnoses = read(keys.diagnoses, diagnosesSchema, [], warnings);
  const settings = read(keys.settings, extendedSettings, {}, warnings);
  if (profile && plans.some(p => p.status === 'active' &&
      (p.gardenId !== profile.id || p.plantId !== profile.selectedPlantId || p.plantName !== profile.selectedPlantName))) {
    warnings.push('The saved active plan does not match the selected plant.');
  }
  return { profile, plans, diagnoses, settings, warning: warnings.length ? warnings.join(' ') : null };
}
export function activePlan(s: Snapshot): StoredPlan | null {
  return s.plans.find(p => p.status === 'active' && s.profile && p.gardenId === s.profile.id &&
    p.plantId === s.profile.selectedPlantId && p.plantName === s.profile.selectedPlantName) ?? null;
}
function notify() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('gardenbuddy:change')); }
function save(key: string, value: unknown) {
  try { storage().setItem(key, JSON.stringify(value)); notify(); }
  catch { throw new StorageError(); }
}
function assertWritable(snapshot: Snapshot) {
  if (snapshot.warning) throw new StorageError('Saved data needs attention. Reset local data before making changes: ' + snapshot.warning);
}
export function saveDraft(preferences: Preferences) {
  preferencesSchema.parse(preferences);
  const s = loadSnapshot(); assertWritable(s);
  save(keys.settings, extendedSettings.parse({ ...s.settings, draftPreferences: preferences }));
}
function recordPlan(profile: GardenProfile, response: z.infer<typeof planResponseSchema>, version: number): StoredPlan {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), gardenId: profile.id, plantId: profile.selectedPlantId,
    plantName: profile.selectedPlantName, version, status: 'active', createdAt: now,
    title: response.plan.title, generalNote: response.plan.generalNote,
    tasks: response.plan.tasks.map(t => ({ ...t, completed: false, completedAt: null }))
  };
}
/** Commit plan first, then profile, with a best-effort rollback on a failed second write. */
export function activateGarden(preferences: Preferences, plant: { id: string; name: string }, candidate: unknown): StoredPlan {
  const validated = planResponseSchema.parse(candidate);
  const s = loadSnapshot(); assertWritable(s);
  const now = new Date().toISOString();
  const profile = profileSchema.parse({
    id: s.profile?.id ?? crypto.randomUUID(), name: `My ${preferences.space === 'indoor' ? 'Indoor' : preferences.space === 'backyard' ? 'Backyard' : preferences.space === 'terrace' ? 'Terrace' : 'Balcony'} Garden`,
    preferences, selectedPlantId: plant.id, selectedPlantName: plant.name,
    createdAt: s.profile?.createdAt ?? now, updatedAt: now
  });
  const newPlan = recordPlan(profile, validated, Math.max(0, ...s.plans.map(p => p.version)) + 1);
  const plans = storedPlansSchema.parse([...s.plans.map(p => p.status === 'active' ? { ...p, status: 'archived' as const } : p), newPlan]);
  const oldProfile = JSON.stringify(s.profile);
  const oldPlans = JSON.stringify(s.plans);
  try {
    storage().setItem(keys.plans, JSON.stringify(plans));
    storage().setItem(keys.profile, JSON.stringify(profile));
    notify();
    return newPlan;
  } catch {
    try { storage().setItem(keys.plans, oldPlans); storage().setItem(keys.profile, oldProfile); } catch { /* Best effort; warn user. */ }
    notify();
    throw new StorageError('Could not save your new garden. Existing data was restored where possible.');
  }
}
export function regeneratePlan(candidate: unknown): StoredPlan {
  const validated = planResponseSchema.parse(candidate);
  const s = loadSnapshot(); assertWritable(s);
  const old = activePlan(s);
  if (!old || !s.profile) throw new StorageError('No active garden plan found.');
  const next = recordPlan(s.profile, validated, Math.max(...s.plans.map(p => p.version)) + 1);
  // One localStorage write atomically replaces the plan history; errors leave old plan intact.
  const plans = storedPlansSchema.parse([...s.plans.map(p => p.id === old.id ? { ...p, status: 'archived' as const } : p), next]);
  save(keys.plans, plans);
  return next;
}
export function updateTask(planId: string, taskId: string, patch: Partial<Pick<StoredTask,'title'|'instructions'|'durationMinutes'|'materials'|'completed'|'completedAt'>>) {
  const s = loadSnapshot(); assertWritable(s);
  const plan = activePlan(s);
  if (!plan || plan.id !== planId) throw new StorageError('This plan is no longer active. Refresh and try again.');
  const target = plan.tasks.find(t => t.id === taskId);
  if (!target) throw new StorageError('Task was not found.');
  const changed = { ...target, ...patch };
  const next = storedPlansSchema.parse(s.plans.map(p => p.id !== planId ? p :
    { ...p, tasks: p.tasks.map(t => t.id === taskId ? changed : t) }));
  save(keys.plans, next);
}
export function toggleTask(planId: string, taskId: string) {
  const s = loadSnapshot(), plan = activePlan(s);
  if (!plan || plan.id !== planId) throw new StorageError('Active plan not found.');
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) throw new StorageError('Task not found.');
  updateTask(planId, taskId, { completed: !task.completed, completedAt: task.completed ? null : new Date().toISOString() });
}
export function saveDiagnosis(data: unknown, plantName: string, symptoms: string) {
  const s = loadSnapshot(); assertWritable(s);
  const record = diagnosisRecordSchema.parse({ ...data as object, id: crypto.randomUUID(), gardenId: s.profile?.id ?? null,
    plantName, symptoms, createdAt: new Date().toISOString() });
  save(keys.diagnoses, diagnosesSchema.parse([...s.diagnoses, record].slice(-100)));
}
export function resetAll() {
  try { const st = storage(); Object.values(keys).forEach(key => st.removeItem(key)); notify(); }
  catch { throw new StorageError('Unable to clear browser data. Check your browser settings.'); }
}
export { keys as storageKeys };
