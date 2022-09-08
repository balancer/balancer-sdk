import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';

import { BalancerSDK, Network, Pool } from '@/.';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { MetaStablePoolExit } from './exit.concern';

const metaStablePoolExit = new MetaStablePoolExit();

const rpcUrl = '';
const network = Network.MAINNET;
const { networkConfig } = new BalancerSDK({ network, rpcUrl });
const wrappedNativeAsset =
  networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase();

const pool = pools_14717479.find(
  (pool) =>
    pool.id ==
    '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080' // Balancer stETH Stable Pool
) as unknown as Pool;

describe('exit module', () => {
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
            wrappedNativeAsset,
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
