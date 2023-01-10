import * as sor from './sor';
import * as pools from './pools';
import * as liquidityGauges from './liquidity-gauges';
import * as sdk from './sdk';
import * as data from './data';

const factories = { ...sor, ...pools, ...sdk, ...liquidityGauges, data };

export { factories };
