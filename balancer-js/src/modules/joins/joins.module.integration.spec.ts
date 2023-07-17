// yarn test:only ./src/modules/joins/joins.module.integration.spec.ts
import dotenv from 'dotenv';

import { BalancerSDK, GraphQLQuery, Network, SimulationType } from '@/.';
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { FORK_NODES, createSubgraphQuery, forkSetup } from '@/test/lib/utils';
import {
  ADDRESSES,
  TEST_BLOCK,
  TestAddress,
  TestAddresses,
} from '@/test/lib/constants';
import { JsonRpcSigner } from '@ethersproject/providers';
import { RPC_URLS } from '@/test/lib/utils';
import { AddressZero } from '@ethersproject/constants';
import { testGeneralisedJoin } from './testHelper';

/**
 * -- Integration tests for generalisedJoin --
 *
 * It compares results from local fork transactions with simulated results from
 * the Simulation module, which can be of 3 different types:
 * 1. Tenderly: uses Tenderly Simulation API (third party service)
 * 2. VaultModel: uses TS math, which may be less accurate (min. 99% accuracy)
 * 3. Static: uses staticCall, which is 100% accurate but requires vault approval
 */

dotenv.config();

// mainnet
const TEST_JOIN_WITH_ETH_SWAP_FIRST = true;
const TEST_JOIN_WITH_ETH_JOIN_FIRST = true;

// goerli
const TEST_BOOSTED = true;
const TEST_BOOSTED_META = true;
const TEST_BOOSTED_META_ALT = true;
const TEST_BOOSTED_META_BIG = true;
const TEST_BOOSTED_WEIGHTED_SIMPLE = true;
const TEST_BOOSTED_WEIGHTED_GENERAL = true;
const TEST_BOOSTED_WEIGHTED_META = true;
const TEST_BOOSTED_WEIGHTED_META_ALT = true;
const TEST_BOOSTED_WEIGHTED_META_GENERAL = true;

// arbitrum
const TEST_BBRFUSD = true;

describe('generalised join execution', async function () {
  this.timeout(30000);
  const simulationType = SimulationType.Static;
  let network: Network;
  let blockNumber: number;
  let jsonRpcUrl: string;
  let rpcUrl: string;
  let addresses: TestAddresses;
  let subgraphQuery: GraphQLQuery;
  let sdk: BalancerSDK;
  let signer: JsonRpcSigner;
  let userAddress: string;
  let tokens: TestAddress[];
  let balances: string[];
  let testPool: TestAddress;

  beforeEach(async () => {
    await forkSetup(
      signer,
      tokens.map((t) => t.address),
      tokens.map((t) => t.slot as number),
      balances,
      jsonRpcUrl,
      blockNumber
    );
  });

  context('mainnet', async () => {
    before(async () => {
      network = Network.MAINNET;
      blockNumber = TEST_BLOCK[network];
      jsonRpcUrl = FORK_NODES[network];
      rpcUrl = RPC_URLS[network];
      const provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner(1);
      userAddress = await signer.getAddress();
      addresses = ADDRESSES[network];
      subgraphQuery = createSubgraphQuery(
        [
          addresses.swEth_bbaweth.address,
          addresses.bbaweth.address,
          addresses.bveth.address,
        ],
        blockNumber
      );
      // // Uncomment and set tenderlyConfig on sdk instantiation in order to test using tenderly simulations
      // const tenderlyConfig = {
      //   accessKey: process.env.TENDERLY_ACCESS_KEY as string,
      //   user: process.env.TENDERLY_USER as string,
      //   project: process.env.TENDERLY_PROJECT as string,
      //   blockNumber,
      // };
      sdk = new BalancerSDK({
        network,
        rpcUrl,
        subgraphQuery,
      });
    });

    context('join with wETH vs ETH - where first step is a swap', async () => {
      if (!TEST_JOIN_WITH_ETH_SWAP_FIRST) return true;

      before(async () => {
        testPool = addresses.swEth_bbaweth;
        tokens = [addresses.WETH, addresses.swETH];
        balances = [
          parseFixed('10', addresses.WETH.decimals).toString(),
          parseFixed('10', addresses.swETH.decimals).toString(),
        ];
      });

      it('should join with wETH', async () => {
        const tokensIn = [addresses.WETH.address, addresses.swETH.address];
        const amountsIn = [
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.swETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('should join with ETH', async () => {
        const tokensIn = [AddressZero, addresses.swETH.address];
        const amountsIn = [
          parseFixed('1', 18).toString(),
          parseFixed('1', addresses.swETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    context('join with wETH vs ETH - where first step is a join', async () => {
      if (!TEST_JOIN_WITH_ETH_JOIN_FIRST) return true;

      before(async () => {
        testPool = addresses.bveth;
        tokens = [addresses.WETH, addresses.vETH];
        balances = [
          parseFixed('10', addresses.WETH.decimals).toString(),
          parseFixed('10', addresses.vETH.decimals).toString(),
        ];
      });

      it('should join with wETH', async () => {
        const tokensIn = [addresses.WETH.address, addresses.vETH.address];
        const amountsIn = [
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.vETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('should join with ETH', async () => {
        const tokensIn = [AddressZero, addresses.vETH.address];
        const amountsIn = [
          parseFixed('1', 18).toString(),
          parseFixed('1', addresses.vETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });
  });

  context.skip('goerli', async () => {
    before(async () => {
      network = Network.GOERLI;
      blockNumber = 8744170;
      jsonRpcUrl = FORK_NODES[network];
      rpcUrl = RPC_URLS[network];
      const provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();
      addresses = ADDRESSES[network];
      const poolAddresses = Object.values(addresses).map(
        (address) => address.address
      );
      subgraphQuery = createSubgraphQuery(poolAddresses, blockNumber);
      // // Uncomment and set tenderlyConfig on sdk instantiation in order to test using tenderly simulations
      // const tenderlyConfig = {
      //   accessKey: process.env.TENDERLY_ACCESS_KEY as string,
      //   user: process.env.TENDERLY_USER as string,
      //   project: process.env.TENDERLY_PROJECT as string,
      //   blockNumber,
      // };
      sdk = new BalancerSDK({
        network,
        rpcUrl,
        subgraphQuery,
      });
    });

    /**
     * bbamaiweth: ComposableStable, baMai/baWeth
     * baMai: Linear, aMai/Mai
     * baWeth: Linear, aWeth/Weth
     */
    context('boosted', async () => {
      if (!TEST_BOOSTED) return true;

      before(async () => {
        testPool = addresses.bbamaiweth;
        tokens = [
          addresses.MAI,
          addresses.WETH,
          addresses.waMAI,
          addresses.waWETH,
          addresses.bbamai,
          addresses.bbaweth,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [addresses.MAI.address, addresses.WETH.address];
        const amountsIn = [
          parseFixed('10', addresses.MAI.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with 1 linear', async () => {
        const tokensIn = [addresses.bbamai.address];
        const amountsIn = [
          parseFixed('10', addresses.bbamai.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with 1 leaf and 1 linear', async () => {
        const tokensIn = [addresses.WETH.address, addresses.bbamai.address];
        const amountsIn = [
          parseFixed('10', addresses.WETH.decimals).toString(),
          parseFixed('10', addresses.bbamai.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedMeta1: ComposableStable, baMai/bbausd2
     * baMai: Linear, aMai/Mai
     * bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
     */
    context('boostedMeta', async () => {
      if (!TEST_BOOSTED_META) return true;

      before(async () => {
        testPool = addresses.boostedMeta1;
        tokens = [
          addresses.DAI,
          addresses.USDC,
          addresses.USDT,
          addresses.MAI,
          addresses.waDAI,
          addresses.waUSDC,
          addresses.waUSDT,
          addresses.waMAI,
          addresses.bbadai,
          addresses.bbausdc,
          addresses.bbausdt,
          addresses.bbamai,
          addresses.bbausd2,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
        ];
        const amountsIn = [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.MAI.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child linear', async () => {
        const tokensIn = [addresses.bbamai.address];
        const amountsIn = [
          parseFixed('10', addresses.bbamai.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with some leafs, linears and boosted', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.bbamai.address,
          addresses.bbausdt.address,
          addresses.bbausd2.address,
        ];
        const amountsIn = [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.bbamai.decimals).toString(),
          parseFixed('10', addresses.bbausdt.decimals).toString(),
          parseFixed('10', addresses.bbausd2.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedMetaAlt1: ComposableStable, Mai/bbausd2
     * bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
     */
    context('boostedMetaAlt', async () => {
      if (!TEST_BOOSTED_META_ALT) return true;

      before(async () => {
        testPool = addresses.boostedMetaAlt1;
        tokens = [
          addresses.DAI,
          addresses.USDC,
          addresses.USDT,
          addresses.MAI,
          addresses.waDAI,
          addresses.waUSDC,
          addresses.waUSDT,
          addresses.bbausdc,
          addresses.bbausdt,
          addresses.bbadai,
          addresses.bbamai,
          addresses.bbausd2,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
        ];
        const amountsIn = [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.MAI.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with single leaf token', async () => {
        const tokensIn = [addresses.MAI.address];
        const amountsIn = [parseFixed('10', addresses.MAI.decimals).toString()];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child linear', async () => {
        const tokensIn = [addresses.bbausdc.address];
        const amountsIn = [
          parseFixed('10', addresses.bbausdc.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child boosted', async () => {
        const tokensIn = [addresses.bbausd2.address];
        const amountsIn = [
          parseFixed('10', addresses.bbausd2.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with some leafs, linears and boosted', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDT.address,
          addresses.bbadai.address,
          addresses.bbausdc.address,
          addresses.bbausd2.address,
        ];
        const amountsIn = [
          parseFixed('4', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDT.decimals).toString(),
          parseFixed('4', addresses.bbadai.decimals).toString(),
          parseFixed('4', addresses.bbausdc.decimals).toString(),
          parseFixed('4', addresses.bbausd2.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedMetaBig: ComposableStable, Mai/bbausd2
     * bbamaiweth: ComposableStable, baMai/baWeth
     * baMai: Linear, aMai/Mai
     * baWeth: Linear, aWeth/Weth
     * bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
     */
    context('boostedMetaBig', async () => {
      if (!TEST_BOOSTED_META_BIG) return true;

      before(async () => {
        testPool = addresses.boostedMetaBig1;
        tokens = [
          addresses.DAI,
          addresses.USDC,
          addresses.USDT,
          addresses.MAI,
          addresses.WETH,
          addresses.waDAI,
          addresses.waUSDC,
          addresses.waUSDT,
          addresses.waMAI,
          addresses.waWETH,
          addresses.bbadai,
          addresses.bbausdc,
          addresses.bbausdt,
          addresses.bbamai,
          addresses.bbamaiweth,
          addresses.bbausd2,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
          addresses.WETH.address,
        ];
        const amountsIn = [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.MAI.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child boosted', async () => {
        const tokensIn = [addresses.bbamaiweth.address];
        const amountsIn = [
          parseFixed('10', addresses.bbamaiweth.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with leaf and child boosted', async () => {
        const tokensIn = [addresses.DAI.address, addresses.bbamaiweth.address];
        const amountsIn = [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.bbamaiweth.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with some leafs, linears and boosted', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
          addresses.bbausdt.address,
          addresses.bbamai.address,
          addresses.bbamaiweth.address,
          addresses.bbausd2.address,
        ];
        const amountsIn = [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbausdt.decimals).toString(),
          parseFixed('1', addresses.bbamai.decimals).toString(),
          parseFixed('1', addresses.bbamaiweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedWeightedSimple1: 1 Linear + 1 normal token
     * b-a-weth: Linear, aWeth/Weth
     * BAL
     */
    context('boostedWeightedSimple', async () => {
      if (!TEST_BOOSTED_WEIGHTED_SIMPLE) return true;

      before(async () => {
        testPool = addresses.boostedWeightedSimple1;
        tokens = [
          addresses.BAL,
          addresses.WETH,
          addresses.waWETH,
          addresses.bbaweth,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [addresses.BAL.address, addresses.WETH.address];
        const amountsIn = [
          parseFixed('10', addresses.BAL.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child linear', async () => {
        const tokensIn = [addresses.bbaweth.address];
        const amountsIn = [
          parseFixed('10', addresses.bbaweth.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with leaf and child linear', async () => {
        const tokensIn = [addresses.BAL.address, addresses.bbaweth.address];
        const amountsIn = [
          parseFixed('1', addresses.BAL.decimals).toString(),
          parseFixed('1', addresses.bbaweth.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedWeightedGeneral1: N Linear + M normal tokens
     * b-a-dai: Linear, aDai/Dai
     * b-a-mai: Linear, aMai/Mai
     * BAL
     * USDC
     */
    context('boostedWeightedGeneral', async () => {
      if (!TEST_BOOSTED_WEIGHTED_GENERAL) return true;

      before(async () => {
        testPool = addresses.boostedWeightedGeneral1;
        tokens = [
          addresses.DAI,
          addresses.MAI,
          addresses.BAL,
          addresses.USDC_old,
          addresses.bbadai,
          addresses.bbamai,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.MAI.address,
          addresses.BAL.address,
          addresses.USDC_old.address,
        ];
        const amountsIn = [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.MAI.decimals).toString(),
          parseFixed('1', addresses.BAL.decimals).toString(),
          parseFixed('1', addresses.USDC_old.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child linear', async () => {
        const tokensIn = [addresses.bbadai.address];
        const amountsIn = [
          parseFixed('10', addresses.bbadai.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with some leafs and linear', async () => {
        const tokensIn = [
          addresses.MAI.address,
          addresses.BAL.address,
          addresses.bbamai.address,
        ];
        const amountsIn = [
          parseFixed('10', addresses.MAI.decimals).toString(),
          parseFixed('10', addresses.BAL.decimals).toString(),
          parseFixed('10', addresses.bbamai.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedWeightedMeta1: 1 Linear + 1 ComposableStable
     * b-a-weth: Linear, aWeth/Weth
     * bb-a-usd2: ComposableStable, b-a-usdc/b-a-usdt/b-a-dai
     * BAL
     */
    context('boostedWeightedMeta', async () => {
      if (!TEST_BOOSTED_WEIGHTED_META) return true;

      before(async () => {
        testPool = addresses.boostedWeightedMeta1;
        tokens = [
          addresses.DAI,
          addresses.USDC,
          addresses.USDT,
          addresses.WETH,
          addresses.bbadai,
          addresses.bbausdc,
          addresses.bbausdt,
          addresses.bbaweth,
          addresses.bbausd2,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
        ];
        const amountsIn = [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child linear', async () => {
        const tokensIn = [addresses.bbaweth.address];
        const amountsIn = [
          parseFixed('10', addresses.bbaweth.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with some leafs, linears and boosted', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbausdt.address,
          addresses.bbaweth.address,
          addresses.bbausd2.address,
        ];
        const amountsIn = [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
          parseFixed('10', addresses.bbausdt.decimals).toString(),
          parseFixed('10', addresses.bbaweth.decimals).toString(),
          parseFixed('10', addresses.bbausd2.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedWeightedMetaAlt1: 1 normal token + 1 ComposableStable
     * WETH
     * b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
     */
    context('boostedWeightedMetaAlt', async () => {
      if (!TEST_BOOSTED_WEIGHTED_META_ALT) return true;

      before(async () => {
        testPool = addresses.boostedWeightedMetaAlt1;
        tokens = [
          addresses.DAI,
          addresses.USDC,
          addresses.USDT,
          addresses.WETH,
          addresses.bbadai,
          addresses.bbausdc,
          addresses.bbausdt,
          addresses.bbausd2,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
        ];
        const amountsIn = [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child linear', async () => {
        const tokensIn = [addresses.bbausdt.address];
        const amountsIn = [
          parseFixed('1', addresses.bbausdt.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with leaf and child linear', async () => {
        const tokensIn = [
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbadai.address,
          addresses.bbausdc.address,
          addresses.bbausdt.address,
          addresses.bbausd2.address,
        ];
        const amountsIn = [
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbadai.decimals).toString(),
          parseFixed('1', addresses.bbausdc.decimals).toString(),
          parseFixed('0', addresses.bbausdt.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });

    /**
     * boostedWeightedMetaGeneral1: N Linear + 1 ComposableStable
     * b-a-usdt: Linear, aUSDT/USDT
     * b-a-usdc: Linear, aUSDC/USDC
     * b-a-weth: Linear, aWeth/Weth
     * b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
     */
    context('boostedWeightedMetaGeneral', async () => {
      if (!TEST_BOOSTED_WEIGHTED_META_GENERAL) return true;

      before(async () => {
        testPool = addresses.boostedWeightedMetaGeneral1;
        tokens = [
          addresses.DAI,
          addresses.USDC,
          addresses.USDT,
          addresses.WETH,
          addresses.bbadai,
          addresses.bbausdc,
          addresses.bbausdt,
          addresses.bbaweth,
          addresses.bbausd2,
        ];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with all leaf tokens', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
        ];
        const amountsIn = [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it.skip('join with child linear', async () => {
        const tokensIn = [addresses.bbausdc.address];
        const amountsIn = [
          parseFixed('10', addresses.bbausdc.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });

      it('join with some leafs, linears and boosted', async () => {
        const tokensIn = [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbadai.address,
          addresses.bbaweth.address,
          addresses.bbausd2.address,
        ];
        const amountsIn = [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbadai.decimals).toString(),
          parseFixed('1', addresses.bbaweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });
  });

  // Skipping Arbitrum tests so we don't have to spin up a node for it during github checks
  context.skip('arbitrum', async () => {
    before(async () => {
      network = Network.ARBITRUM;
      blockNumber = TEST_BLOCK[network];
      jsonRpcUrl = FORK_NODES[network];
      rpcUrl = RPC_URLS[network];
      const provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();
      addresses = ADDRESSES[network];
      const poolAddresses = Object.values(addresses).map(
        (address) => address.address
      );
      subgraphQuery = createSubgraphQuery(poolAddresses, blockNumber);
      // // Uncomment and set tenderlyConfig on sdk instantiation in order to test using tenderly simulations
      // const tenderlyConfig = {
      //   accessKey: process.env.TENDERLY_ACCESS_KEY as string,
      //   user: process.env.TENDERLY_USER as string,
      //   project: process.env.TENDERLY_PROJECT as string,
      //   blockNumber,
      // };
      sdk = new BalancerSDK({
        network,
        rpcUrl,
        subgraphQuery,
      });
    });

    /**
     * bbrfusd: ComposableStable
     */
    context('bbrfusd', async () => {
      if (!TEST_BBRFUSD) return true;

      before(async () => {
        testPool = addresses.bbrfusd;
        tokens = [addresses.USDT];
        balances = tokens.map((t) => parseFixed('10', t.decimals).toString());
      });

      it('join with one leaf token', async () => {
        const tokensIn = [addresses.USDT.address];
        const amountsIn = [
          parseFixed('10', addresses.USDT.decimals).toString(),
        ];
        await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );
      });
    });
  });
});
