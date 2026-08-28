import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadDestinations(repositoryRoot) {
  const source = await fs.readFile(path.join(repositoryRoot, 'destinations', 'destination-data.js'), 'utf8');
  const match = source.match(/window\.KIDVENTURO_DESTINATION_SEO=(\{.*\});?\s*$/s);
  if (!match) throw new Error('Could not read Kidventuro destination data');
  return Object.entries(JSON.parse(match[1])).map(([slug, destination]) => ({ slug, ...destination }));
}
