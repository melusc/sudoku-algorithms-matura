import {writeFile} from 'node:fs/promises';

import Papa from 'papaparse';
import {Sudoku} from '@lusc/sudoku';
// eslint-disable-next-line n/file-extension-in-import
import {nFish} from '@lusc/sudoku/plugins';

import {CombinationsResults} from '../../try-combinations.js';
import {makePaths} from '../utils.js';

const {jsonOutPath, csvOutPath} = makePaths('n-fish-from-initial');

const trySolve = (s_: Sudoku) => {
	const s = s_.clone() as Sudoku & {
		anyChanged: boolean;
	};

	do {
		s.anyChanged = false;

		nFish(s);
	} while (s.anyChanged);

	return s as Sudoku;
};

const sudokuEqual = (s1: Sudoku, s2: Sudoku) =>
	s1.getCells().every(cell1 => {
		const cell2 = s2.getCell(cell1.index);

		if (cell1.element !== undefined) {
			return cell1.element === cell2.element;
		}

		return (
			cell1.candidates.size === cell2.candidates.size
			&& [...cell1.candidates].every(candidate => cell2.candidates.has(candidate))
		);
	});

const jsonifySudoku = (s: Sudoku) =>
	s.getCells().map(({element, candidates}) => element ?? [...candidates]);

const result: Record<
	string,
	Array<{
		before: Array<number | number[]>;
		after: Array<number | number[]>;
	}>
> = {};

export const nFishFromInitial = async (
	combinations: CombinationsResults,
	size: number,
) => {
	if (combinations.combinationsAmount !== 1) {
		return;
	}

	const diff: Array<{
		before: Array<number | number[]>;
		after: Array<number | number[]>;
	}> = [];

	for (const [sudokuStringified] of combinations.combinations) {
		const before = Sudoku.fromString(sudokuStringified, size);

		const after = trySolve(before);

		if (!sudokuEqual(before, after)) {
			diff.push({
				before: jsonifySudoku(before),
				after: jsonifySudoku(after),
			});
		}
	}

	result[size] = diff;

	await write();
};

type CsvLine = {
	size: string;
	amount: number;
};
const write = async () => {
	await writeFile(jsonOutPath, JSON.stringify(result));

	const lines: CsvLine[] = [];

	for (const [size, diffs] of Object.entries(result)) {
		lines.push({
			size,
			amount: diffs.length,
		});
	}

	await writeFile(csvOutPath, Papa.unparse(lines));
};
