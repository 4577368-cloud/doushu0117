import { BaziChart, UserProfile } from '../types';
import { calculateBazi } from '../services/baziService';

export function normalizeBirthDate(birthDate: string): string {
    let safe = birthDate || '';
    if (safe.length === 8 && !safe.includes('-')) {
        safe = `${safe.slice(0, 4)}-${safe.slice(4, 6)}-${safe.slice(6, 8)}`;
    }
    return safe;
}

export function loadChartFromProfile(profile: UserProfile): BaziChart {
    return calculateBazi({ ...profile, birthDate: normalizeBirthDate(profile.birthDate) });
}
