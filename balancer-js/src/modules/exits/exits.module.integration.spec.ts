// yarn test:only ./src/modules/exits/exits.module.integration.spec.ts
import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { Network } from '@/.';
import { ADDRESSES } from '@/test/lib/constants';
import { testFlow } from './testHelper';

dotenv.config();

const TEST_BOOSTED = true;
const TEST_BOOSTED_META = true;
const TEST_BOOSTED_META_ALT = true;
const TEST_BOOSTED_META_BIG = true;
const TEST_BOOSTED_WEIGHTED_SIMPLE = true;
const TEST_BOOSTED_WEIGHTED_GENERAL = true;
const TEST_BOOSTED_WEIGHTED_META = true;
const TEST_BOOSTED_WEIGHTED_META_ALT = true;
const TEST_BOOSTED_WEIGHTED_META_GENERAL = true;

const network = Network.GOERLI;
const blockNumber = 8744170;
const slippage = '10'; // 10 bps = 0.1%
const poolAddresses = Object.values(ADDRESSES[network]).map(
  (address) => address.address
);
const addresses = ADDRESSES[network];

describe('generalised exit execution', async function () {
  this.timeout(120000); // Sets timeout for all tests within this scope to 2 minutes

  /*
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  */
  context('boosted', async () => {
    if (!TEST_BOOSTED) return true;
    const pool = addresses.bbamaiweth;
    const amount = parseFixed('0.02', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
    boostedMeta1: ComposableStable, baMai/bbausd2
    baMai: Linear, aMai/Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMeta', async () => {
    if (!TEST_BOOSTED_META) return true;
    const pool = addresses.boostedMeta1;
    const amount = parseFixed('0.05', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
    boostedMetaAlt1: ComposableStable, Mai/bbausd2
    Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMetaAlt', async () => {
    if (!TEST_BOOSTED_META_ALT) return true;
    const pool = addresses.boostedMetaAlt1;
    const amount = parseFixed('0.05', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
  boostedMetaBig1: ComposableStable, bbamaiweth/bbausd2
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
  */
  context('boostedMetaBig', async () => {
    if (!TEST_BOOSTED_META_BIG) return true;
    const pool = addresses.boostedMetaBig1;
    const amount = parseFixed('0.05', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
  boostedWeightedSimple1: 1 Linear + 1 normal token
  b-a-weth: Linear, aWeth/Weth
  BAL
  */
  context('boostedWeightedSimple', async () => {
    if (!TEST_BOOSTED_WEIGHTED_SIMPLE) return true;
    const pool = addresses.boostedWeightedSimple1;
    const amount = parseFixed('0.05', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
  boostedWeightedGeneral1: N Linear + M normal tokens
  b-a-dai: Linear, aDai/Dai
  b-a-mai: Linear, aMai/Mai
  BAL
  USDC
  */
  context('boostedWeightedGeneral', async () => {
    if (!TEST_BOOSTED_WEIGHTED_GENERAL) return true;
    const pool = addresses.boostedMeta1;
    const amount = parseFixed('0.05', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
  boostedWeightedMeta1: 1 Linear + 1 ComposableStable
  b-a-weth: Linear, aWeth/Weth
  bb-a-usd2: ComposableStable, b-a-usdc/b-a-usdt/b-a-dai
  BAL
  */
  context('boostedWeightedMeta', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META) return true;
    const pool = addresses.boostedWeightedMeta1;
    const amount = parseFixed('0.05', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
  boostedWeightedMetaAlt1: 1 normal token + 1 ComposableStable
  WETH
  b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
  */
  context('boostedWeightedMetaAlt', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META_ALT) return true;
    const pool = addresses.boostedWeightedMetaAlt1;
    const amount = parseFixed('0.01', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });

  /*
  boostedWeightedMetaGeneral1: N Linear + 1 ComposableStable
  b-a-usdt: Linear, aUSDT/USDT
  b-a-usdc: Linear, aUSDC/USDC
  b-a-weth: Linear, aWeth/Weth
  b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
  */
  context('boostedWeightedMetaGeneral', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META_GENERAL) return true;
    const pool = addresses.boostedWeightedMetaGeneral1;
    const amount = parseFixed('0.05', pool.decimals).toString();

    it('should exit pool correctly', async () => {
      await testFlow(
        pool,
        slippage,
        amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    });
  });
});
