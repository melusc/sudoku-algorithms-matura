import fs from 'node:fs/promises';
import fsSync, {WriteStream} from 'node:fs';
import {promisify} from 'node:util';

import {Sudoku} from '@lusc/sudoku';
import {generateSudoku} from './generate-sudoku.js';

const outDir = new URL('../data/generated/', import.meta.url);
await fs.mkdir(outDir, {recursive: true});

/* eslint-disable @typescript-eslint/naming-convention */
const paths = {
	9: new URL('9.txt', outDir),
	16: new URL('16.txt', outDir),
} as const;

const previous = {
	9: [] as string[],
	16: [] as string[],
};
/* eslint-enable @typescript-eslint/naming-convention */

const writePrevious = async (key: keyof typeof previous): Promise<void> => {
	const path = paths[key];

	try {
		const result = await fs.readFile(path, 'utf8');

		previous[key] = result.split('\n').filter(Boolean);
	} catch {
		await fs.writeFile(path, '');
	}
};

await writePrevious(9);
await writePrevious(16);

export const getSudokus = async (
	amount: number,
	size: keyof typeof previous,
): Promise<Sudoku[]> => {
	const stringSudokus = previous[size];

	const stream = fsSync.createWriteStream(paths[size], {flags: 'a+'});

	while (stringSudokus.length < amount) {
		const s = generateSudoku(size).toString().trimEnd();
		stringSudokus.push(s);

		// eslint-disable-next-line no-await-in-loop
		await new Promise<void>(resolve => {
			stream.write(s + '\n', error => {
				if (error) {
					throw error;
				}

				resolve();
			});
		});
	}

	await promisify(WriteStream.prototype.end).call(stream);

	const sudokus: Sudoku[] = [];

	for (let i = 0; i < amount; ++i) {
		sudokus.push(Sudoku.fromString(stringSudokus[i]!, size));
	}

	return sudokus;
};
