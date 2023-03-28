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

describe('ComposableStable Factory', async () => {
  const factory = balancer.pools.poolFactory.of(PoolType.ComposableStable);
  context('Create', async () => {
    const rightCreateParameters = {
      name: 'test-pool',
      symbol: 'test-pool',
      tokenAddresses: [
        ADDRESSES[network].WETH.address,
        ADDRESSES[network].DAI.address,
      ],
      amplificationParameter: '5',
      rateProviders: [AddressZero, AddressZero],
      tokenRateCacheDurations: ['0', '0'],
      exemptFromYieldProtocolFeeFlags: [false, false],
      swapFeeEvm: `${5e16}`,
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
            tokenRateCacheDurations: ['0', '0', '0'],
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.INPUT_LENGTH_MISMATCH)
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
    it('should fail with poolAddress missing', () => {
      assert.throws(
        () => {
          factory.buildInitJoin({
            ...rightInitJoinParameters,
            poolAddress: '',
          });
        },
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.NO_POOL_DATA)
      );
    });
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
