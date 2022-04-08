import {writeFile} from 'node:fs/promises';
import {Sudoku} from '@lusc/sudoku';

const s = Sudoku.fromString(
	'    76  2 1  4  5 752  36   2   7  11   2  4 634  172  71  48 99',
	9,
);

const {steps} = s as any as {steps: any[]};

await writeFile(
	new URL('../../out.jsonl', import.meta.url),
	steps.map(s => JSON.stringify(s)).join('\n'),
);
