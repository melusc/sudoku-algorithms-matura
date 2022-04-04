import {mkdir, rm} from 'node:fs/promises';
import {
	CombinationsResults,
	SolvedValue,
	UnsolvedValue,
} from '../try-combinations.js';

export const outDir = new URL('../../data/stats/', import.meta.url);

await rm(outDir, {recursive: true, force: true});
await mkdir(outDir, {recursive: true});

export const pluginsSeparator = '|';

export function * eachSolved(
	combinations: CombinationsResults,
): Iterable<SolvedValue> {
	for (const values of combinations.solved.values()) {
		yield * values;
	}
}

export function * eachUnsolved(
	combinations: CombinationsResults,
): Iterable<UnsolvedValue> {
	for (const values of combinations.unsolved.values()) {
		yield * values;
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
