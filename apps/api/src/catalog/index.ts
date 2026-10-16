/**
 * Catalogue complet des épisodes (avec titres).
 * SERVEUR UNIQUEMENT : ce module ne doit jamais être importé par le front.
 */
import rawCatalog from './episodes.json' with { type: 'json' };
import { catalogSchema, type Catalog } from './schema.js';

let cached: Catalog | undefined;

export function loadCatalog(): Catalog {
  cached ??= catalogSchema.parse(rawCatalog);
  return cached;
}

export { catalogSchema };
export type { Catalog, CatalogEpisode, CatalogPart } from './schema.js';
