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
