// yarn test:only ./src/modules/liquidity/liquidity.module.spec.ts

import { PoolsStaticRepository } from '../data';
import { Pool } from '@/types';
import { expect } from 'chai';
import { Liquidity } from './liquidity.module';
import pools from '@/test/fixtures/liquidityPools.json';
import tokens from '@/test/fixtures/liquidityTokens.json';
import { StaticTokenPriceProvider } from '../data';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { tokensToTokenPrices } from '@/lib/utils';

const tokenPrices = tokensToTokenPrices(tokens);

const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
const poolProvider = new PoolsStaticRepository(pools as Pool[]);

let liquidityProvider: Liquidity;

beforeEach(() => {
  liquidityProvider = new Liquidity(poolProvider, tokenPriceProvider);
});

function findPool(address: string): Pool {
  const pool = pools.find((pool) => {
    return pool.address === address;
  });
  if (!pool) throw new Error('Could not find test pool of address: ' + address);
  return pool as Pool;
}

describe('Liquidity Module', () => {
  context('Weighted Pool Calculations', () => {
    it('Correct calculates liquidity of a 50/50 WBTC/WETH pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0xa6f548df93de924d73be7d25dc02554c6bd66db5')
      );
      expect(liquidity).to.be.eq('640000');
    });

    it('Correct calculates liquidity of a 60/40 pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73')
      );
      expect(liquidity).to.be.eq('10000');
    });

    it('Correctly calculates value of a 25/25/25/25 pool which is slightly imbalanced', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0xd8833594420db3d6589c1098dbdd073f52419dba')
      );
      expect(liquidity).to.be.eq('127080');
    });

    it('Should return 0 liquidity with no errors when all prices are undefined', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0x062f38735aac32320db5e2dbbeb07968351d7c72')
      );
      expect(liquidity).to.be.eq('0');
    });

    it('Should approximate liquidity when some prices are unknown', async () => {
      const pool = findPool('0x996616bde0cb4974e571f17d31c844da2bd177f8');
      const liquidity = await liquidityProvider.getLiquidity(pool);
      const wethAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
      const wethBalance =
        pool.tokens.find((token) => token.address === wethAddress)?.balance ||
        '0';
      const wethPrice = tokenPrices[wethAddress].usd || '0';
      const expectedLiquidity = parseFixed(wethBalance, 18)
        .mul(parseFixed(wethPrice, 0))
        .mul('2');
      expect(liquidity).to.be.eq(formatFixed(expectedLiquidity, 18));
    });

    it('Should work with this Vita pool', async () => {
      const pool = findPool('0xbaeec99c90e3420ec6c1e7a769d2a856d2898e4d');
      const liquidity = await liquidityProvider.getLiquidity(pool);
      expect(liquidity).to.be.eq('666366.860307633662004');
    });

    it('Should work with this NFT/Gaming index pool', async () => {
      const pool = findPool('0x344e8f99a55da2ba6b4b5158df2143374e400df2');
      const liquidity = await liquidityProvider.getLiquidity(pool);
      expect(liquidity).to.be.eq('116.303077211035488');
    });

    it('Should not show a huge amount of liquidity for this AKITA pool', async () => {
      const pool = findPool('0xc065798f227b49c150bcdc6cdc43149a12c4d757');
      const liquidity = await liquidityProvider.getLiquidity(pool);
      expect(liquidity).to.be.eq('7781301.384420056605162613');
    });

    it('Should return 0 and not throw an error if totalShares of a sub-pool is 0', async () => {
      const pool = findPool('0xd4e2af4507b6b89333441c0c398edffb40f86f4d');
      const liquidity = await liquidityProvider.getLiquidity(pool);
      expect(liquidity).to.be.eq('0');
    });
  });

  context('Stable Pool calculations', () => {
    it('Correctly calculates value of a USD 3pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0x06df3b2bbb68adc8b0e302443692037ed9f91b42')
      );
      expect(liquidity).to.be.eq('130524319.23');
    });

    it('Correctly calculates the liquidity of a 3pool with a missing price', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0x000f3b2bbb68adc8b0e302443692037ed9f91b42')
      );
      expect(liquidity).to.be.eq('130304713.065278948964422831');
    });
  });

  context('Metastable Pool calculations', () => {
    it('Correct calculates liquidity of a wstETH/ETH metastable pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0x32296969ef14eb0c6d29669c550d4a0449130230')
      );
      expect(liquidity).to.be.eq('154558160');
    });
  });

  context('StablePhantom Pool calculations', () => {
    it('Correctly calculates liquidity of a Boosted USD 3pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2')
      );
      expect(Number(liquidity).toFixed(8).toString()).to.be.eq(
        '176802743.05530426'
      );
    });

    it('Correctly calculates liquidity of a pool with normal ERC20 tokens in it', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0xe051605a83deae38d26a7346b100ef1ac2ef8a0b')
      );
      expect(Number(liquidity).toFixed(8).toString()).to.be.eq('0.20542282');
    });
  });

  context('Composable Stable pool calculations', () => {
    it('Correctly calculates liquidity of a composable stable pool with a boosted subpool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0xb54b2125b711cd183edd3dd09433439d53961652')
      );
      expect(Number(liquidity).toFixed(8).toString()).to.be.eq(
        '17901.40061800'
      );
    });
  });

  context('Gyro pool calculations', () => {
    it('should calculate liquidity of GyroE pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0x97469e6236bd467cd147065f77752b00efadce8a')
      );
      expect(Number(liquidity).toFixed(8).toString()).to.be.eq(
        '72556.77233529'
      );
    });
    it('should calculate liquidity of GyroV2 pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0xdac42eeb17758daa38caf9a3540c808247527ae3')
      );
      expect(Number(liquidity).toFixed(8).toString()).to.be.eq(
        '95599.14272397'
      );
    });
    it('should calculate liquidity of GyroV3 pool', async () => {
      const liquidity = await liquidityProvider.getLiquidity(
        findPool('0x17f1ef81707811ea15d9ee7c741179bbe2a63887')
      );
      expect(Number(liquidity).toFixed(8).toString()).to.be.eq(
        '53075.61583572'
      );
    });
  });
});
