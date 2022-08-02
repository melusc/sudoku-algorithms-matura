/* eslint-disable no-bitwise, capitalized-comments, max-depth */

import {writeFile} from 'node:fs/promises';

import {Sudoku, Cell, Structure} from '@lusc/sudoku';
// eslint-disable-next-line n/file-extension-in-import
import * as plugins from '@lusc/sudoku/plugins';
import Papa from 'papaparse';

import {CombinationsResults} from '../../try-combinations.js';
import {collator, makePaths} from '../utils.js';

const {csvOutPath} = makePaths('n-fish-stats');

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

type SudokuInternal = Sudoku & {
	removeCandidate: (cell: Cell | number, element: number) => void;
	anyChanged: boolean;
};

const throwIfInvalid = (structIndices: number[], indices: number[]): void => {
	/*
		[
			[1, 1, 1, ...],
			[1, 1, 1, ...],
			[1, 1, 1, ...],
			[1, 1, 1, ...],
			...
		]
		There's no way to place all 1s
		without duplicates
	*/

	if (structIndices.length > indices.length) {
		throw new Error(
			`Less structIndices than indices: structIndices={${structIndices.join(
				',',
			)}}, indices={${indices.join(',')}} (n fish)`,
		);
	}
};

/* https://www.sudokuonline.io/tips/sudoku-swordfish-strategy */

const nFishByStructure = (
	sudoku: SudokuInternal,
	getterName: 'getRow' | 'getCol',
): void => {
	const summary = new BetterMap<
		/* element: */ number,
		BetterMap<
			/* strucIndex */ number,
			{key: bigint; inStructureIndices: number[]}
		>
	>();

	/*
		Index all cell candidates
		For each row / col and each number
		add the index of the number:
		number[`cell candidate`][`row-index`] |= `index in row`
	*/
	for (let structureIndex = 0; structureIndex < sudoku.size; ++structureIndex) {
		const structure = sudoku[getterName](structureIndex);

		for (const [inStructureIndex, cell] of structure.entries()) {
			if (cell.element === undefined) {
				for (const candidate of eachCandidate(structure, cell)) {
					const candidateSummary = summary.defaultGet(
						candidate,
						() => new BetterMap(),
					);

					const item = candidateSummary.defaultGet(structureIndex, () => ({
						key: 0n,
						inStructureIndices: [],
					}));

					item.key |= 1n << BigInt(inStructureIndex);
					item.inStructureIndices.push(inStructureIndex);
				}
			}
		}
	}

	for (let element = 0; element < sudoku.size; ++element) {
		const elementSummary = summary.get(element);
		if (!elementSummary) {
			continue;
		}

		for (const {key: keyRef, inStructureIndices} of elementSummary.values()) {
			if (inStructureIndices.length === sudoku.size) {
				continue;
			}

			const structureIndices: number[] = [];
			for (const [structureIndex, entry] of elementSummary) {
				if ((keyRef & entry.key) === entry.key) {
					structureIndices.push(structureIndex);
				}
			}

			throwIfInvalid(structureIndices, inStructureIndices);

			if (inStructureIndices.length !== structureIndices.length) {
				continue;
			}

			const oldAnyChanged = sudoku.anyChanged;
			sudoku.anyChanged = false;

			for (const inStructureIndex of inStructureIndices) {
				const structure
					= sudoku[getterName === 'getCol' ? 'getRow' : 'getCol'](
						inStructureIndex,
					);

				for (const [structureIndex, cell] of structure.entries()) {
					if (!structureIndices.includes(structureIndex)) {
						sudoku.removeCandidate(cell, element);
					}
				}
			}

			emit({
				inStructureIndices,
				structureIndices,
				sudoku,
				getterName,
				madeChange: sudoku.anyChanged,
			});

			sudoku.anyChanged ||= oldAnyChanged;
		}
	}
};

type Match = {
	inStructureIndices: number[];
	structureIndices: number[];
	sudoku: Sudoku;
	getterName: 'getRow' | 'getCol';
	madeChange: boolean;
};

type MatchCb = (match: Match) => void;

const cbs = new Set<MatchCb>();
const onMatchFound = (cb: MatchCb): (() => void) => {
	cbs.add(cb);

	return () => {
		cbs.delete(cb);
	};
};

const emit = (match: Match) => {
	for (const cb of cbs) {
		cb(match);
	}
};

const nFish = (sudoku: SudokuInternal): void => {
	nFishByStructure(sudoku, 'getRow');
	nFishByStructure(sudoku, 'getCol');
};

export const nFishStats = async (
	combinations: CombinationsResults,
	size: number,
) => {
	for (const [sudokuString, combinationsResults] of combinations.combinations) {
		for (const combinationResult of combinationsResults) {
			const sudoku = Sudoku.fromString(sudokuString, size) as SudokuInternal;

			const off = onMatchFound(({structureIndices, madeChange}) => {
				const csvLine = csvLines.find(
					line =>
						line.size === size
						&& line.plugins === combinationResult.plugins.join('|')
						&& line.matchSize === structureIndices.length,
				);
				if (csvLine) {
					if (madeChange) {
						++csvLine.usefulMatches;
					}

					++csvLine.totalMatches;
				} else {
					csvLines.push({
						size,
						amount: combinationResult.plugins.length,
						matchSize: structureIndices.length,
						plugins: combinationResult.plugins.join('|'),
						usefulMatches: madeChange ? 1 : 0,
						totalMatches: 1,
					});
				}
			});

			do {
				sudoku.anyChanged = false;
				for (const plugin of combinationResult.plugins) {
					if (plugin === 'nFish') {
						nFish(sudoku);
					} else {
						plugins[plugin](sudoku);
					}
				}
			} while (sudoku.anyChanged && !sudoku.isSolved());

			off();
		}
	}

	await write();
};

const csvLines: Array<{
	size: number;
	amount: number;
	matchSize: number;
	plugins: string;
	usefulMatches: number;
	totalMatches: number;
}> = [];

export const write = async () => {
	csvLines.sort(
		(a, b) =>
			a.size - b.size
			|| a.amount - b.amount
			|| collator.compare(a.plugins, b.plugins),
	);

	await writeFile(csvOutPath, Papa.unparse(csvLines));
};
