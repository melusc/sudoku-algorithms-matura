import {CombinationsResults} from '../try-combinations.js';

import {amountSolved} from './amount-solved.js';
import {rounds} from './rounds.js';
import {unsolved} from './unsolved.js';

export const stats = async (
	combinations: CombinationsResults,
	size: number,
) => {
	const promises: Array<Promise<void>> = [];

	for (const fn of [rounds, amountSolved, unsolved]) {
		promises.push(fn(combinations, size));
	}

	await Promise.all(promises);
};
