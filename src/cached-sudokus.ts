import fs from 'node:fs/promises';
import fsSync, {WriteStream} from 'node:fs';
import {promisify} from 'node:util';

import {Sudoku} from '@lusc/sudoku';
import {generateSudoku} from './generate-sudoku.js';

await fs.mkdir(new URL('../data', import.meta.url), {recursive: true});

const paths = {
	9: new URL('../data/9.txt', import.meta.url),
	16: new URL('../data/16.txt', import.meta.url),
} as const;

const previous = {
	9: [] as string[],
	16: [] as string[],
};

const writePrevious = async (key: keyof typeof previous): Promise<void> => {
	const path = paths[key];

	try {
		const result = await fs.readFile(path, 'utf-8');

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
