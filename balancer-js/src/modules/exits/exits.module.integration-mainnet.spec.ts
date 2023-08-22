// yarn test:only ./src/modules/exits/exits.module.integration-mainnet.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { accuracy } from '@/test/lib/utils';
import { ADDRESSES, TEST_BLOCK } from '@/test/lib/constants';
import { testFlow } from './testHelper';

dotenv.config();

const TEST_BBAUSD3 = true;

const blockNo = TEST_BLOCK[Network.MAINNET];

// The tests that are skipped are because wrappedToken rate can no longer be fetched onchain
describe('generalised exit execution', async function () {
  this.timeout(120000); // Sets timeout for all tests within this scope to 2 minutes
  context('aaveLinear V1 - bbausd', async () => {
    const network = Network.MAINNET;
    const pool = ADDRESSES[network].bbausd;
    const slippage = '10'; // 10 bps = 0.1%
    const poolAddresses = Object.values(ADDRESSES[network]).map(
      (address) => address.address
    );

    const amountRatio = 10;
    // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
    const unwrapExitAmount = parseFixed('1273000', pool.decimals);
    // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
    const mainExitAmount = unwrapExitAmount.div(amountRatio);

    context('exit to main tokens directly', async () => {
      it('should exit to main tokens directly', async () => {
        await testFlow(
          pool,
          slippage,
          mainExitAmount.toString(),
          [],
          network,
          blockNo,
          poolAddresses
        );
      });
    });
  });

  context('ERC4626 - bbausd3', async () => {
    if (!TEST_BBAUSD3) return true;
    const network = Network.MAINNET;
    const pool = ADDRESSES[network].bbausd3;
    const slippage = '10'; // 10 bps = 0.1%
    let unwrappingTokensAmountsOut: string[];
    let unwrappingTokensGasUsed: BigNumber;
    let mainTokensAmountsOut: string[];
    let mainTokensGasUsed: BigNumber;
    const poolAddresses = Object.values(ADDRESSES[network]).map(
      (address) => address.address
    );

    const amountRatio = 10;
    // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
    const unwrapExitAmount = parseFixed('10000000', pool.decimals);
    // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
    const mainExitAmount = unwrapExitAmount.div(amountRatio);

    context('exit by unwrapping tokens', async () => {
      it.skip('should exit via unwrapping', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          unwrapExitAmount.toString(),
          [ADDRESSES[network].DAI.address],
          network,
          blockNo,
          poolAddresses
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
          network,
          blockNo,
          poolAddresses
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context.skip('exit by unwrapping vs exit to main tokens', async () => {
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
    const network = Network.MAINNET;
    const pool = ADDRESSES[network].bbgusd;
    const slippage = '10'; // 10 bps = 0.1%
    let unwrappingTokensAmountsOut: string[];
    let unwrappingTokensGasUsed: BigNumber;
    let mainTokensAmountsOut: string[];
    let mainTokensGasUsed: BigNumber;
    const poolAddresses = Object.values(ADDRESSES[network]).map(
      (address) => address.address
    );

    const amountRatio = 100000;
    // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
    const unwrapExitAmount = parseFixed('1000000', pool.decimals);
    // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
    const mainExitAmount = unwrapExitAmount.div(amountRatio);

    context.skip('exit by unwrapping tokens', async () => {
      it('should exit via unwrapping', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          unwrapExitAmount.toString(),
          [ADDRESSES[network].USDC.address],
          network,
          blockNo,
          poolAddresses
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
          network,
          blockNo,
          poolAddresses
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context.skip('exit by unwrapping vs exit to main tokens', async () => {
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
    const network = Network.MAINNET;
    const pool = ADDRESSES[network].bbausd2;
    const slippage = '10'; // 10 bps = 0.1%
    let unwrappingTokensAmountsOut: string[];
    let unwrappingTokensGasUsed: BigNumber;
    let mainTokensAmountsOut: string[];
    let mainTokensGasUsed: BigNumber;
    const poolAddresses = Object.values(ADDRESSES[network]).map(
      (address) => address.address
    );

    const amountRatio = 1000;
    // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
    const unwrapExitAmount = parseFixed('3000000', pool.decimals);
    // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
    const mainExitAmount = unwrapExitAmount.div(amountRatio);

    context.skip('exit by unwrapping tokens', async () => {
      it('should exit via unwrapping', async () => {
        const { expectedAmountsOut, gasUsed } = await testFlow(
          pool,
          slippage,
          unwrapExitAmount.toString(),
          [ADDRESSES[network].DAI.address],
          network,
          blockNo,
          poolAddresses
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
          network,
          blockNo,
          poolAddresses
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context.skip('exit by unwrapping vs exit to main tokens', async () => {
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
