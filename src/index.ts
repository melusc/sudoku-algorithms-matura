import {getSudokus} from './cached-sudokus.js';

await getSudokus(2500, 9);
await getSudokus(2500, 16);
