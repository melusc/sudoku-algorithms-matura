import {randomInt} from 'node:crypto';
import assert from 'node:assert/strict';

import {Sudoku} from '@lusc/sudoku';

function * generateIndices(s: Sudoku, size: number): Iterable<number[]> {
	const indices: number[] = [];

	for (const [i, c] of s.getCells().entries()) {
		if (c.content !== undefined) {
			indices.push(i);
		}
	}

	while (indices.length > 0) {
		const result: number[] = [];

		for (let i = 0; i < size && indices.length > 0; ++i) {
			const randIndicesIndex = randomInt(indices.length);
			result.push(indices[randIndicesIndex]!);
			indices.splice(randIndicesIndex, 1);
		}

		yield result;
	}
}

// This function generates valid sudokus
// by iterating through all cells from start and from back simultaneously
// and trying to randomly fill from `possibles`.
export const generateFilledSudoku = (size: number): Sudoku => {
	// If sqrt is an integer the number itself is as well
	assert(size > 0 && Number.isInteger(Math.sqrt(size)));

	let sudoku = new Sudoku(size);
	sudoku.shouldLogErrors = false;
	sudoku.mode = 'fast';

	/**
	 * For the given index try randomly from
	 * `possibles` until one is valid
	 */
	const tryFillCell = (index: number): void => {
		if (sudoku.getContent(index) !== undefined) {
			return;
		}

		if (sudoku.isSolved()) {
			return;
		}

		const candidates = [...sudoku.getCell(index).candidates];

		while (candidates.length > 0) {
			const randIndex = randomInt(candidates.length);
			const randNumber = candidates[randIndex]!;
			const newSudoku = sudoku.clone();

			newSudoku.setContent(index, randNumber);

			if (newSudoku.solve() !== 'error' && newSudoku.isValid()) {
				sudoku = newSudoku;
				return;
			}

			candidates.splice(randIndex, 1);
		}
	};

	// prettier-ignore
	const maxIndex = (size ** 2) - 1;
	for (let i = 0; !sudoku.isSolved() && i <= maxIndex / 2; ++i) {
		tryFillCell(i);
		tryFillCell(maxIndex - i);
	}

	sudoku.mode = 'thorough';
	if (sudoku.isSolved() && sudoku.isValid()) {
		return sudoku;
	}

	return generateFilledSudoku(size);
};

// This function gets a filled sudoku
// and randomly removes cells until the sudoku cannot
// be solved by `@lusc/sudoku` anymore
export const generateSudoku = (size: number): Sudoku => {
	const sudoku = generateFilledSudoku(size);

	const emptySudoku = (size: number): void => {
		for (const indices of generateIndices(sudoku, size)) {
			const newSudoku = sudoku.clone();
			for (const index of indices) {
				newSudoku.clearCell(index);
			}

			if (newSudoku.solve() === 'finish') {
				for (const index of indices) {
					sudoku.clearCell(index);
				}
			}
		}
	};

	// First try removing a bunch of numbers because it's cheaper
	// Then remove 2 numbers to remove as many as possible which is more expensive
	// prettier-ignore
	let amountIndices = (size ** (3 / 2)) + 2;
	do {
		emptySudoku(amountIndices);
	} while ((amountIndices -= size) > 1);

	return sudoku;
};
