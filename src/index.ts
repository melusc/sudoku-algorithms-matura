import {getSudokus} from './cached-sudokus.js';
import {stats} from './stats/index.js';
import {tryCombinations} from './try-combinations.js';

const sudokuAmount = 2500;

for (let i = 1; i <= 5; ++i) {
	for (const size of [9, 16] as const) {
		// eslint-disable-next-line no-await-in-loop
		const combinations = await tryCombinations(
			size,
			i,
			async () => getSudokus(sudokuAmount, size),
			sudokuAmount,
		);

		// eslint-disable-next-line no-await-in-loop
		await stats(combinations, size);
	}
}
