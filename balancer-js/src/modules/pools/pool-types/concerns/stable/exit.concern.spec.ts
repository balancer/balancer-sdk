import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSdkConfig,
  Network,
  Pool,
  PoolModel,
  StaticPoolRepository,
} from '@/.';
import { PoolsProvider } from '@/modules/pools/provider';

import pools_14717479 from '@/test/lib/pools_14717479.json';

import { StablePoolExit } from './exit.concern';
import { networkAddresses } from '@/lib/constants/config';

const stablePoolExit = new StablePoolExit();
const network = Network.MAINNET;
const sdkConfig: BalancerSdkConfig = {
  network,
  rpcUrl: ``,
};
const pools = new PoolsProvider(
  sdkConfig,
  new StaticPoolRepository(pools_14717479 as Pool[])
);
const { tokens } = networkAddresses(network);

describe('exit module', async () => {
  let pool: PoolModel;

  describe('buildExitExactBPTIn', async () => {
    context('exit with ETH', async () => {
      before(async function () {
        // Note that currently there is no stable pool with WETH as underlying token, but for the purposes of this unit test any stable pool can be used
        const stabal3 =
          '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063'; // Balancer USD Stable Pool - staBAL3
        await pools.find(stabal3).then((p) => {
          if (!p) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
          pool = p;
        });
      });
      it('should fail due to conflicting inputs', () => {
        let errorMessage = '';
        try {
          stablePoolExit.buildExitExactBPTIn({
            exiter: '0x35f5a330FD2F8e521ebd259FA272bA8069590741',
            pool,
            bptIn: parseFixed('10', 18).toString(),
            slippage: '100', // 100 bps
            shouldUnwrapNativeAsset: false,
            wrappedNativeAsset: tokens.wrappedNativeAsset,
            singleTokenMaxOut: AddressZero,
          });
        } catch (error) {
          errorMessage = (error as Error).message;
        }
        expect(errorMessage).to.eql(
          'shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values'
        );
      });
    });
  });
});
