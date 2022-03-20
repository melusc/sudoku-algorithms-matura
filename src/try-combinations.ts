import process from 'node:process';
import {mkdir, writeFile} from 'node:fs/promises';

import {Sudoku} from '@lusc/sudoku';
import * as plugins from '@lusc/sudoku/dist/lib/plugins/index.js';
import {createLogUpdate} from 'log-update';
import {BetterMap, ow} from './utils.js';

const outDir = new URL('../data/combinations/', import.meta.url);
await mkdir(outDir, {recursive: true});

// Not all the internals, only the required ones
type SudokuWithInternals = Sudoku & {
	anyChanged: boolean;
};

const completenessNumber = ow.number.finite.inRange(0, 1);
const validators = {
	solved: ow.create(
		ow.map.keysOfType(ow.string).valuesOfType(
			ow.array.ofType(
				ow.object.exactShape({
					plugins: ow.array.ofType(ow.string),
					rounds: ow.number,
					packageRounds: ow.number,
				}),
			),
		),
	),
	unsolved: ow.create(
		ow.map.keysOfType(ow.string).valuesOfType(
			ow.array.ofType(
				ow.object.exactShape({
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
} as const;

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

		if (!previous.includes(pluginName)) {
			yield * everyCombination(size - 1, i + 1, [...previous, pluginName]);
		}
	}
}

const completenessCalculator = (
	sudoku: Sudoku,
	previousSudoku: Sudoku,
): {
	completeness: UnsolvedValues[number]['completeness'];
} => {
	const {size, getCells} = sudoku;
	let withCandidatesAbsolute = 0;
	let withCandidatesRelative = 0;
	let noCandidatesAbsolute = 0;
	let noCandidatesRelative = 0;

	let previousNumberCount = 0;

	for (const cell of getCells()) {
		const noCandidates = cell.content === undefined ? 0 : 1;

		withCandidatesAbsolute
			+= cell.content === undefined ? size - cell.candidates.size : size;
		noCandidatesAbsolute += noCandidates;

		const previousCell = previousSudoku.getCell(cell.index);
		if (previousCell.content === undefined) {
			withCandidatesRelative
				+= cell.content === undefined
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

export type SolvedValues = Array<{
	plugins: PluginKeys[];
	rounds: number;
	packageRounds: number;
}>;
export type UnsolvedValues = Array<{
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
}>;
export type CombinationsResults = {
	solved: ReadonlyMap<string, SolvedValues>;
	unsolved: ReadonlyMap<string, UnsolvedValues>;
	combinationsAmount: number;
};

export const doTryCombinations = async (
	size: number,
	combinationsAmount: number,
	sudokus: readonly Sudoku[],
): Promise<CombinationsResults> => {
	const logProgress = (i: number) => {
		log(`${size}-${combinationsAmount} (${i} / ${sudokus.length})`);
	};

	const solvedByKey = new BetterMap<string, SolvedValues>(() => []);
	const unsolvedByKey = new BetterMap<string, UnsolvedValues>(() => []);

	for (const [i, sudoku] of sudokus.entries()) {
		logProgress(i);

		const stringified = sudoku.toString().trimEnd();
		const clone = sudoku.clone();
		clone.solve();
		const packageRounds = clone.rounds;

		for (const pluginKeys of everyCombination(combinationsAmount)) {
			const {solvedSudoku, pluginsUsed, rounds} = solve(sudoku, pluginKeys);
			if (solvedSudoku.isSolved()) {
				solvedByKey
					.get(stringified)
					.push({plugins: pluginsUsed, rounds, packageRounds});
			} else {
				unsolvedByKey.get(stringified).push({
					plugins: pluginsUsed,
					result: solvedSudoku.toString().trimEnd(),
					packageRounds,
					...completenessCalculator(solvedSudoku, sudoku),
				});
			}
		}
	}

	logProgress(sudokus.length);
	log.done();

	validators.solved(solvedByKey);
	validators.unsolved(unsolvedByKey);

	await writeFile(
		getUrl(size, combinationsAmount),
		JSON.stringify({
			solved: Object.fromEntries(solvedByKey),
			unsolved: Object.fromEntries(unsolvedByKey),
		}),
	);

	return {
		solved: solvedByKey,
		unsolved: unsolvedByKey,
		combinationsAmount,
	};
};

export const tryCombinations = async (
	size: number,
	combinationsAmount: number,
	getSudokus: () => Promise<readonly Sudoku[]>,
): Promise<CombinationsResults> => {
	try {
		const {
			default: {solved, unsolved},
			// eslint-disable-next-line node/no-unsupported-features/es-syntax
		} = (await import(getUrl(size, combinationsAmount).href, {
			assert: {
				type: 'json',
			},
		})) as {
			default: {
				solved: Record<string, SolvedValues>;
				unsolved: Record<string, UnsolvedValues>;
			};
		};

		const solvedMap = new Map(Object.entries(solved));
		const unsolvedMap = new Map(Object.entries(unsolved));

		validators.solved(solvedMap);
		validators.unsolved(unsolvedMap);

		console.log('%d-%d (Cached)', size, combinationsAmount);

		return {
			solved: solvedMap as ReadonlyMap<string, SolvedValues>,
			unsolved: unsolvedMap as ReadonlyMap<string, UnsolvedValues>,
			combinationsAmount,
		};
	} catch (error: unknown) {
		console.log(error);
		console.log('%d-%d (Error reading cache)', size, combinationsAmount);

		return doTryCombinations(size, combinationsAmount, await getSudokus());
	}
};
