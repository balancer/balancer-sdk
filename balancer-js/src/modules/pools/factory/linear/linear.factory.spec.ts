import { assert } from 'chai';
import { AddressZero } from '@ethersproject/constants';

import { BalancerError } from '@/balancerErrors';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { BalancerSDK } from '@/modules/sdk.module';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerSdkConfig, Network, PoolType } from '@/types';

const network = Network.MAINNET;
const sdkConfig: BalancerSdkConfig = {
  network,
  rpcUrl: '',
};
const balancer = new BalancerSDK(sdkConfig);

describe('Linear Factory - Unit tests', async () => {
  const factory = balancer.pools.poolFactory.of(PoolType.AaveLinear);
  context('Create', async () => {
    const rightCreateParameters = {
      factoryAddress: BALANCER_NETWORK_CONFIG[network].addresses.contracts
        .composableStablePoolFactory as string,
      name: 'eth-weth-test',
      symbol: 'eth-weth-test',
      mainToken: ADDRESSES[network].ETH.address,
      wrappedToken: ADDRESSES[network].WETH.address,
      swapFee: '0.05',
      owner: AddressZero,
      protocolId: 2,
      upperTarget: '20000',
    };
    it('should fail with swap fee 0', () => {
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
    it('should fail with invalid protocolId', () => {
      assert.throws(
        () =>
          factory.create({
            ...rightCreateParameters,
            protocolId: 19,
          }),
        BalancerError,
        'The provided protocol id does not correspond to a protocol'
      );
    });
  });
});
