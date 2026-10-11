import { useEffect, useState } from 'react';
import { loadSnapshot, type Snapshot } from './storage';
import { getCapabilities } from './api';
export function useGarden(): Snapshot {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => loadSnapshot());
  useEffect(() => {
    const refresh = () => setSnapshot(loadSnapshot());
    window.addEventListener('gardenbuddy:change', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('gardenbuddy:change', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  return snapshot;
}
let capabilityCache: { recommendations: boolean; diagnosis: boolean } | null = null;
export function useCapabilities() {
  const [caps, setCaps] = useState(capabilityCache);
  const [error, setError] = useState('');
  useEffect(() => {
    let valid = true;
    getCapabilities().then(result => { capabilityCache = result; if (valid) setCaps(result); })
      .catch(() => { if (valid) setError('API is unavailable. Start the backend to use AI features.'); });
    return () => { valid = false; };
  }, []);
  return { caps, error };
}
