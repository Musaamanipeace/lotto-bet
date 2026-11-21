import { type CardsState } from './market-cards.ts';
import type { Bookmaker } from './types.ts';
import { STORAGE_KEYS, scopedStorageKey } from './client-storage.ts';

export type FilterTemplate = {
  id: string;
  name: string;
  description?: string;
  bookmaker: Bookmaker;
  withinHours: number | null;
  leagues: string[];
  cards: CardsState;
  userId?: string | null;
  createdAt: number;
  isDefault?: boolean;
};

export const DEFAULT_TEMPLATES: FilterTemplate[] = [
  {
    id: 'tpl-safe-acca',
    name: 'Safe Accumulator',
    description: 'Double chance & low-odds home wins for building safe high-probability slips.',
    bookmaker: 'sportybet',
    withinHours: null,
    leagues: [],
    isDefault: true,
    createdAt: 1700000000000,
    cards: {
      dc: { on: true, low: 1.10, high: 1.45, subs: ['1X', 'X2'] },
      '1x2': { on: true, low: 1.20, high: 1.55, subs: ['home'] },
      over: { on: false, low: 1.15, high: 2.10, subs: ['1.5'] },
      under: { on: false, low: 1.15, high: 1.70, subs: ['4.5'] },
      btts: { on: false, low: 1.50, high: 2.20, subs: ['yes'] },
    },
  },
  {
    id: 'tpl-goal-feast',
    name: 'Goal Feast (Over 1.5 / 2.5)',
    description: 'Target games with high offensive expected value and over 1.5 or 2.5 goals.',
    bookmaker: 'sportybet',
    withinHours: null,
    leagues: [],
    isDefault: true,
    createdAt: 1700000001000,
    cards: {
      dc: { on: false, low: 1.05, high: 1.50, subs: ['1X', '12', 'X2'] },
      '1x2': { on: false, low: 1.20, high: 3.50, subs: ['home', 'draw', 'away'] },
      over: { on: true, low: 1.22, high: 1.95, subs: ['1.5', '2.5'] },
      under: { on: false, low: 1.10, high: 1.60, subs: ['3.5'] },
      btts: { on: false, low: 1.50, high: 2.20, subs: ['yes'] },
    },
  },
  {
    id: 'tpl-tight-defense',
    name: 'Tight Defense (Under 3.5 / 4.5)',
    description: 'Low-scoring encounters and solid defensive ceilings.',
    bookmaker: 'sportybet',
    withinHours: null,
    leagues: [],
    isDefault: true,
    createdAt: 1700000002000,
    cards: {
      dc: { on: false, low: 1.05, high: 1.50, subs: ['1X', '12', 'X2'] },
      '1x2': { on: false, low: 1.20, high: 3.50, subs: ['home', 'draw', 'away'] },
      over: { on: false, low: 1.20, high: 2.20, subs: ['1.5'] },
      under: { on: true, low: 1.12, high: 1.65, subs: ['3.5', '4.5'] },
      btts: { on: false, low: 1.50, high: 2.20, subs: ['no'] },
    },
  },
  {
    id: 'tpl-btts-action',
    name: 'Both Teams to Score (GG)',
    description: 'Matches where both sides are priced to score.',
    bookmaker: 'sportybet',
    withinHours: null,
    leagues: [],
    isDefault: true,
    createdAt: 1700000003000,
    cards: {
      dc: { on: false, low: 1.05, high: 1.50, subs: ['1X', '12', 'X2'] },
      '1x2': { on: false, low: 1.20, high: 3.50, subs: ['home', 'draw', 'away'] },
      over: { on: false, low: 1.20, high: 2.20, subs: ['1.5'] },
      under: { on: false, low: 1.10, high: 1.60, subs: ['3.5'] },
      btts: { on: true, low: 1.50, high: 2.25, subs: ['yes'] },
    },
  },
  {
    id: 'tpl-home-favorites',
    name: 'Home Fortress',
    description: 'Clear home favorites with odds between 1.30 and 1.85.',
    bookmaker: 'sportybet',
    withinHours: 72,
    leagues: [],
    isDefault: true,
    createdAt: 1700000004000,
    cards: {
      dc: { on: false, low: 1.05, high: 1.50, subs: ['1X', '12', 'X2'] },
      '1x2': { on: true, low: 1.30, high: 1.85, subs: ['home'] },
      over: { on: false, low: 1.20, high: 2.20, subs: ['1.5'] },
      under: { on: false, low: 1.10, high: 1.60, subs: ['3.5'] },
      btts: { on: false, low: 1.50, high: 2.20, subs: ['yes'] },
    },
  },
];

const LOCAL_STORAGE_KEY = STORAGE_KEYS.FILTER_TEMPLATES;
const TEMPLATE_EVENT = 'lb-filter-template-applied';
const TEMPLATES_CHANGED_EVENT = 'lb-filter-templates-changed';

export function getLocalTemplates(): FilterTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const key = scopedStorageKey(LOCAL_STORAGE_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_TEMPLATES;
    const userCustom: FilterTemplate[] = JSON.parse(raw);
    const normalized = userCustom.map((u) => ({
      ...u,
      bookmaker: u.bookmaker || 'sportybet',
      withinHours: u.withinHours !== undefined ? u.withinHours : null,
      leagues: Array.isArray(u.leagues) ? u.leagues : [],
    }));
    const combined = [
      ...DEFAULT_TEMPLATES,
      ...normalized.filter((u) => !DEFAULT_TEMPLATES.some((d) => d.id === u.id)),
    ];
    return combined;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

let templateClock = 0;

export function saveLocalTemplate(template: Omit<FilterTemplate, 'id' | 'createdAt'>): FilterTemplate {
  const custom = getLocalTemplates().filter((t) => !t.isDefault);
  const newTemplate: FilterTemplate = {
    ...template,
    bookmaker: template.bookmaker || 'sportybet',
    withinHours: template.withinHours !== undefined ? template.withinHours : null,
    leagues: Array.isArray(template.leagues) ? [...template.leagues] : [],
    cards: JSON.parse(JSON.stringify(template.cards)),
    id: `tpl-user-${Date.now()}-${++templateClock}`,
    createdAt: Date.now(),
    isDefault: false,
  };
  const updated = [newTemplate, ...custom];
  try {
    const key = scopedStorageKey(LOCAL_STORAGE_KEY);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    /* ignore storage quota */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TEMPLATES_CHANGED_EVENT, { detail: getLocalTemplates() }));
  }
  return newTemplate;
}

export function deleteLocalTemplate(id: string): boolean {
  if (DEFAULT_TEMPLATES.some((t) => t.id === id)) return false; // cannot delete defaults
  const custom = getLocalTemplates().filter((t) => !t.isDefault && t.id !== id);
  try {
    const key = scopedStorageKey(LOCAL_STORAGE_KEY);
    localStorage.setItem(key, JSON.stringify(custom));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEMPLATES_CHANGED_EVENT, { detail: getLocalTemplates() }));
    }
    return true;
  } catch {
    return false;
  }
}

export function onTemplatesChanged(callback: (templates: FilterTemplate[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback(getLocalTemplates());
  window.addEventListener(TEMPLATES_CHANGED_EVENT, handler);
  return () => window.removeEventListener(TEMPLATES_CHANGED_EVENT, handler);
}

export function notifyTemplateApplied(template: FilterTemplate) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TEMPLATE_EVENT, { detail: template }));
  }
}

export function onTemplateApplied(callback: (template: FilterTemplate) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<FilterTemplate>;
    if (custom.detail) callback(custom.detail);
  };
  window.addEventListener(TEMPLATE_EVENT, handler);
  return () => window.removeEventListener(TEMPLATE_EVENT, handler);
}
