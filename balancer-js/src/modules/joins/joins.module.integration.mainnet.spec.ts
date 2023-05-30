// yarn test:only ./src/modules/joins/joins.module.integration.mainnet.spec.ts
import dotenv from 'dotenv';

import { BalancerSDK, GraphQLQuery, Network, SimulationType } from '@/.';
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { FORK_NODES, createSubgraphQuery, forkSetup } from '@/test/lib/utils';
import { ADDRESSES, TestAddress, TestAddresses } from '@/test/lib/constants';
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

const TEST_JOIN_WITH_ETH = true;

describe('generalised join execution', async () => {
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
  let tokens: string[];
  let slots: number[];
  let balances: string[];
  let testPool: TestAddress;

  context('mainnet', async () => {
    before(async () => {
      network = Network.MAINNET;
      blockNumber = 17316477;
      jsonRpcUrl = FORK_NODES[network];
      rpcUrl = RPC_URLS[network];
      const provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner(1);
      userAddress = await signer.getAddress();
      addresses = ADDRESSES[network];
    });

    context('join with wETH vs ETH', async () => {
      if (!TEST_JOIN_WITH_ETH) return true;

      before(async () => {
        subgraphQuery = createSubgraphQuery(
          [addresses.swEth_bbaweth.address, addresses.bbaweth.address],
          blockNumber
        );
        sdk = new BalancerSDK({
          network,
          rpcUrl,
          tenderly: {
            blockNumber, // Set tenderly config blockNumber and use default values for other parameters
          },
          subgraphQuery,
        });
        testPool = addresses.swEth_bbaweth;
        tokens = [addresses.WETH.address];
        slots = [addresses.WETH.slot as number];
        balances = [parseFixed('100', 18).toString()];
      });

      beforeEach(async () => {
        // no need to setup ETH balance because test account already has ETH
        await forkSetup(
          signer,
          tokens,
          slots,
          balances,
          jsonRpcUrl,
          blockNumber
        );
      });

      it('should join with wETH', async () => {
        const tokensIn = [addresses.WETH.address];
        const amountsIn = [parseFixed('1', 18).toString()];
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
        const tokensIn = [AddressZero];
        const amountsIn = [parseFixed('1', 18).toString()];
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
