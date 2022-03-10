import {getSudokus} from '../cached-sudokus.js';
import {tryCombinations} from '../try-combinations.js';
import {amountSolved} from './amount-solved.js';

import {rounds} from './rounds.js';

export const stats = async (combinationsAmount: number) => {
	const sudokuAmount = 2500;

	for (const size of [9, 16] as const) {
		// eslint-disable-next-line no-await-in-loop
		const result = await tryCombinations(size, combinationsAmount, async () =>
			getSudokus(sudokuAmount, size),
		);

		for (const fn of [rounds, amountSolved]) {
			// eslint-disable-next-line no-await-in-loop
			await fn(result, size);
		}
	}
};