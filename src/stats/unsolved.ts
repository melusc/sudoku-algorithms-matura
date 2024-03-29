import {writeFile} from 'node:fs/promises';

import {Sudoku} from '@lusc/sudoku';
import Papa from 'papaparse';

import {
	CombinationsResults,
	completenessCalculator,
} from '../try-combinations.js';
import {BetterMap} from '../utils.js';
import {
	amountPluginInCombination,
	Avg,
	calcAvg,
	eachUnsolved,
	makeAvgMap,
	makePaths,
	pluginsSeparator,
	sortOutput,
} from './utils.js';

const {jsonOutPath, csvOutPath} = makePaths('unsolved');

type Unsolved = {
	plugins: string[];
	amountUnsolved: string;
	completenessWithCandidates: string;
	completenessNoCandidates: string;
	packageRounds: string;
	packageCompletenessNoCandidates: string;
};
type UnsolvedRecord = Record<number, Record<number, Unsolved[]>>;

const toCsv = (combinations: UnsolvedRecord): string => {
	const result: Array<
		{
			size: string;
			amount: string;
			plugins: string;
		} & Omit<Unsolved, 'plugins'>
	> = [];

	for (const [size, sizeValues] of Object.entries(combinations)) {
		for (const [amount, values] of Object.entries(sizeValues)) {
			for (const {plugins, ...rest} of values) {
				result.push({
					size,
					amount,
					plugins: plugins.join(pluginsSeparator),
					...rest,
				});
			}
		}
	}

	return Papa.unparse(result);
};

const writeCsv = async (combinations: UnsolvedRecord): Promise<void> => {
	const result = toCsv(combinations);

	await writeFile(csvOutPath, result);
};

const previous: UnsolvedRecord = {};

export const unsolved = async (
	combinations: CombinationsResults,
	size: number,
) => {
	const {combinationsAmount} = combinations;

	const amount = new BetterMap<string, number>(() => 0);
	const avgWithCandidates = makeAvgMap();
	const avgNoCandidates = makeAvgMap();
	const packageRoundsAvg = makeAvgMap();
	const packageAvgNoCandidates = makeAvgMap();

	const addToAvg = (avg: Avg, n: number) => {
		++avg.count;
		avg.total += n;
	};

	for (const {plugins, completeness, packageRounds, initial} of eachUnsolved(
		combinations,
	)) {
		const key = plugins.join(pluginsSeparator);
		amount.set(key, amount.get(key) + 1);
		addToAvg(packageRoundsAvg.get(key), packageRounds);

		addToAvg(avgWithCandidates.get(key), completeness.withCandidates.absolute);
		addToAvg(avgNoCandidates.get(key), completeness.noCandidates.absolute);

		const initialSudoku = Sudoku.fromString(initial, size);
		const initialSudokuCompleteness = completenessCalculator(
			initialSudoku,
			initialSudoku,
		).completeness;
		addToAvg(
			packageAvgNoCandidates.get(key),
			initialSudokuCompleteness.noCandidates.absolute,
		);

		if (plugins.length > 1) {
			for (const plugin of plugins) {
				amount.set(plugin, amount.get(plugin) + 1);
				addToAvg(packageRoundsAvg.get(plugin), packageRounds);
				addToAvg(
					avgWithCandidates.get(plugin),
					completeness.withCandidates.absolute,
				);
				addToAvg(
					avgNoCandidates.get(plugin),
					completeness.noCandidates.absolute,
				);
				addToAvg(
					packageAvgNoCandidates.get(plugin),
					initialSudokuCompleteness.noCandidates.absolute,
				);
			}
		}
	}

	const result: Unsolved[] = [];

	for (const [pluginsString, amountUnsolved] of amount) {
		const plugins = pluginsString.split(pluginsSeparator);

		const rest: Omit<Unsolved, 'amountUnsolved'> = {
			plugins,
			completenessNoCandidates: calcAvg(
				avgNoCandidates.get(pluginsString),
			).toFixed(2),
			completenessWithCandidates: calcAvg(
				avgWithCandidates.get(pluginsString),
			).toFixed(2),
			packageRounds: calcAvg(packageRoundsAvg.get(pluginsString)).toFixed(2),
			packageCompletenessNoCandidates: calcAvg(
				packageAvgNoCandidates.get(pluginsString),
			).toFixed(2),
		};

		if (combinationsAmount > 1 && plugins.length === 1) {
			result.push({
				amountUnsolved: (
					amountUnsolved / amountPluginInCombination(combinationsAmount)
				).toFixed(2),
				...rest,
			});
		} else {
			result.push({
				amountUnsolved: amountUnsolved.toString(),
				...rest,
			});
		}
	}

	result.sort(sortOutput);

	(previous[size] ??= {})[combinationsAmount] = result;

	await writeFile(jsonOutPath, JSON.stringify(previous, undefined, '\t'));
	await writeCsv(previous);
};
