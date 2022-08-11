import {writeFile} from 'node:fs/promises';

import Papa from 'papaparse';

import {CombinationsResults} from '../../try-combinations.js';
import {makePaths} from '../utils.js';

const {jsonOutPath, csvOutPath} = makePaths(
	'pointing-arrows-remove-by-element-compare',
);

type ResultValue = {
	solvedByRbe: string[];
	solvedByPa: string[];
};

const results: Record<number, ResultValue> = {};

export async function rbePaCompare(
	combinations: CombinationsResults,
	size: number,
): Promise<void> {
	if (combinations.combinationsAmount !== 1) {
		return;
	}

	const diff: ResultValue = {
		solvedByPa: [],
		solvedByRbe: [],
	};

	for (const [sudokuString, combinationResult] of combinations.combinations) {
		const isSolvedByName = (name: string) =>
			combinationResult.find(
				({plugins}) =>
					// CombinationsAmount is 1
					// the array only has one element
					plugins[0] === name,
			)!.type === 'solved';

		const isSolvedPa = isSolvedByName('pointingArrows');
		const isSolvedRbe = isSolvedByName('removeByElements');

		if (isSolvedPa && !isSolvedRbe) {
			diff.solvedByPa.push(sudokuString);
		}

		if (isSolvedRbe && !isSolvedPa) {
			diff.solvedByRbe.push(sudokuString);
		}
	}

	results[size] = diff;

	await write();
}

type CsvLine = {
	size: string;
	solvedByPa: number;
	solvedByRbe: number;
};
const write = async () => {
	await writeFile(jsonOutPath, JSON.stringify(results));

	const lines: CsvLine[] = [];

	for (const [size, {solvedByPa, solvedByRbe}] of Object.entries(results)) {
		lines.push({
			size,
			solvedByPa: solvedByPa.length,
			solvedByRbe: solvedByRbe.length,
		});
	}

	await writeFile(csvOutPath, Papa.unparse(lines));
};
