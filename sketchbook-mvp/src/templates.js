import { makeTemplate } from './dollarP.js';

const STORAGE_KEY = 'the-mending:templates:v1';

/** Loads saved templates from localStorage (already-normalized point clouds). */
export function loadTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

/** Records a new example of `name` from raw strokes and persists it. */
export function addTemplate(name, strokes) {
  const templates = loadTemplates();
  templates.push(makeTemplate(name, strokes));
  saveTemplates(templates);
  return templates;
}

export function clearTemplates() {
  localStorage.removeItem(STORAGE_KEY);
}

export function countByName(templates) {
  const counts = {};
  for (const t of templates) counts[t.name] = (counts[t.name] || 0) + 1;
  return counts;
}
