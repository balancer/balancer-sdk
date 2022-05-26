import {
    BalancerSdkConfig,
    Network,
    StaticTokenProvider,
    StaticPoolProvider,
} from '../../';
import { Token, TokenBalance } from '@/types';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { expect } from 'chai';
import { Liquidity } from './liquidity.module';
import pools from '@/test/lib/liquidityPools.json';
import tokens from '@/test/lib/liquidityTokens.json';
import tokenPrices from '@/test/lib/liquidityTokenPrices.json';
import { StaticTokenPriceProvider } from '../data-providers/token-price/static.provider';

const tokenProvider = new StaticTokenProvider(tokens);
const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
const poolProvider = new StaticPoolProvider(pools);

let liquidityProvider: Liquidity;

beforeEach(() => {
    const config: BalancerSdkConfig = {
        network: Network.MAINNET,
        rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
    };
    liquidityProvider = new Liquidity(
        config,
        poolProvider,
        tokenProvider,
        tokenPriceProvider
    );
});

describe('Weighted Pool Liquidity Concern', () => {
    it('Correctly calculates value of a 60/40 pool', async () => {
        const liquidity = await liquidityProvider.getLiquidity(pools[0]);
        expect(liquidity).to.be.eq('10000.0');
    });
});
