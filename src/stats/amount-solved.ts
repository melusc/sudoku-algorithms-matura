import {rm, writeFile} from 'node:fs/promises';

import type {CombinationsResults} from '../try-combinations.js';
import {BetterMap} from '../utils.js';

import {outDir} from './utils.js';

const outFilePath = new URL('amount-solved.json', outDir);

await rm(outFilePath, {force: true});

const previous: Record<
	number,
	Record<
		number,
		{
			combination: Record<string, number>;
			perPlugin: Record<string, number>;
		}
	>
> = {};
//                     ^ size
//                                    ^ amount combinations
//                                                   ^ plugin
//                                                           ^ relative amount

export const amountSolved = async (
	{solved, combinationsAmount}: CombinationsResults,
	size: number,
): Promise<void> => {
	const amount = new BetterMap<string, number>(() => 0);
	const amountByPlugin = new BetterMap<string, number>(() => 0);
	for (const allPlugins of solved.values()) {
		for (const {plugins} of allPlugins) {
			const key = plugins.join(',');
			amount.set(key, amount.get(key) + 1);

			for (const plugin of plugins) {
				amountByPlugin.set(plugin, amountByPlugin.get(plugin) + 1);
			}
		}
	}

	(previous[size] ??= {})[combinationsAmount] = {
		combination: Object.fromEntries(amount),
		perPlugin: Object.fromEntries(amountByPlugin),
	};

	await writeFile(outFilePath, JSON.stringify(previous, undefined, '\t'));
};
