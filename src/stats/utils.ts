import {mkdir, rm} from 'node:fs/promises';

export const outDir = new URL('../../data/stats/', import.meta.url);

await rm(outDir, {recursive: true, force: true});
await mkdir(outDir, {recursive: true});

export const pluginsSeperator = '|';
