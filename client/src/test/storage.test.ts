// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activateGarden, activePlan, loadSnapshot, regeneratePlan, resetAll, storageKeys, toggleTask, updateTask } from '../lib/storage';
import type { Preferences } from '../../../shared/src/contracts';
const preferences: Preferences = { city:'Indore',space:'balcony',sunlight:'partial',experience:'beginner',goal:'herbs',dailyTimeMinutes:15 };
const response = {plan:{title:'Mint starter routine',generalNote:'Adjust for local conditions.',tasks:Array.from({length:7},(_,day)=>({id:`task-${day+1}`,day:day+1,title:`Task ${day+1}`,instructions:['Observe the plant carefully'],durationMinutes:10,materials:[]}))}};
const plant = {id:'mint',name:'Mint'};
let counter = 0;
beforeEach(() => { window.localStorage.clear(); counter=0; vi.stubGlobal('crypto',{ randomUUID: () => `unique-${++counter}` }); });

describe('defensive browser persistence', () => {
  it('detects malformed stored data without overwriting it', () => {
    window.localStorage.setItem(storageKeys.plans,'{broken');
    const s = loadSnapshot(); expect(s.warning).toContain('plans'); expect(s.plans).toEqual([]);
    expect(window.localStorage.getItem(storageKeys.plans)).toBe('{broken');
    expect(() => activateGarden(preferences,plant,response)).toThrow(/attention/);
  });
  it('atomically replaces plans on successful regeneration, preserves history and task completion', () => {
    const first = activateGarden(preferences,plant,response);
    toggleTask(first.id,'task-1');
    const progress = activePlan(loadSnapshot()); expect(progress?.tasks[0]?.completed).toBe(true);
    toggleTask(first.id,'task-1'); expect(activePlan(loadSnapshot())?.tasks[0]?.completed).toBe(false);
    updateTask(first.id,'task-2',{title:'Inspect soil carefully'});
    expect(activePlan(loadSnapshot())?.tasks[1]?.title).toBe('Inspect soil carefully');
    const next = regeneratePlan(response);
    const s = loadSnapshot(); expect(next.version).toBe(2);
    expect(activePlan(s)?.version).toBe(2);
    expect(s.plans).toHaveLength(2); expect(s.plans[0]?.status).toBe('archived');
    expect(s.plans[0]?.tasks[1]?.title).toBe('Inspect soil carefully');
  });
  it('keeps active plan intact if regeneration returns malformed seven-day data', () => {
    const first = activateGarden(preferences,plant,response);
    const before = window.localStorage.getItem(storageKeys.plans);
    expect(() => regeneratePlan({plan:{...response.plan,tasks:response.plan.tasks.slice(0,6)}})).toThrow();
    expect(window.localStorage.getItem(storageKeys.plans)).toBe(before);
    expect(activePlan(loadSnapshot())?.id).toBe(first.id);
  });
  it('keeps profile and task progress when user returns from the browser', () => {
    const first = activateGarden(preferences,plant,response);
    toggleTask(first.id,'task-3');
    const onReload = loadSnapshot(); expect(onReload.profile?.selectedPlantName).toBe('Mint');
    expect(activePlan(onReload)?.tasks[2]?.completedAt).toBeTruthy();
    resetAll(); expect(loadSnapshot().profile).toBeNull();
  });
});
