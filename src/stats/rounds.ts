import {writeFile} from 'node:fs/promises';

import Papa from 'papaparse';

import type {CombinationsResults} from '../try-combinations.js';
import {BetterMap} from '../utils.js';

import {
	eachSolved,
	calculateMedian,
	pluginsSeparator,
	makePaths,
	makeAvgMap,
	calcAvg,
	Avg,
} from './utils.js';

const {jsonOutPath, csvOutPath} = makePaths('rounds');

type RoundsValue = {
	plugins: string[];
	avg: number;
	scatter: number;
	median: number;
	min: number;
	max: number;
	packageRoundsAvg: number;
};
type Rounds = Record<number, Record<number, RoundsValue[]>>;

const toCsv = (input: Rounds): string => {
	const result: Array<
		{
			size: string;
			amount: string;
			plugins: string;
		} & Omit<RoundsValue, 'plugins'>
	> = [];

	for (const [size, sizeValue] of Object.entries(input)) {
		for (const [amount, values] of Object.entries(sizeValue)) {
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

const writeCsv = async (input: Rounds): Promise<void> => {
	const result = toCsv(input);

	await writeFile(csvOutPath, result);
};

const previous: Rounds = {};

export const rounds = async (
	combinations: CombinationsResults,
	size: number,
): Promise<void> => {
	const {combinationsAmount} = combinations;

	const averages = makeAvgMap();
	const extremes = new BetterMap<string, {max: number; min: number}>(() => ({
		max: Number.NEGATIVE_INFINITY,
		min: Number.POSITIVE_INFINITY,
	}));
	const allRounds = new BetterMap<string, number[]>(() => []);
	const packageRoundsAvg = makeAvgMap();

	const setExtremes = (key: string, value: number) => {
		const previous = extremes.get(key);
		if (value > previous.max) {
			previous.max = value;
		}

		if (value < previous.min) {
			previous.min = value;
		}
	};

	const addAverage = (avg: Avg, rounds: number) => {
		++avg.count;
		avg.total += rounds;
	};

	for (const {rounds, plugins, packageRounds} of eachSolved(combinations)) {
		const pluginsKey = plugins.join(pluginsSeparator);
		setExtremes(pluginsKey, rounds);
		addAverage(averages.get(pluginsKey), rounds);
		allRounds.get(pluginsKey).push(rounds);
		addAverage(packageRoundsAvg.get(pluginsKey), packageRounds);

		// Technically not necessary, since the result wouldn't change
		if (plugins.length > 1) {
			for (const plugin of plugins) {
				setExtremes(plugin, rounds);
				addAverage(averages.get(plugin), rounds);
				allRounds.get(plugin).push(rounds);
				addAverage(packageRoundsAvg.get(plugin), packageRounds);
			}
		}
	}

	const scatter = makeAvgMap();
	const addScatter = (key: string, rounds: number) => {
		const avg = averages.get(key);
		const pluginScatter = scatter.get(key);
		++pluginScatter.count;
		pluginScatter.total += Math.abs(calcAvg(avg) - rounds);
	};

	for (const {rounds, plugins} of eachSolved(combinations)) {
		addScatter(plugins.join(pluginsSeparator), rounds);

		if (plugins.length > 1) {
			for (const plugin of plugins) {
				addScatter(plugin, rounds);
			}
		}
	}

	const values: RoundsValue[] = [];

	for (const [key, avg] of averages) {
		values.push({
			plugins: key.split(pluginsSeparator),
			avg: calcAvg(avg),
			scatter: calcAvg(scatter.get(key)),
			median: calculateMedian(allRounds.get(key)),
			...extremes.get(key),
			packageRoundsAvg: calcAvg(packageRoundsAvg.get(key)),
		});
	}

	values.sort((a, b) => b.plugins.length - a.plugins.length);

	(previous[size] ??= {})[combinationsAmount] = values;

	await writeFile(jsonOutPath, JSON.stringify(previous, undefined, '\t'));
	await writeCsv(previous);
};
