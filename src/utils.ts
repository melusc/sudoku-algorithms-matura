// eslint-disable-next-line n/file-extension-in-import
import * as plugins from '@lusc/sudoku/plugins';

/**
 * Remove the pain of
 * @example
 * let x = map.get(key);
 * if(!x){
 *   x = ...;
 *   map.set(key, x);
 * }
 * // Finally do something with x
 */

export class BetterMap<K, V> extends Map<K, V> {
	readonly #factory: () => V;

	constructor(factory: () => V) {
		super();
		this.#factory = factory;
	}

	override get(key: K): V {
		const previousValue = super.get(key);
		if (previousValue) {
			return previousValue;
		}

		const defaultvalue = this.#factory();
		this.set(key, defaultvalue);
		return defaultvalue;
	}
}

export type Plugins = typeof plugins;
export type PluginKeys = keyof Plugins;

const keys = Object.keys(plugins) as PluginKeys[];
export function * everyCombination(
	size: number,
	offset = 0,
	previous: PluginKeys[] = [],
): Iterable<PluginKeys[]> {
	if (size === 0) {
		yield previous;
		return;
	}

	for (let i = offset; i < keys.length; ++i) {
		const pluginName = keys[i]!;

		yield * everyCombination(size - 1, i + 1, [...previous, pluginName]);
	}
}
