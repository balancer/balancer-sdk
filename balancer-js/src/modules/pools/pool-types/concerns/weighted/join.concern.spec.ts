import { expect } from 'chai';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSdkConfig,
  Network,
  StaticPoolRepository,
  Pool,
} from '@/.';
import { PoolsProvider } from '@/modules/pools/provider';

import pools_14717479 from '@/test/lib/pools_14717479.json';

const weth_usdc_pool_id =
  '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019';

const USDC_address = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH_address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

describe('join module', () => {
  const sdkConfig: BalancerSdkConfig = {
    network: Network.MAINNET,
    rpcUrl: '',
  };

  describe('buildJoin', async () => {
    const pools = new PoolsProvider(
      sdkConfig,
      new StaticPoolRepository(pools_14717479 as Pool[])
    );
    const pool = await pools.find(weth_usdc_pool_id);
    if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    it('should return encoded params', async () => {
      const account = '0x35f5a330fd2f8e521ebd259fa272ba8069590741';
      const tokensIn = [USDC_address, WETH_address];
      const amountsIn = ['7249202509', '2479805746401150127'];
      const slippage = '100';
      const { data } = pool.buildJoin(account, tokensIn, amountsIn, slippage);

      expect(data).to.equal(
        '0xb95cac2896646936b91d6b9d7d0c47c496afbf3d6ec7b6f800020000000000000000001900000000000000000000000035f5a330fd2f8e521ebd259fa272ba806959074100000000000000000000000035f5a330fd2f8e521ebd259fa272ba80695907410000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000001b0160d4d000000000000000000000000000000000000000000000000226a0a30123684af00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000d053b627d205d2629000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000001b0160d4d000000000000000000000000000000000000000000000000226a0a30123684af'
      );
    });
  });
});
