import { TokenBalance } from '@/types';
import { expect } from 'chai';
import { WeightedPoolLiquidity } from './liquidity.concern';

const weightedPoolLiquidity = new WeightedPoolLiquidity();

describe('Weighted Pool Liquidity Concern', () => {
    it('Correctly calculates value of a 50/50 pool', () => {
        const tokenBalances: TokenBalance[] = [
            {
                token: {
                    symbol: 'DAI',
                    address: '0xDAI',
                    price: '1',
                    decimals: 6,
                },
                balance: '5000',
                weight: '0.5',
            },
            {
                token: {
                    symbol: 'ETH',
                    address: '0x000',
                    price: '2000',
                    decimals: 18,
                },
                balance: '2.5',
                weight: '0.5',
            },
        ];
        const liquidity = weightedPoolLiquidity.calcTotal(tokenBalances);
        expect(liquidity).to.be.eq('10000');
    });
});
