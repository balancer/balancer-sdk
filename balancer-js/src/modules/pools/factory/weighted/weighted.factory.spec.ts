// yarn test:only ./src/modules/pools/factory/weighted/weighted.factory.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { assert } from 'chai';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { BalancerSDK } from '@/modules/sdk.module';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerSdkConfig, Network, PoolType } from '@/types';

const network = Network.MAINNET;
const sdkConfig: BalancerSdkConfig = {
  network,
  rpcUrl: '',
};
const balancer = new BalancerSDK(sdkConfig);

describe('Weighted Factory', async () => {
  const factory = balancer.pools.poolFactory.of(PoolType.Weighted);
  context('Create', async () => {
    const rightCreateParameters = {
      name: 'test-pool',
      symbol: 'test-pool',
      tokenAddresses: [
        ADDRESSES[network].WETH.address,
        ADDRESSES[network].DAI.address,
      ],
      normalizedWeights: [
        parseFixed('0.5', 18).toString(),
        parseFixed('0.5', 18).toString(),
      ],
      rateProviders: [AddressZero, AddressZero],
      swapFeeEvm: parseFixed('0.01', 18).toString(),
      owner: AddressZero,
    };
    it('should fail with swap fee 0', async () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            swapFeeEvm: '0',
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.INVALID_SWAP_FEE_PERCENTAGE)
      );
    });
    it('should fail with swap fee greater than 1e18', async () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            swapFeeEvm: parseFixed('1.01', 17).toString(),
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.INVALID_SWAP_FEE_PERCENTAGE)
      );
    });
    it('should fail with input length mismatch', async () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            normalizedWeights: [
              parseFixed('0.2', 18).toString(),
              parseFixed('0.2', 18).toString(),
              parseFixed('0.6', 18).toString(),
            ],
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.INPUT_LENGTH_MISMATCH)
      );
    });
    it('should fail with more than 8 token addresses', async () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            rateProviders: Array(9).fill(AddressZero),
            normalizedWeights: [
              parseFixed('0.2', 18).toString(),
              ...Array(8).fill(parseFixed('0.1', 18).toString()),
            ],
            tokenAddresses: [
              ADDRESSES[network].WETH.address,
              ADDRESSES[network].DAI.address,
              ADDRESSES[network].USDC.address,
              ADDRESSES[network].USDT.address,
              ADDRESSES[network].WBTC.address,
              ADDRESSES[network].BAL.address,
              ADDRESSES[network].waUSDC.address,
              ADDRESSES[network].WBTC.address,
              ADDRESSES[network].auraBal.address,
            ],
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.ABOVE_MAX_TOKENS)
      );
    });
    it('should fail with less than 2 token addresses', async () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            normalizedWeights: [parseFixed('1', 18).toString()],
            rateProviders: [AddressZero],
            tokenAddresses: [ADDRESSES[network].WETH.address],
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.BELOW_MIN_TOKENS)
      );
    });
    it('should fail with weight values that not sum 1e18', () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            normalizedWeights: [
              parseFixed('0.2', 18).toString(),
              parseFixed('0.2', 18).toString(),
            ],
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.INVALID_WEIGHTS)
      );
    });
  });
  context('Init Join', async () => {
    const rightInitJoinParameters = {
      joiner: AddressZero,
      poolId: 'TestPoolId',
      poolAddress: AddressZero,
      amountsIn: [
        parseFixed('10000', 18).toString(),
        parseFixed('10000', 6).toString(),
      ],
      tokensIn: [
        ADDRESSES[network].WETH.address,
        ADDRESSES[network].DAI.address,
      ],
    };
    it('should fail with poolId missing', () => {
      assert.throws(
        () => {
          factory.buildInitJoin({
            ...rightInitJoinParameters,
            poolId: '',
          });
        },
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.NO_POOL_DATA)
      );
    });
    it('should fail with input length mismatch', () => {
      assert.throws(
        () => {
          factory.buildInitJoin({
            ...rightInitJoinParameters,
            amountsIn: ['0', '0', '0'],
          });
        },
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.INPUT_LENGTH_MISMATCH)
      );
    });
  });
});
