import {stats} from './stats/index.js';

for (let i = 1; i <= 5; ++i) {
	// eslint-disable-next-line no-await-in-loop
	await stats(i);
}
