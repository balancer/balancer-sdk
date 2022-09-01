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
import { MetaStablePoolExit } from './exit.concern';
import { networkAddresses } from '@/lib/constants/config';

const metaStablePoolExit = new MetaStablePoolExit();
const stETH_stable_pool_id =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080'; // Balancer stETH Stable Pool

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

  before(async function () {
    await pools.find(stETH_stable_pool_id).then((p) => {
      if (!p) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
      pool = p;
    });
  });

  describe('buildExitExactBPTIn', () => {
    context('exit with ETH', () => {
      it('should fail due to conflicting inputs', () => {
        let errorMessage = '';
        try {
          metaStablePoolExit.buildExitExactBPTIn({
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
