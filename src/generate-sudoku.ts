import {randomInt} from 'node:crypto';
import assert from 'node:assert/strict';

import {Sudoku} from '@lusc/sudoku';

function * randomArrayItem<T>(array: T[]): Iterable<T> {
	while (array.length > 0) {
		const randIndex = randomInt(array.length);
		const item = array[randIndex]!;
		array.splice(randIndex, 1);
		yield item;
	}
}

// This function generates valid sudokus
// by iterating through all cells from start and from back simultaneously
// and trying to randomly fill from `possibles`.
export const generateFilledSudoku = (size: number): Sudoku => {
	console.time('generateFilledSudoku');

	// If sqrt is an integer the number itself is as well
	assert(size > 0 && Number.isInteger(Math.sqrt(size)));

	// Small boost by initialising first row
	// less calls to .solve and .isSolved
	const firstRow = [
		...randomArrayItem(Array.from({length: size}, (_v, i) => i)),
	];

	let sudoku = Sudoku.fromPrefilled([firstRow], size);

	sudoku.solve();

	sudoku.shouldLogErrors = false;

	/**
	 * For the given index try randomly from
	 * `possibles` until one is valid
	 */
	const tryFillCell = (index: number): void => {
		if (sudoku.getElement(index) !== undefined) {
			return;
		}

		const candidates = [...sudoku.getCell(index).candidates];

		for (const randNumber of randomArrayItem(candidates)) {
			const newSudoku = sudoku.clone();

			newSudoku.setElement(index, randNumber);

			if (newSudoku.solve() !== 'error' && newSudoku.isValid()) {
				sudoku = newSudoku;
				return;
			}
		}
	};

	const cellsLength = size ** 2;
	// eslint-disable-next-line no-bitwise
	for (let i = 0; i < cellsLength >> 1 && !sudoku.isSolved(); ++i) {
		tryFillCell(i);
		tryFillCell(cellsLength - i - 1);
	}

	console.timeEnd('generateFilledSudoku');

	if (sudoku.isSolved() && sudoku.isValid()) {
		return sudoku;
	}

	return generateFilledSudoku(size);
};

// This function gets a filled sudoku
// and randomly removes cells until the sudoku cannot
// be solved by `@lusc/sudoku` anymore
export const generateSudoku = (size: number): Sudoku => {
	// This includes time for generateFilledSudoku
	console.time('generateSudoku');

	const filledSudoku = generateFilledSudoku(size);

	const cells = filledSudoku.getCells().map((c, i) => [c.element!, i] as const);

	const mutatingSudoku = new Sudoku(size);

	for (const [content, index] of randomArrayItem(cells)) {
		if (mutatingSudoku.getCell(index).element === content) {
			filledSudoku.clearCell(index);
		} else {
			mutatingSudoku.setElement(index, content).solve();
		}
	}

	assert(mutatingSudoku.isSolved(), 'isSolved');
	assert(mutatingSudoku.isValid(), 'isValid');

	console.timeEnd('generateSudoku');
	return filledSudoku;
};
