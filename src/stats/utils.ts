import {mkdir, rm} from 'node:fs/promises';

// eslint-disable-next-line n/file-extension-in-import
import * as plugins from '@lusc/sudoku/plugins';

import {
	CombinationsResults,
	SolvedValue,
	UnsolvedValue,
} from '../try-combinations.js';
import {BetterMap} from '../utils.js';

export const outDir = new URL('../../data/stats/', import.meta.url);

export const clean = async () => {
	await rm(outDir, {recursive: true, force: true});
	await mkdir(outDir, {recursive: true});
};

export const pluginsSeparator = '|';

export const makePaths = (
	name: string,
): {csvOutPath: URL; jsonOutPath: URL} => ({
	csvOutPath: new URL(`${name}.csv`, outDir),
	jsonOutPath: new URL(`${name}.json`, outDir),
});

export function * eachSolved(
	combinations: CombinationsResults,
): Iterable<SolvedValue> {
	for (const values of combinations.combinations.values()) {
		for (const value of values) {
			if (value.type === 'solved') {
				yield value;
			}
		}
	}
}

export function * eachUnsolved(
	combinations: CombinationsResults,
): Iterable<UnsolvedValue & {initial: string}> {
	for (const [initial, values] of combinations.combinations) {
		for (const value of values) {
			if (value.type === 'unsolved') {
				yield {...value, initial};
			}
		}
	}
}

export const calculateMedian = (values: number[]): number => {
	values.sort((a, b) => a - b);

	// eslint-disable-next-line no-bitwise
	const half = values.length >> 1;

	// eslint-disable-next-line no-bitwise
	if ((values.length & 1) === 1) {
		return values[half]!;
	}

	return (values[half - 1]! + values[half]!) / 2;
};

const factorCache = new Map<number, number>();
const factor = (n: number): number => {
	let cached = factorCache.get(n);
	if (cached !== undefined) {
		return cached;
	}

	cached = 1;
	for (let i = 2; i <= n; ++i) {
		cached *= i;
	}

	factorCache.set(n, cached);
	return cached;
};

export const nCr = (n: number, k: number) => {
	if (n < k || k < 0) {
		throw new Error('Need n >= k >= 0');
	}

	return factor(n) / factor(k) / factor(n - k);
};

export const amountPlugins = Object.keys(plugins).length;

export type Avg = {total: number; count: number};
export const makeAvgMap = () =>
	new BetterMap<string, Avg>(() => ({
		total: 0,
		count: 0,
	}));
export const calcAvg = ({total, count}: Avg) => total / count;

const pluginKeys = Object.keys(plugins);
export const amountPluginInCombination = (size: number) =>
	(size * nCr(pluginKeys.length, size)) / pluginKeys.length;

type CsvResult = {
	plugins: string[];
};
export const collator = new Intl.Collator('en', {sensitivity: 'base'});
export const sortOutput = (a: CsvResult, b: CsvResult) =>
	b.plugins.length - a.plugins.length
	|| collator.compare(
		a.plugins.join(pluginsSeparator),
		b.plugins.join(pluginsSeparator),
	);
