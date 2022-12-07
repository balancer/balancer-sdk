/* eslint-disable @typescript-eslint/no-explicit-any */

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { ImpermanentLossService } from '@/modules/pools/impermanentLoss/impermanentLossService';
import {
  MockHistoricalPriceProvider,
  MockPriceProvider,
} from '@/test/lib/ImpermanentLossData';
import { Pool } from '@/types';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { repositores, aaveRates } from '@/test/factories/data';

const stubbedRepositores = repositores({});

dotenv.config();

const mockTokenPriceProvider = new MockPriceProvider(
  stubbedRepositores.tokenPrices,
  stubbedRepositores.tokenPrices,
  aaveRates
);
const mockHistoricalTokenPriceProvider = new MockHistoricalPriceProvider(
  stubbedRepositores.tokenPrices,
  aaveRates
);

const service = new ImpermanentLossService(
  mockTokenPriceProvider,
  mockHistoricalTokenPriceProvider
);

describe('ImpermanentLossService', () => {
  context('service.getWeights', () => {
    it('should return uniform distributed weights', async () => {
      const poolTokens = [
        {
          balance: '20252425.874518101545808004',
          address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
          weight: null,
        },
        {
          balance: '19238580.71904976339020527',
          address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
          weight: null,
        },
      ];
      const weights = service.getWeights(poolTokens);
      expect(weights).length(2);
      expect(weights[0]).eq(0.5);
      expect(weights[1]).eq(0.5);
    });
    it('should return proper weights', async () => {
      const poolTokens = [
        {
          weight: '0.2',
          balance: '0.440401496163206405',
          address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        },
        {
          weight: '0.8',
          balance: '1005938.192755235524459442',
          address: '0xe3627374ac4baf5375e79251b0af23afc450fc0e',
        },
      ];
      const weights = service.getWeights(poolTokens);
      expect(weights).length(2);
      expect(weights[0]).eq(0.2);
      expect(weights[1]).eq(0.8);
    });
    it('should throw error if missing weight', async () => {
      const poolTokens = [
        {
          weight: null,
          balance: '0.440401496163206405',
          address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        },
        {
          weight: '0.8',
          balance: '1005938.192755235524459442',
          address: '0xe3627374ac4baf5375e79251b0af23afc450fc0e',
        },
      ];
      try {
        service.getWeights(poolTokens);
      } catch (e: any) {
        expect(e.message).eq(
          BalancerError.getMessage(BalancerErrorCode.MISSING_WEIGHT)
        );
      }
    });
  });
  context('service.getDelta', () => {
    it('should return 50% delta variation', async () => {
      const delta = service.getDelta(10, 15);
      expect(delta).eq(0.5);
    });
    it('should return no delta variation', async () => {
      const delta = service.getDelta(10, 10);
      expect(delta).eq(0);
    });
    it('should return negative delta variation', async () => {
      const delta = service.getDelta(15, 10);
      expect(delta).closeTo(-0.3333, 3);
    });
    it('should return negative delta variation', async () => {
      const delta = service.getDelta(15, 10);
      expect(delta).closeTo(-0.3333, 3);
    });
    it('should throw an error for wrong parameter', async () => {
      try {
        service.getDelta(0, 10);
      } catch (e: any) {
        expect(e.message).eq(
          BalancerError.getMessage(BalancerErrorCode.ILLEGAL_PARAMETER)
        );
      }
    });
  });
  context('service.getEntryPrices', () => {
    it('should return prices for tokens', async () => {
      const tokens = [
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
      ];
      const prices = await service.getEntryPrices(1666276501, tokens);
      expect(prices['0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270']).eq(
        0.9993785272283172
      );
      expect(prices['0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4']).eq(
        1.9996776052990013
      );
    });
    it('should throw error for missing prices', async () => {
      const tokens = [
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      ];
      try {
        await service.getEntryPrices(1666276501, tokens);
      } catch (e: any) {
        expect(e.message).eq(
          BalancerError.getMessage(BalancerErrorCode.MISSING_PRICE_RATE)
        );
      }
    });
  });
  context('service.getExitPrices', () => {
    it('should return exit prices for tokens', async () => {
      const poolTokens = [
        {
          balance: '20252425.874518101545808004',
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          weight: null,
        },
        {
          balance: '19238580.71904976339020527',
          address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          weight: null,
        },
      ];
      const prices = await service.getExitPrices(poolTokens);
      expect(prices['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48']).eq(1.002);
      expect(prices['0x6b175474e89094c44da98b954eedeac495271d0f']).eq(1.002);
    });
    it('should throw error for missing prices', async () => {
      const poolTokens = [
        {
          balance: '20252425.874518101545808004',
          address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
          weight: null,
        },
        {
          balance: '19238580.71904976339020527',
          address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          weight: null,
        },
      ];
      try {
        await service.getExitPrices(poolTokens);
      } catch (e: any) {
        expect(e.message).eq(
          BalancerError.getMessage(BalancerErrorCode.MISSING_PRICE_RATE)
        );
      }
    });
  });
  context('service.getAssets', () => {
    it('should returns a list of assets with deltas and weights', async () => {
      const poolTokens = [
        {
          balance: '20252425.874518101545808004',
          address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
          weight: null,
        },
        {
          balance: '19238580.71904976339020527',
          address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
          weight: null,
        },
      ];
      const weights = [0.5, 0.5];
      const entryPrices = {
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 10,
        '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4': 15,
      };
      const exitPrices = {
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 15,
        '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4': 10,
      };
      const assets = service.getAssets(
        poolTokens,
        exitPrices,
        entryPrices,
        weights
      );
      expect(assets).length(2);
      expect(assets[0].priceDelta).eq(0.5);
      expect(assets[1].priceDelta).closeTo(-0.3333, 3);
      expect(assets[0].weight).eq(0.5);
      expect(assets[1].weight).eq(0.5);
    });
  });
  context('service.prepareData', () => {
    it('should return a list of assets with proper deltas and weights', async () => {
      const poolTokens = [
        {
          balance: '20252425.874518101545808004',
          address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
          weight: null,
        },
        {
          balance: '19238580.71904976339020527',
          address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
          weight: null,
        },
      ];
      const pool = {
        tokens: poolTokens,
        address: '0x8159462d255c1d24915cb51ec361f700174cd994',
      } as unknown as Pool;
      const assets = await service.prepareData(1666276501, pool);
      expect(assets).length(2);
      expect(assets[0].priceDelta).eq(0.00262310295874897);
      expect(assets[1].priceDelta).eq(-0.49891922710702347);
      expect(assets[0].weight).eq(0.5);
      expect(assets[1].weight).eq(0.5);
    });
  });
  context('service.calculateImpermanentLoss', () => {
    context('for uniform distributed tokens', () => {
      it('should return proper value for deltas [0.2%, -49.89%]', async () => {
        const assets = [
          {
            priceDelta: 0.00262310295874897,
            weight: 0.5,
          },
          {
            priceDelta: -0.49891922710702347,
            weight: 0.5,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(5.72);
      });
      it('should return proper value for deltas [0%, -49.89%]', async () => {
        const assets = [
          {
            priceDelta: 0,
            weight: 0.5,
          },
          {
            priceDelta: -0.49891922710702347,
            weight: 0.5,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(5.68);
      });
      it('should return proper value for deltas [0%, 50%]', async () => {
        const assets = [
          {
            priceDelta: 0,
            weight: 0.5,
          },
          {
            priceDelta: 0.5,
            weight: 0.5,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(2.02);
      });
      it('should return IL = 0', async () => {
        const assets = [
          {
            priceDelta: 0.5,
            weight: 0.5,
          },
          {
            priceDelta: 0.5,
            weight: 0.5,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(0);
      });
    });
    context('for not uniform distributed tokens', () => {
      it('should return proper value for deltas [0.2%, -49.89%]', async () => {
        const assets = [
          {
            priceDelta: 0.00262310295874897,
            weight: 0.8,
          },
          {
            priceDelta: -0.49891922710702347,
            weight: 0.2,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(3.27);
      });
      it('should return proper value for deltas [0%, -49.89%]', async () => {
        const assets = [
          {
            priceDelta: 0,
            weight: 0.8,
          },
          {
            priceDelta: -0.49891922710702347,
            weight: 0.2,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(3.25);
      });
      it('should return proper value for deltas [0%, 50%]', async () => {
        const assets = [
          {
            priceDelta: 0,
            weight: 0.8,
          },
          {
            priceDelta: 0.5,
            weight: 0.2,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(1.41);
      });
      it('should return IL = 0', async () => {
        const assets = [
          {
            priceDelta: 0.5,
            weight: 0.8,
          },
          {
            priceDelta: 0.5,
            weight: 0.2,
          },
        ];
        const poolValueDelta = service.getPoolValueDelta(assets);
        const holdValueDelta = service.getHoldValueDelta(assets);
        const IL = service.calculateImpermanentLoss(
          poolValueDelta,
          holdValueDelta
        );
        expect(IL).eq(0);
      });
    });
  });
  context('service.calcImpLoss', () => {
    it('should throw error for timestamp in the future', async () => {
      const poolTokens = [
        {
          balance: '20252425.874518101545808004',
          address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
          weight: null,
        },
        {
          balance: '19238580.71904976339020527',
          address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
          weight: null,
        },
      ];
      const pool = {
        tokens: poolTokens,
        address: '0x8159462d255c1d24915cb51ec361f700174cd994',
      } as unknown as Pool;
      try {
        await service.calcImpLoss(Date.now() + 3600000, pool);
      } catch (e: any) {
        expect(e.message).eq(
          BalancerError.getMessage(BalancerErrorCode.TIMESTAMP_IN_THE_FUTURE)
        );
      }
    });
    it('should return impermanentLoss', async () => {
      const poolTokens = [
        {
          balance: '20252425.874518101545808004',
          address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
          weight: null,
        },
        {
          balance: '19238580.71904976339020527',
          address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
          weight: null,
        },
      ];
      const pool = {
        tokens: poolTokens,
        address: '0x8159462d255c1d24915cb51ec361f700174cd994',
      } as unknown as Pool;
      const IL = await service.calcImpLoss(1666276501, pool);
      expect(IL).eq(5.72);
    });
  });
});
