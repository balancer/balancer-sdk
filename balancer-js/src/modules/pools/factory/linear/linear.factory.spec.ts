import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { assert } from 'chai';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { BalancerSDK } from '@/modules/sdk.module';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerSdkConfig, Network, PoolType } from '@/types';

const network = Network.GOERLI;
const sdkConfig: BalancerSdkConfig = {
  network,
  rpcUrl: '',
};
const balancer = new BalancerSDK(sdkConfig);

describe('Linear Factory - Unit tests', async () => {
  const factory = balancer.pools.poolFactory.of(PoolType.AaveLinear);
  context('Create', async () => {
    const rightCreateParameters = {
      name: 'eth-weth-test',
      symbol: 'eth-weth-test',
      mainToken: ADDRESSES[network].DAI.address,
      wrappedToken: ADDRESSES[network].waDAI.address,
      swapFeeEvm: parseFixed('0.05', 18).toString(),
      owner: AddressZero,
      protocolId: 2,
      upperTargetEvm: parseFixed('20000', 18).toString(),
    };
    it('should fail with swap fee 0', () => {
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
    it('should fail with swap fee bigger than 1e17', () => {
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
    it('should fail with poolType not supported in the network', () => {
      const factory = balancer.pools.poolFactory.of(PoolType.GearboxLinear);
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.UNSUPPORTED_POOL_TYPE)
      );
    });
    it('should fail with invalid protocolId', () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            protocolId: 19,
          }),
        BalancerError,
        BalancerError.getMessage(BalancerErrorCode.INVALID_PROTOCOL_ID)
      );
    });
  });
});
