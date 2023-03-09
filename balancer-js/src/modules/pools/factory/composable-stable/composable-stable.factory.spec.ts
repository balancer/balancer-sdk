import { BalancerSdkConfig, Network, PoolType } from '@/types';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ADDRESSES } from '@/test/lib/constants';
import { AddressZero } from '@ethersproject/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { assert } from 'chai';
import { BalancerError } from '@/balancerErrors';
import { parseFixed } from '@ethersproject/bignumber';

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
      factoryAddress: BALANCER_NETWORK_CONFIG[network].addresses.contracts
        .composableStablePoolFactory as string,
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
      swapFee: '0.05',
      owner: AddressZero,
    };
    it('should fail with swap fee 0', async () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            swapFee: '0',
          }),
        BalancerError,
        'The swap fee needs to be greater than zero'
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
        'input length mismatch'
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
        'no pool data'
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
        'no pool data'
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
        'input length mismatch'
      );
    });
  });
});
