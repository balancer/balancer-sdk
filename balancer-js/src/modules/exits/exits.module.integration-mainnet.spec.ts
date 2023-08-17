// yarn test:only ./src/modules/exits/exits.module.integration-mainnet.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network, PoolWithMethods } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { accuracy } from '@/test/lib/utils';
import { ADDRESSES, TEST_BLOCK } from '@/test/lib/constants';
import { setUpForkAndSdk, testFlow } from './testHelper';
import { JsonRpcSigner } from '@ethersproject/providers';

dotenv.config();

describe('generalised exit execution', async function () {
  let unwrappingTokensAmountsOut: string[];
  let unwrappingTokensGasUsed: BigNumber;
  let mainTokensAmountsOut: string[];
  let mainTokensGasUsed: BigNumber;
  let pool: { id: string; address: string; slot: number; decimals: number };
  let unwrapExitAmount: BigNumber;
  let mainExitAmount: BigNumber;
  let amountRatio: number;
  let sdk: BalancerSDK;
  let signer: JsonRpcSigner;

  const network = Network.MAINNET;
  const blockNo = TEST_BLOCK[Network.MAINNET];
  const poolAddresses = Object.values(ADDRESSES[network]).map(
    (address) => address.address
  );
  const slippage = '10'; // 10 bps = 0.1%

  beforeEach(async () => {
    const setup = await setUpForkAndSdk(
      network,
      blockNo,
      poolAddresses,
      [pool.address],
      [pool.slot],
      [parseFixed('120000000', 18).toString()]
    );
    sdk = setup.sdk;
    signer = setup.signer;
  });

  this.timeout(120000); // Sets timeout for all tests within this scope to 2 minutes
  context.only('aaveLinear V1 - bbausd', async () => {
    before(async () => {
      pool = ADDRESSES[network].bbausd;
      amountRatio = 2;
      // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
      unwrapExitAmount = parseFixed('2000', pool.decimals);
      // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
      mainExitAmount = unwrapExitAmount.div(amountRatio);
    });

    beforeEach(async () => {
      // prepare pool to have more wrapped than main tokens
      await testFlow(
        pool,
        slippage,
        parseFixed('1270000', 18).toString(),
        [],
        sdk,
        signer
      );
    });

    context('exit by unwrapping tokens', async () => {
      it('should exit via unwrapping', async () => {
        const parentPool = (await sdk.pools.find(pool.id)) as PoolWithMethods;
        const childPool0 = (await sdk.pools.findBy(
          'address',
          parentPool.tokensList[0]
        )) as PoolWithMethods;
        const childPool1 = (await sdk.pools.findBy(
          'address',
          parentPool.tokensList[1]
        )) as PoolWithMethods;
        const childPool2 = (await sdk.pools.findBy(
          'address',
          parentPool.tokensList[2]
        )) as PoolWithMethods;
        // log pool state to see if it's persisting between tests
        console.log('childPool0', childPool0.tokens);
        console.log('childPool1', childPool1.tokens);
        console.log('childPool2', childPool2.tokens);

        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          unwrapExitAmount.toString(),
          [ADDRESSES[network].DAI.address],
          sdk,
          signer
        );
        unwrappingTokensAmountsOut = expectedAmountsOut;
        unwrappingTokensGasUsed = gasUsed;
      });
    });

    context('exit to main tokens directly', async () => {
      it('should exit to main tokens directly', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          mainExitAmount.toString(),
          [],
          sdk,
          signer
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context('exit by unwrapping vs exit to main tokens', async () => {
      it('should return similar amounts (proportional to the input)', async () => {
        mainTokensAmountsOut.forEach((amount, i) => {
          const unwrappedAmount = BigNumber.from(
            unwrappingTokensAmountsOut[i]
          ).div(amountRatio);
          expect(
            accuracy(unwrappedAmount, BigNumber.from(amount))
          ).to.be.closeTo(1, 1e-4); // inaccuracy should not be over 1 bps
        });
      });
      it('should spend more gas when unwrapping tokens', async () => {
        expect(unwrappingTokensGasUsed.gt(mainTokensGasUsed)).to.be.true;
      });
    });
  });

  context('ERC4626 - bbausd3', async () => {
    before(async () => {
      pool = ADDRESSES[network].bbausd3;
      amountRatio = 10;
      // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
      unwrapExitAmount = parseFixed('10000000', pool.decimals);
      // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
      mainExitAmount = unwrapExitAmount.div(amountRatio);
    });

    context('exit by unwrapping tokens', async () => {
      it('should exit via unwrapping', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          unwrapExitAmount.toString(),
          [ADDRESSES[network].DAI.address],
          sdk,
          signer
        );
        unwrappingTokensAmountsOut = expectedAmountsOut;
        unwrappingTokensGasUsed = gasUsed;
      });
    });

    context('exit to main tokens directly', async () => {
      it('should exit to main tokens directly', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          mainExitAmount.toString(),
          [],
          sdk,
          signer
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context('exit by unwrapping vs exit to main tokens', async () => {
      it('should return similar amounts (proportional to the input)', async () => {
        mainTokensAmountsOut.forEach((amount, i) => {
          const unwrappedAmount = BigNumber.from(
            unwrappingTokensAmountsOut[i]
          ).div(amountRatio);
          expect(
            accuracy(unwrappedAmount, BigNumber.from(amount))
          ).to.be.closeTo(1, 1e-4); // inaccuracy should not be over 1 bps
        });
      });
      it('should spend more gas when unwrapping tokens', async () => {
        expect(unwrappingTokensGasUsed.gt(mainTokensGasUsed)).to.be.true;
      });
    });
  });

  context('GearboxLinear - bbgusd', async () => {
    before(async () => {
      pool = ADDRESSES[network].bbgusd;

      amountRatio = 100000;
      // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
      unwrapExitAmount = parseFixed('1000000', pool.decimals);
      // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
      mainExitAmount = unwrapExitAmount.div(amountRatio);
    });

    context('exit by unwrapping tokens', async () => {
      it('should exit via unwrapping', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          unwrapExitAmount.toString(),
          [ADDRESSES[network].USDC.address],
          sdk,
          signer
        );
        unwrappingTokensAmountsOut = expectedAmountsOut;
        unwrappingTokensGasUsed = gasUsed;
      });
    });

    context('exit to main tokens directly', async () => {
      it('should exit to main tokens directly', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          mainExitAmount.toString(),
          [],
          sdk,
          signer
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context('exit by unwrapping vs exit to main tokens', async () => {
      it('should return similar amounts (proportional to the input)', async () => {
        mainTokensAmountsOut.forEach((amount, i) => {
          const unwrappedAmount = BigNumber.from(
            unwrappingTokensAmountsOut[i]
          ).div(amountRatio);
          expect(
            accuracy(unwrappedAmount, BigNumber.from(amount))
          ).to.be.closeTo(1, 1e-4); // inaccuracy should not be over 1 bps
        });
      });
      it('should spend more gas when unwrapping tokens', async () => {
        expect(unwrappingTokensGasUsed.gt(mainTokensGasUsed)).to.be.true;
      });
    });
  });

  context('AaveLinear - bbausd2', async () => {
    before(async () => {
      pool = ADDRESSES[network].bbausd2;

      amountRatio = 1000;
      // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
      unwrapExitAmount = parseFixed('3000000', pool.decimals);
      // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
      mainExitAmount = unwrapExitAmount.div(amountRatio);
    });

    context('exit by unwrapping tokens', async () => {
      it('should exit via unwrapping', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          unwrapExitAmount.toString(),
          [ADDRESSES[network].DAI.address],
          sdk,
          signer
        );
        unwrappingTokensAmountsOut = expectedAmountsOut;
        unwrappingTokensGasUsed = gasUsed;
      });
    });

    context('exit to main tokens directly', async () => {
      it('should exit to main tokens directly', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          mainExitAmount.toString(),
          [],
          sdk,
          signer
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context('exit by unwrapping vs exit to main tokens', async () => {
      it('should return similar amounts (proportional to the input)', async () => {
        mainTokensAmountsOut.forEach((amount, i) => {
          const unwrappedAmount = BigNumber.from(
            unwrappingTokensAmountsOut[i]
          ).div(amountRatio);
          expect(
            accuracy(unwrappedAmount, BigNumber.from(amount))
          ).to.be.closeTo(1, 1e-3); // inaccuracy should not be over 10 bps
        });
      });
      it('should spend more gas when unwrapping tokens', async () => {
        expect(unwrappingTokensGasUsed.gt(mainTokensGasUsed)).to.be.true;
      });
    });
  });
});
