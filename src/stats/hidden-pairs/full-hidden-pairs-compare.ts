import {writeFile} from 'node:fs/promises';

import {Cell, Structure, Sudoku} from '@lusc/sudoku';
// eslint-disable-next-line n/file-extension-in-import
import {removeByElements} from '@lusc/sudoku/plugins';

import {CombinationsResults} from '../../try-combinations.js';
import {makePaths} from '../utils.js';

const {jsonOutPath} = makePaths('full-hidden-pairs-compare');

function * eachCandidate(structure: Structure, cell: Cell): Iterable<number> {
	for (const candidate of cell.candidates) {
		if (structure.elements[candidate] === 0) {
			yield candidate;
		}
	}
}

function isEqual(s1: Sudoku, s2: Sudoku) {
	return s1.getCells().every(({element, candidates}, index) => {
		const cell2 = s2.getCell(index);
		if (element !== undefined) {
			return cell2.element === element;
		}

		return (
			cell2.candidates.size === candidates.size
			&& [...candidates].every(Set.prototype.has.bind(cell2.candidates))
		);
	});
}

type SudokuInternal = Sudoku & {
	anyChanged: boolean;
	overrideCandidates(cell: Cell, candidates: Set<number>): void;
};

function fullHiddenPairsPerStructure(
	structure: Structure,
	sudoku: SudokuInternal,
) {
	const summary = new Map<number, Set<Cell>>();

	for (const cell of structure) {
		if (cell.element === undefined) {
			for (const candidate of eachCandidate(structure, cell)) {
				if (summary.has(candidate)) {
					summary.get(candidate)!.add(cell);
				} else {
					summary.set(candidate, new Set([cell]));
				}
			}
		}
	}

	/** @type {Array<{cells: Set<(import('@lusc/sudoku').Cell)>, candidates: number[]}>} */
	const combinations: Array<{
		candidates: number[];
		cells: Set<Cell>;
	}> = [];

	for (const [candidate, cells] of summary) {
		for (let i = 0, l = combinations.length; i < l; ++i) {
			combinations.push({
				candidates: [...combinations[i]!.candidates, candidate],
				cells: new Set([...combinations[i]!.cells, ...cells]),
			});
		}

		combinations.push({
			candidates: [candidate],
			cells: new Set(cells),
		});
	}

	for (const combination of combinations) {
		if (
			combination.candidates.length !== combination.cells.size
			|| combination.candidates.length === sudoku.size
		) {
			continue;
		}

		for (const cell of combination.cells) {
			sudoku.overrideCandidates(cell, new Set(combination.candidates));
		}
	}
}

function fullHiddenPairs(sudoku: SudokuInternal) {
	for (const structure of sudoku.eachStructure()) {
		fullHiddenPairsPerStructure(structure, sudoku);
	}
}

function solveWith(
	sudoku: SudokuInternal,
	solvers: Array<(s: SudokuInternal) => void>,
) {
	do {
		sudoku.anyChanged = false;
		for (const solver of solvers) {
			solver(sudoku);
		}
	} while (sudoku.anyChanged && !sudoku.isSolved());
}

const results: Record<number, string[]> = {};
export async function fullHiddenPairsCompare(
	combinations: CombinationsResults,
	size: number,
): Promise<void> {
	if (combinations.combinationsAmount !== 1) {
		return;
	}

	const diff: string[] = [];

	for (const [sudokuString] of combinations.combinations) {
		const sudoku = Sudoku.fromString(sudokuString, size);

		const sHpRbe = sudoku.clone() as SudokuInternal;
		solveWith(sHpRbe, [fullHiddenPairs, removeByElements]);
		const sFhp = sudoku.clone() as SudokuInternal;
		solveWith(sFhp, [fullHiddenPairs]);

		if (!isEqual(sHpRbe, sFhp)) {
			diff.push(sudokuString);
		}
	}

	results[size] = diff;

	await writeFile(jsonOutPath, JSON.stringify(results));
}
