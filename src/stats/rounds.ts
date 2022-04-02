import {writeFile} from 'node:fs/promises';

import Papa from 'papaparse';

import type {CombinationsResults} from '../try-combinations.js';
import {BetterMap} from '../utils.js';

import {outDir, pluginsSeperator} from './utils.js';

const jsonOutPath = new URL('rounds.json', outDir);
const csvOutPath = new URL('rounds.csv', outDir);

type RoundsValue = {
	plugins: string[];
	avg: number;
	least: number;
};
type Rounds = Record<number, Record<number, RoundsValue[]>>;

const toCsv = (input: Rounds): string => {
	const result: Array<{
		size: string;
		amount: string;
		plugins: string;
		avg: number;
		least: number;
	}> = [];

	for (const [size, sizeValue] of Object.entries(input)) {
		for (const [amount, values] of Object.entries(sizeValue)) {
			for (const {plugins, avg, least} of values) {
				result.push({
					size,
					amount,
					plugins: plugins.join(pluginsSeperator),
					avg,
					least,
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

const makeAvgMap = () =>
	new BetterMap<string, {total: number; count: number}>(() => ({
		total: 0,
		count: 0,
	}));

export const rounds = async (
	{solved, combinationsAmount}: CombinationsResults,
	size: number,
): Promise<void> => {
	const avg = makeAvgMap();
	const leastByPlugin = new BetterMap<string, number>(
		() => Number.POSITIVE_INFINITY,
	);
	const setIfLower = (key: string, value: number) => {
		if (leastByPlugin.get(key) > value) {
			leastByPlugin.set(key, value);
		}
	};

	for (const {rounds, plugins} of [...solved.values()].flat()) {
		const pluginsKey = plugins.join(pluginsSeperator);
		setIfLower(pluginsKey, rounds);

		const pluginsAvg = avg.get(plugins.join(pluginsSeperator));
		++pluginsAvg.count;
		pluginsAvg.total += rounds;

		// Technically not necessary, since the result wouldn't change
		if (plugins.length > 1) {
			for (const plugin of plugins) {
				setIfLower(plugin, rounds);

				const pluginAvg = avg.get(plugin);
				++pluginAvg.count;
				pluginAvg.total += rounds;
			}
		}
	}

	const values: RoundsValue[] = [];

	for (const [key, {total, count}] of avg) {
		values.push({
			plugins: key.split(pluginsSeperator),
			avg: total / count,
			least: leastByPlugin.get(key),
		});
	}

	values.sort((a, b) => b.plugins.length - a.plugins.length);

	(previous[size] ??= {})[combinationsAmount] = values;

	await writeFile(jsonOutPath, JSON.stringify(previous, undefined, '\t'));
	await writeCsv(previous);
};
