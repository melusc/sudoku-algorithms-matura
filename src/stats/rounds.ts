import {rm, writeFile} from 'node:fs/promises';

import type {CombinationsResults} from '../try-combinations.js';
import {BetterMap} from '../utils.js';

import {outDir} from './utils.js';

const outFilePath = new URL('rounds.json', outDir);

await rm(outFilePath, {force: true});

const previous: Record<
	number,
	Record<
		number,
		{
			least: {leastRounds: number; plugins: string[][]};
			avg: Record<string, number>;
			avgByPlugin: Record<string, number>;
		}
	>
> = {};

export const rounds = async (
	{solved, combinationsAmount}: CombinationsResults,
	size: number,
): Promise<void> => {
	let leastRounds = Number.POSITIVE_INFINITY;
	const leastPlugins = new Set<string>();
	const makeAvgMap = () =>
		new BetterMap<string, {total: number; count: number}>(() => ({
			total: 0,
			count: 0,
		}));
	const avg = makeAvgMap();
	const avgByPlugin = makeAvgMap();

	for (const {rounds, plugins} of [...solved.values()].flat()) {
		leastRounds = Math.min(rounds, leastRounds);
		if (rounds < leastRounds) {
			leastRounds = rounds;
			leastPlugins.clear();
		} else if (rounds === leastRounds) {
			leastPlugins.add(plugins.join(','));
		}

		const pluginsAvg = avg.get(plugins.join(','));
		++pluginsAvg.count;
		pluginsAvg.total += rounds;

		for (const plugin of plugins) {
			const pluginAvg = avgByPlugin.get(plugin);
			++pluginAvg.count;
			pluginAvg.total += rounds;
		}
	}

	const avgToObject = (
		map: ReturnType<typeof makeAvgMap>,
	): Record<string, number> => {
		const result: Record<string, number> = {};
		for (const [key, {total, count}] of map) {
			result[key] = total / count;
		}

		return result;
	};

	(previous[size] ??= {})[combinationsAmount] = {
		least: {
			leastRounds,
			plugins: [...leastPlugins].map(s => s.split(',')),
		},
		avg: avgToObject(avg),
		avgByPlugin: avgToObject(avgByPlugin),
	};

	await writeFile(outFilePath, JSON.stringify(previous, undefined, '\t'));
};
