import { loadCatalog } from '../src/catalog/index.js';

/**
 * Titres d'épisodes à rechercher dans les réponses / le bundle.
 * Les titres identiques à un nom officiel de partie ou de saison (ex. « Stone Ocean »)
 * sont exclus : ce sont des informations publiques affichées partout par conception.
 */
export function spoilerTitles(): { id: string; title: string }[] {
  const catalog = loadCatalog();
  const publicNames = new Set(
    catalog.parts
      .flatMap((p) => [p.name, ...p.seasons.map((s) => s.name)])
      .map((n) => n.toLowerCase()),
  );
  return catalog.episodes.flatMap((e) =>
    [e.titleFr, e.titleEn]
      .filter((t): t is string => t !== null && !publicNames.has(t.toLowerCase()))
      .map((title) => ({ id: e.id, title })),
  );
}

/** Variantes d'encodage d'un titre (JSON échappé, entités HTML). */
export function encodings(title: string): string[] {
  const json = JSON.stringify(title).slice(1, -1);
  const html = title.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  const unicodeEscaped = title.replace(
    /[^\x20-\x7e]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
  return [...new Set([title, json, html, unicodeEscaped])];
}
