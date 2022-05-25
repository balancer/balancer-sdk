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

const tokens: Token[] = [
    {
        symbol: 'DAI',
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        price: '2000',
        decimals: 18,
    },
    {
        symbol: 'WETH',
        address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        price: '1',
        decimals: 18,
    },
];

const tokenProvider = new StaticTokenProvider(tokens);

const pools: SubgraphPoolBase[] = [
    {
        address: '0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73',
        wrappedIndex: 0,
        mainIndex: 0,
        tokensList: [
            '0x6b175474e89094c44da98b954eedeac495271d0f',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        ],
        poolType: 'Weighted',
        totalShares: '19.249031279382203913',
        swapEnabled: true,
        totalWeight: '1',
        tokens: [
            {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                priceRate: '1',
                balance: '4000',
                decimals: 18,
                weight: '0.4',
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                priceRate: '1',
                balance: '3',
                decimals: 18,
                weight: '0.6',
            },
        ],
        id: '0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73000200000000000000000004',
        swapFee: '0.0025',
    },
];

const poolProvider = new StaticPoolProvider(pools);

let liquidityProvider: Liquidity;

beforeEach(() => {
    const config: BalancerSdkConfig = {
        network: Network.MAINNET,
        rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
    };
    liquidityProvider = new Liquidity(config, poolProvider, tokenProvider);
});

describe('Weighted Pool Liquidity Concern', () => {
    it('Correctly calculates value of a 60/40 pool', async () => {
        const liquidity = await liquidityProvider.getLiquidity(pools[0]);
        expect(liquidity).to.be.eq('10000');
    });
});
