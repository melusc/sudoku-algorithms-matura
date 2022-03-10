import {mkdir} from 'node:fs/promises';

export const outDir = new URL('../../data/stats/', import.meta.url);

await mkdir(outDir, {recursive: true});
