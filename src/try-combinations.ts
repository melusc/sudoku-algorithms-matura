import process from 'node:process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

import {Sudoku} from '@lusc/sudoku';
import * as plugins from '@lusc/sudoku/dist/lib/plugins/index.js';
import {createLogUpdate} from 'log-update';
import {BetterMap} from './utils.js';

await mkdir(new URL('../data', import.meta.url), {recursive: true});

// Not all the internals, only the required ones
type SudokuWithInternals = Sudoku & {
	anyChanged: boolean;
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

		if (!previous.includes(pluginName)) {
			yield * everyCombination(size - 1, i + 1, [...previous, pluginName]);
		}
	}
}

function solve(
	sudoku: Sudoku,
	pluginKeys: PluginKeys[],
): {
	pluginsUsed: PluginKeys[];
	solvedSudoku: Sudoku;
} {
	const clone = sudoku.clone() as SudokuWithInternals;

	do {
		clone.anyChanged = false;
		for (const pluginKey of pluginKeys) {
			plugins[pluginKey](clone);
		}
	} while (clone.anyChanged);

	return {
		pluginsUsed: pluginKeys,
		solvedSudoku: clone,
	};
}

const log = createLogUpdate(process.stdout, {
	showCursor: true,
});

const getUrl = (size: number, combinationsAmount: number, solved: boolean) =>
	new URL(
		`../data/${solved ? '' : 'un'}solved-${size}-${combinationsAmount}.json`,
		import.meta.url,
	);

export const doTryCombinations = async (
	size: number,
	combinationsAmount: number,
	sudokus: readonly Sudoku[],
): Promise<{
	solved: ReadonlyMap<string, PluginKeys[][]>;
	unsolved: ReadonlyMap<string, PluginKeys[][]>;
}> => {
	const logProgress = (i: number) => {
		log(`${size}-${combinationsAmount} (${i} / ${sudokus.length})`);
	};

	const unsolvedByKey = new BetterMap<string, PluginKeys[][]>(() => []);
	const solvedByKey = new BetterMap<string, PluginKeys[][]>(() => []);

	for (const [i, sudoku] of sudokus.entries()) {
		logProgress(i);

		const stringified = sudoku.toString().trimEnd();

		for (const pluginKeys of everyCombination(combinationsAmount)) {
			const {solvedSudoku, pluginsUsed} = solve(sudoku, pluginKeys);
			(solvedSudoku.isSolved() ? solvedByKey : unsolvedByKey)
				.get(stringified)
				.push(pluginsUsed);
		}
	}

	logProgress(sudokus.length);
	log.done();

	await writeFile(
		getUrl(size, combinationsAmount, true),
		JSON.stringify(Object.fromEntries(solvedByKey)),
	);

	await writeFile(
		getUrl(size, combinationsAmount, false),
		JSON.stringify(Object.fromEntries(unsolvedByKey)),
	);

	return {
		solved: solvedByKey,
		unsolved: unsolvedByKey,
	};
};

export const tryCombinations = async (
	size: number,
	combinationsAmount: number,
	getSudokus: () => Promise<readonly Sudoku[]>,
): ReturnType<typeof doTryCombinations> => {
	try {
		const solved = await readFile(
			getUrl(size, combinationsAmount, true),
			'utf-8',
		);
		const unsolved = await readFile(
			getUrl(size, combinationsAmount, false),
			'utf-8',
		);

		const jsonToMap = (input: string): Map<string, PluginKeys[][]> =>
			new Map(
				Object.entries(JSON.parse(input) as Record<string, PluginKeys[][]>),
			);

		const result = {
			solved: jsonToMap(solved),
			unsolved: jsonToMap(unsolved),
		};

		console.log('%d-%d (Cached)', size, combinationsAmount);

		return result;
	} catch {
		return doTryCombinations(size, combinationsAmount, await getSudokus());
	}
};
