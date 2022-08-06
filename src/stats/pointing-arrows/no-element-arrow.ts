import {writeFile} from 'node:fs/promises';

import {Sudoku, Structure, Cell} from '@lusc/sudoku';

import {CombinationsResults} from '../../try-combinations.js';
import {makePaths} from '../utils.js';

const {jsonOutPath} = makePaths('pointing-arrows-no-element-arrow');

type SudokuInternal = Sudoku & {
	blockWidth: number;
	removeCandidate: (cell: Cell | number, element: number) => void;
	anyChanged: boolean;
};

function * eachCandidate(structure: Structure, cell: Cell): Iterable<number> {
	for (const candidate of cell.candidates) {
		if (structure.elements[candidate] === 0) {
			yield candidate;
		}
	}
}

class BetterMap<K, V> extends Map<K, V> {
	defaultGet(key: K, defaultFactory: () => V): V {
		if (!this.has(key)) {
			this.set(key, defaultFactory());
		}

		return this.get(key)!;
	}
}

const clearSection = (
	structure: Structure,
	sudoku: SudokuInternal,
	blockIndex: number,
	numberToRemove: number,
): void => {
	const {blockWidth} = sudoku;

	for (const [index, cell] of structure.entries()) {
		if (index >= blockIndex && index < blockIndex + blockWidth) {
			continue;
		}

		sudoku.removeCandidate(cell, numberToRemove);
	}
};

const pointingArrows = (sudoku: SudokuInternal): void => {
	const {size, blockWidth} = sudoku;

	for (let blockIndex = 0; blockIndex < size; ++blockIndex) {
		const block = sudoku.getBlock(blockIndex);
		const blockRowIndex = Math.trunc(blockIndex / blockWidth) * blockWidth;
		const blockColIndex = (blockIndex % blockWidth) * blockWidth;

		const summary = new BetterMap<
			number,
			{
				row: Set<number>;
				col: Set<number>;
			}
		>();

		for (const [index, cell] of block.entries()) {
			const row = Math.trunc(index / blockWidth);
			const col = index % blockWidth;

			if (cell.element === undefined) {
				for (const candidate of eachCandidate(block, cell)) {
					const item = summary.defaultGet(candidate, () => ({
						row: new Set(),
						col: new Set(),
					}));
					item.row.add(row);
					item.col.add(col);
				}
			}
		}

		for (const [number, {row, col}] of summary) {
			if (col.size === 1) {
				clearSection(
					sudoku.getCol(blockColIndex + [...col][0]!),
					sudoku,
					blockRowIndex,
					number,
				);
			}

			if (row.size === 1) {
				clearSection(
					sudoku.getRow(blockRowIndex + [...row][0]!),
					sudoku,
					blockColIndex,
					number,
				);
			}
		}
	}
};

const solved: Array<{
	size: number;
	stringified: string;
}> = [];
export const pointingArrowsNoElementArrow = async (
	combinations: CombinationsResults,
	size: number,
) => {
	if (combinations.combinationsAmount !== 1) {
		return;
	}

	for (const [sudokuStringified] of combinations.combinations) {
		const s = Sudoku.fromString(sudokuStringified, size) as SudokuInternal;

		do {
			s.anyChanged = false;
			pointingArrows(s);
		} while (s.anyChanged && !s.isSolved());

		if (s.isSolved()) {
			solved.push({
				stringified: sudokuStringified,
				size,
			});
		}
	}

	await writeFile(jsonOutPath, JSON.stringify(solved));
};
