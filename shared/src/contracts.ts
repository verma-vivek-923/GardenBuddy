import { z } from 'zod';

export const preferencesSchema = z.object({
  city: z.string().trim().min(2, 'Enter your city or region').max(100),
  space: z.enum(['indoor', 'balcony', 'terrace', 'backyard']),
  sunlight: z.enum(['low', 'partial', 'full', 'unsure']),
  experience: z.enum(['beginner', 'intermediate', 'experienced']),
  goal: z.enum(['herbs', 'vegetables', 'flowers', 'ornamental', 'general']),
  dailyTimeMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30), z.literal(45)])
}).strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export const recommendationsRequestSchema = z.object({ preferences: preferencesSchema }).strict();
const usefulString = z.string().trim().min(1).max(700);
const shortString = z.string().trim().min(1).max(120);
const stringList = z.array(usefulString).min(1).max(8);
export const plantSchema = z.object({
  id: shortString, name: shortString, scientificName: z.string().trim().max(150),
  suitabilityReason: usefulString, sunlight: shortString, space: shortString,
  careEffort: shortString, beginnerSuitable: z.boolean(),
  careNotes: stringList, regionalCaveat: usefulString
});
export type Plant = z.infer<typeof plantSchema>;
export const recommendationsResponseSchema = z.object({ recommendations: z.array(plantSchema).length(3) })
  .superRefine(({ recommendations }, ctx) => {
    for (const field of ['id', 'name'] as const) {
      const unique = new Set(recommendations.map(p => p[field].trim().toLowerCase()));
      if (unique.size !== 3) ctx.addIssue({ code: 'custom', message: `Plant ${field}s must be distinct` });
    }
  });
export const selectedPlantSchema = z.object({ id: shortString, name: shortString }).strict();
export const planRequestSchema = z.object({ preferences: preferencesSchema, selectedPlant: selectedPlantSchema }).strict();
export const taskSchema = z.object({
  id: shortString, day: z.number().int().min(1).max(7), title: shortString,
  instructions: stringList, durationMinutes: z.number().int().min(1).max(90),
  materials: z.array(shortString).max(12)
});
export const planResponseSchema = z.object({
  plan: z.object({ title: shortString, generalNote: usefulString, tasks: z.array(taskSchema).min(7).max(35) })
    .superRefine((plan, ctx) => {
      const days = new Set(plan.tasks.map(t => t.day));
      if (days.size !== 7) ctx.addIssue({ code: 'custom', message: 'Tasks must cover days 1 to 7' });
      const ids = plan.tasks.map(t => t.id);
      if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Duplicate task IDs' });
    })
});
export const diagnosisSchema = z.object({
  plantName: z.string().trim().max(120).optional(),
  observations: stringList,
  possibleCauses: z.array(z.object({ cause: shortString, likelihood: z.enum(['possible', 'likely', 'uncertain']), reason: usefulString })).min(1).max(6),
  recommendations: stringList, uncertaintyNote: usefulString, seekExpertHelpWhen: usefulString
});
export const diagnosisResponseSchema = z.object({ diagnosis: diagnosisSchema });

const isoDate = z.string().datetime({ offset: true });
export const profileSchema = z.object({
  id: shortString, name: shortString, preferences: preferencesSchema,
  selectedPlantId: shortString, selectedPlantName: shortString,
  createdAt: isoDate, updatedAt: isoDate
});
export type GardenProfile = z.infer<typeof profileSchema>;
export const storedTaskSchema = taskSchema.extend({ completed: z.boolean(), completedAt: isoDate.nullable() })
  .refine(t => t.completed === (t.completedAt !== null), 'Completion timestamp mismatch');
export type StoredTask = z.infer<typeof storedTaskSchema>;
export const storedPlanSchema = z.object({
  id: shortString, gardenId: shortString, plantId: shortString, plantName: shortString,
  version: z.number().int().min(1), status: z.enum(['active', 'archived']), createdAt: isoDate,
  title: shortString, generalNote: usefulString, tasks: z.array(storedTaskSchema).min(7).max(35)
}).superRefine((plan, ctx) => {
  if (new Set(plan.tasks.map(t => t.day)).size !== 7) ctx.addIssue({ code: 'custom', message: 'Missing plan days' });
  if (new Set(plan.tasks.map(t => t.id)).size !== plan.tasks.length) ctx.addIssue({ code: 'custom', message: 'Duplicate tasks' });
});
export type StoredPlan = z.infer<typeof storedPlanSchema>;
export const storedPlansSchema = z.array(storedPlanSchema).max(100).superRefine((plans, ctx) => {
  const active = plans.filter(p => p.status === 'active');
  if (active.length > 1) ctx.addIssue({ code: 'custom', message: 'Multiple active plans' });
  const uniqueVersions = new Set(plans.map(p => `${p.gardenId}:${p.version}`));
  if (uniqueVersions.size !== plans.length) ctx.addIssue({ code: 'custom', message: 'Duplicate versions' });
});
export const diagnosisRecordSchema = diagnosisSchema.extend({
  id: shortString, gardenId: shortString.nullable(), symptoms: z.string().max(500),
  createdAt: isoDate
});
export type DiagnosisRecord = z.infer<typeof diagnosisRecordSchema>;
export const diagnosesSchema = z.array(diagnosisRecordSchema).max(100);
export const settingsSchema = z.object({ preferredName: z.string().max(80).optional() });
export type Settings = z.infer<typeof settingsSchema>;
