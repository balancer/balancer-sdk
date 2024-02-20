// yarn test:only ./src/modules/pricing/priceImpact.compare.nested.spec.ts
import dotenv from 'dotenv';

import { BalancerSDK, GraphQLQuery, Network, SimulationType } from '@/.';
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { FORK_NODES, createSubgraphQuery, forkSetup } from '@/test/lib/utils';
import { ADDRESSES, TestAddress, TestAddresses } from '@/test/lib/constants';
import { JsonRpcSigner } from '@ethersproject/providers';
import { RPC_URLS } from '@/test/lib/utils';
import { testGeneralisedJoin } from '../joins/testHelper';

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
const TEST_JOIN_WITH_ETH_JOIN_FIRST = true;

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
      blockNumber = 18559730;
      jsonRpcUrl = FORK_NODES[network];
      rpcUrl = RPC_URLS[network];
      const provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner(1);
      userAddress = await signer.getAddress();
      addresses = ADDRESSES[network];
      subgraphQuery = createSubgraphQuery(
        [
          '0x08775ccb6674d6bdceb0797c364c2653ed84f384',
          '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
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

    context('join with all tokens - unbalanced', async () => {
      if (!TEST_JOIN_WITH_ETH_JOIN_FIRST) return true;

      before(async () => {
        testPool = addresses.WETH_3POOL;
        tokens = [
          addresses.DAI,
          addresses.USDC,
          addresses.USDT,
          addresses.WETH,
        ];
        balances = [
          parseFixed('100000', addresses.DAI.decimals).toString(),
          parseFixed('1000', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.USDT.decimals).toString(),
          parseFixed('0.1', addresses.WETH.decimals).toString(),
        ];
      });

      it('should join with all tokens', async () => {
        const tokensIn = tokens.map((t) => t.address);
        const amountsIn = balances;
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
