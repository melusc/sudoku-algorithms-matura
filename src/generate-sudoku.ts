import {randomInt} from 'node:crypto';
import assert from 'node:assert/strict';

import {Sudoku} from '@lusc/sudoku';

// This function generates valid sudokus
// by iterating through all cells from start and from back simultaneously
// and trying to randomly fill from `possibles`.
export const generateFilledSudoku = (size: number): Sudoku => {
	assert(Number.isInteger(size) && size > 0);

	let sudoku = new Sudoku();
	sudoku.shouldLogErrors = false;

	/**
	 * For the given index try randomly from
	 * `possibles` until one is valid
	 */
	const tryFillCell = (index: number): void => {
		if (sudoku.getContent(index) !== undefined) {
			return;
		}

		const allPossibles = [...sudoku.getCell(index).possible];

		while (!sudoku.isSolved() && allPossibles.length > 0) {
			const randIndex = randomInt(allPossibles.length);
			const randNumber = allPossibles[randIndex]!;
			const newSudoku = sudoku.clone();

			newSudoku.setContent(index, randNumber);

			if (newSudoku.solve() !== 'error' && newSudoku.isValid()) {
				sudoku = newSudoku;
				return;
			}

			allPossibles.splice(randIndex, 1);
		}
	};

	// prettier-ignore
	const maxIndex = (size ** 2) - 1;
	for (let i = 0; !sudoku.isSolved() && i <= maxIndex / 2; ++i) {
		tryFillCell(i);
		tryFillCell(maxIndex - i);
	}

	if (sudoku.isSolved() && sudoku.isValid()) {
		return sudoku;
	}

	return generateFilledSudoku(size);
};

// This function gets a filled sudoku
// and randomly removes cells until the sudoku cannot
// be solved by `@lusc/sudoku` anymore
export const generateSudoku = (size: number): Sudoku => {
	assert(Number.isInteger(size) && size > 0);

	const sudoku = generateFilledSudoku(size);

	const indices = Array.from({length: size ** 2}, (_v, i) => i);

	while (indices.length > 0) {
		const newSudoku = sudoku.clone();
		const randIndexOfIndices = randomInt(indices.length);
		const randIndex = indices[randIndexOfIndices]!;

		const validity = newSudoku.clearCell(randIndex).solve();

		if (validity === 'finish') {
			sudoku.clearCell(randIndex);
		}

		indices.splice(randIndexOfIndices, 1);
	}

	return sudoku;
};
