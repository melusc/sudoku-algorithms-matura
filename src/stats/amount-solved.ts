import {writeFile} from 'node:fs/promises';

import Papa from 'papaparse';

import type {CombinationsResults} from '../try-combinations.js';
import {BetterMap} from '../utils.js';

import {eachSolved, outDir, pluginsSeparator} from './utils.js';

const jsonOutPath = new URL('amount-solved.json', outDir);
const csvOutPath = new URL('amount-solved.csv', outDir);

type AmountSolvedValue = {
	plugins: string[];
	amountSolved: number;
};
type AmountSolved = Record<number, Record<number, AmountSolvedValue[]>>;

const toCsv = (input: AmountSolved): string => {
	const result: Array<{
		size: string;
		amount: string;
		plugins: string;
		amountSolved: number;
	}> = [];

	for (const [size, sizeValues] of Object.entries(input)) {
		for (const [amount, values] of Object.entries(sizeValues)) {
			for (const {plugins, amountSolved} of values) {
				result.push({
					size,
					amount,
					plugins: plugins.join(pluginsSeparator),
					amountSolved,
				});
			}
		}
	}

	return Papa.unparse(result);
};

const writeCsv = async (input: AmountSolved): Promise<void> => {
	const result = toCsv(input);

	await writeFile(csvOutPath, result);
};

const previous: AmountSolved = {};

export const amountSolved = async (
	combinations: CombinationsResults,
	size: number,
): Promise<void> => {
	const {combinationsAmount} = combinations;

	const amount = new BetterMap<string, number>(() => 0);
	for (const {plugins} of eachSolved(combinations)) {
		const key = plugins.join(pluginsSeparator);
		amount.set(key, amount.get(key) + 1);

		if (plugins.length > 1) {
			for (const plugin of plugins) {
				amount.set(plugin, amount.get(plugin) + 1);
			}
		}
	}

	const result: AmountSolvedValue[] = [];

	for (const [plugins, amountSolved] of amount) {
		result.push({
			plugins: plugins.split(pluginsSeparator),
			amountSolved,
		});
	}

	(previous[size] ??= {})[combinationsAmount] = result;

	await writeFile(jsonOutPath, JSON.stringify(previous, undefined, '\t'));
	await writeCsv(previous);
};
