import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';

import { BalancerSDK, Network, Pool } from '@/.';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { StablePoolExit } from './exit.concern';

const stablePoolExit = new StablePoolExit();

const rpcUrl = '';
const network = Network.MAINNET;
const { networkConfig } = new BalancerSDK({ network, rpcUrl });
const wrappedNativeAsset =
  networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase();

const pool = pools_14717479.find(
  (pool) =>
    pool.id ==
    '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063' // Balancer USD Stable Pool - staBAL3
) as unknown as Pool;

describe('exit module', () => {
  describe('buildExitExactBPTIn', () => {
    context('exit with ETH', () => {
      it('should fail due to conflicting inputs', () => {
        let errorMessage = '';
        try {
          stablePoolExit.buildExitExactBPTIn({
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
