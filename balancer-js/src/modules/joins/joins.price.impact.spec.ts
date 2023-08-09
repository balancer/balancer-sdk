// yarn test:only ./src/modules/joins/joins.price.impact.spec.ts
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
import { testGeneralisedJoin } from './testHelper';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { formatEther } from '@ethersproject/units';

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
          parseFixed('1000000', addresses.WETH.decimals).toString(),
          parseFixed('1000000', addresses.swETH.decimals).toString(),
        ];
      });

      it('single token join', async () => {
        const tokensIn = [addresses.swETH.address];
        const amountsIn = [
          parseFixed('4400', addresses.swETH.decimals).toString(),
        ];
        const { expectedOut, proportions } = await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokensIn,
          amountsIn,
          simulationType
        );

        const proportionalAmountsIn = proportions.map((p) =>
          SolidityMaths.mulDownFixed(BigInt(amountsIn[0]), BigInt(p)).toString()
        );

        console.log('amounsIn', amountsIn);
        console.log('proportionalAmountsIn', proportionalAmountsIn);

        const { expectedOut: expectedOutZpi } = await testGeneralisedJoin(
          sdk,
          signer,
          userAddress,
          testPool,
          tokens.map((t) => t.address),
          proportionalAmountsIn,
          simulationType
        );

        console.log('expectedOut', formatEther(expectedOut));
        console.log('expectedOutZpi', formatEther(expectedOutZpi));

        // price impact join = 1 - (bptAmount/bptZeroPI)
        const pi = (
          BigInt(1 * 10 ** 18) -
          SolidityMaths.divUpFixed(BigInt(expectedOut), BigInt(expectedOutZpi))
        ).toString();

        console.log('\nPrice impact (based on proportions)', formatEther(pi));
      });
    });
  });
});
