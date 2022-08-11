import {writeFile} from 'node:fs/promises';

import {CombinationsResults} from '../../try-combinations.js';
import {makePaths} from '../utils.js';

const {jsonOutPath} = makePaths('pointing-arrows-remove-by-element-compare');

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

	await writeFile(jsonOutPath, JSON.stringify(results));
}
