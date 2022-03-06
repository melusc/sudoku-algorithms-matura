import {getSudokus} from './cached-sudokus.js';
import {tryCombinations} from './try-combinations.js';

const sudokuAmount = 2500;

for (const size of [9, 16] as const) {
	for (const combinationsAmount of [1, 2, 3, 4]) {
		// eslint-disable-next-line no-await-in-loop
		await tryCombinations(size, combinationsAmount, async () =>
			getSudokus(sudokuAmount, size),
		);
	}
}
