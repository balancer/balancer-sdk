import * as sor from './sor';
import * as pools from './pools';
import * as sdk from './sdk';
import * as data from './data';

const factories = { ...sor, ...pools, ...sdk, data };

export { factories };
