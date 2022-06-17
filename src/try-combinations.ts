import process from 'node:process';
import {mkdir, writeFile} from 'node:fs/promises';

import {Sudoku} from '@lusc/sudoku';
// eslint-disable-next-line n/file-extension-in-import
import * as plugins from '@lusc/sudoku/plugins';
import {createLogUpdate} from 'log-update';
import ow from 'ow';

import {BetterMap} from './utils.js';

const outDir = new URL('../data/combinations/', import.meta.url);
await mkdir(outDir, {recursive: true});

// Not all the internals, only the required ones
type SudokuWithInternals = Sudoku & {
	anyChanged: boolean;
};

const completenessNumber = ow.number.finite.inRange(0, 1);
const validator = (size: number, map: Map<any, any>) => {
	ow(
		map,
		ow.map
			.keysOfType(ow.string)
			.size(size)
			.valuesOfType(
				ow.array.ofType(
					ow.any(
						ow.object.exactShape({
							type: ow.string.equals('solved'),
							plugins: ow.array.ofType(ow.string),
							rounds: ow.number,
							packageRounds: ow.number,
						}),
						ow.object.exactShape({
							type: ow.string.equals('unsolved'),
							plugins: ow.array.ofType(ow.string),
							result: ow.string,
							packageRounds: ow.number,
							completeness: ow.object.exactShape({
								withCandidates: ow.object.exactShape({
									relative: completenessNumber,
									absolute: completenessNumber,
								}),
								noCandidates: ow.object.exactShape({
									relative: completenessNumber,
									absolute: completenessNumber,
								}),
							}),
						}),
					),
				),
			),
	);
};

type Plugins = typeof plugins;
type PluginKeys = keyof Plugins;
// Type PluginValues = Plugins[PluginKeys];

function * everyCombination(
	size: number,
	offset = 0,
	previous: PluginKeys[] = [],
): Iterable<PluginKeys[]> {
	if (size === 0) {
		yield previous;
		return;
	}

	const keys = Object.keys(plugins) as PluginKeys[];

	for (let i = offset; i < keys.length; ++i) {
		const pluginName = keys[i]!;

		yield * everyCombination(size - 1, i + 1, [...previous, pluginName]);
	}
}

const completenessCalculator = (
	sudoku: Sudoku,
	previousSudoku: Sudoku,
): {
	completeness: UnsolvedValue['completeness'];
} => {
	const {size, getCells} = sudoku;
	let withCandidatesAbsolute = 0;
	let withCandidatesRelative = 0;
	let noCandidatesAbsolute = 0;
	let noCandidatesRelative = 0;

	let previousNumberCount = 0;

	for (const cell of getCells()) {
		const noCandidates = cell.element === undefined ? 0 : 1;

		withCandidatesAbsolute
			+= cell.element === undefined ? size - cell.candidates.size : size;
		noCandidatesAbsolute += noCandidates;

		const previousCell = previousSudoku.getCell(cell.index);
		if (previousCell.element === undefined) {
			withCandidatesRelative
				+= cell.element === undefined
					? previousCell.candidates.size - cell.candidates.size
					: size;
			noCandidatesRelative += noCandidates;
			++previousNumberCount;
		}
	}

	const amountCells = size ** 2;
	// Case `previousNumberContent === 0`
	//   div by null would by NaN
	//   therefore return 0
	return {
		completeness: {
			withCandidates: {
				relative:
					previousNumberCount
					&& withCandidatesRelative / previousNumberCount / size,
				absolute: withCandidatesAbsolute / amountCells / size,
			},
			noCandidates: {
				relative:
					previousNumberCount && noCandidatesRelative / previousNumberCount,
				absolute: noCandidatesAbsolute / amountCells,
			},
		},
	};
};

function solve(
	sudoku: Sudoku,
	pluginKeys: PluginKeys[],
): {
	pluginsUsed: PluginKeys[];
	solvedSudoku: Sudoku;
	rounds: number;
} {
	const clone = sudoku.clone() as SudokuWithInternals;
	let rounds = 0;

	do {
		++rounds;
		clone.anyChanged = false;
		for (const pluginKey of pluginKeys) {
			plugins[pluginKey](clone);
		}
	} while (clone.anyChanged);

	return {
		pluginsUsed: pluginKeys,
		solvedSudoku: clone,
		rounds,
	};
}

const log = createLogUpdate(process.stdout, {
	showCursor: true,
});

const getUrl = (size: number, combinationsAmount: number) =>
	new URL(`${size}-${combinationsAmount}.json`, outDir);

export type SolvedValue = {
	type: 'solved';
	plugins: PluginKeys[];
	rounds: number;
	packageRounds: number;
};
export type SolvedValues = SolvedValue[];

export type UnsolvedValue = {
	type: 'unsolved';
	plugins: PluginKeys[];
	result: string;
	packageRounds: number;
	completeness: {
		withCandidates: {
			absolute: number;
			relative: number;
		};
		noCandidates: {
			absolute: number;
			relative: number;
		};
	};
};
export type UnsolvedValues = UnsolvedValue[];

type CombinationEntry = SolvedValue | UnsolvedValue;

export type CombinationsResults = {
	combinationsAmount: number;
	combinations: ReadonlyMap<string, CombinationEntry[]>;
};

export const doTryCombinations = async (
	size: number,
	combinationsAmount: number,
	sudokus: readonly Sudoku[],
	amountSudokus: number,
): Promise<CombinationsResults> => {
	const logProgress = (i: number) => {
		log(`${size}-${combinationsAmount} (${i} / ${sudokus.length})`);
	};

	const byKey = new BetterMap<string, CombinationEntry[]>(() => []);

	for (const [i, sudoku] of sudokus.entries()) {
		logProgress(i);

		const stringified = sudoku.toString().trimEnd();
		const clone = sudoku.clone();
		clone.solve();
		const packageRounds = clone.rounds;

		for (const pluginKeys of everyCombination(combinationsAmount)) {
			const {solvedSudoku, pluginsUsed, rounds} = solve(sudoku, pluginKeys);

			let result: CombinationEntry;

			if (solvedSudoku.isSolved()) {
				result = {
					type: 'solved',
					plugins: pluginsUsed,
					rounds,
					packageRounds,
				};
			} else {
				result = {
					type: 'unsolved',
					plugins: pluginsUsed,
					result: solvedSudoku.toString().trimEnd(),
					packageRounds,
					...completenessCalculator(solvedSudoku, sudoku),
				};
			}

			byKey.get(stringified).push(result);
		}
	}

	logProgress(sudokus.length);
	log.done();

	validator(amountSudokus, byKey);

	await writeFile(
		getUrl(size, combinationsAmount),
		JSON.stringify(Object.fromEntries(byKey)),
	);

	return {
		combinationsAmount,
		combinations: byKey,
	};
};

export const tryCombinations = async (
	size: number,
	combinationsAmount: number,
	getSudokus: () => Promise<readonly Sudoku[]>,
	amountSudokus: number,
): Promise<CombinationsResults> => {
	try {
		const {default: combinations} = (await import(
			getUrl(size, combinationsAmount).href,
			{
				assert: {
					type: 'json',
				},
			}
		)) as {
			default: Record<string, CombinationEntry[]>;
		};

		const combinationsMap = new Map(Object.entries(combinations));
		validator(amountSudokus, combinationsMap);

		console.log('%d-%d (Cached)', size, combinationsAmount);

		return {
			combinationsAmount,
			combinations: combinationsMap as ReadonlyMap<string, CombinationEntry[]>,
		};
	} catch (error: unknown) {
		console.log(error);
		console.log('%d-%d (Error reading cache)', size, combinationsAmount);

		return doTryCombinations(
			size,
			combinationsAmount,
			await getSudokus(),
			amountSudokus,
		);
	}
};
