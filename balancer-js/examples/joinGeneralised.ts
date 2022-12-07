import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseFixed } from '@ethersproject/bignumber';
import { BalancerSDK, Network } from '../src/index';
import { forkSetup, getBalances } from '../src/test/lib/utils';
import { ADDRESSES } from '../src/test/lib/constants';
import { Relayer } from '../src/modules/relayer/relayer.module';
import { Contracts } from '../src/modules/contracts/contracts.module';

dotenv.config();

const {
  ALCHEMY_URL_GOERLI: jsonRpcUrl,
  TENDERLY_ACCESS_KEY,
  TENDERLY_PROJECT,
  TENDERLY_USER,
} = process.env;
const network = Network.GOERLI;
const blockNumber = 7890980;
const rpcUrl = 'http://127.0.0.1:8000';
const addresses = ADDRESSES[network];

// Setup local fork with correct balances/approval to join pool with DAI/USDC/bbaDAI/bbaUSDC
async function setUp(provider: JsonRpcProvider): Promise<string> {
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const mainTokens = [addresses.DAI.address, addresses.USDC.address];
  const mainInitialBalances = [
    parseFixed('100', addresses.DAI.decimals).toString(),
    parseFixed('100', addresses.USDC.decimals).toString(),
  ];
  const mainSlots = [
    addresses.DAI.slot as number,
    addresses.USDC.slot as number,
  ];

  const linearPoolTokens = [
    addresses.bbadai?.address as string,
    addresses.bbausdc?.address as string,
  ];
  const linearInitialBalances = [
    parseFixed('100', addresses.bbadai?.decimals).toString(),
    parseFixed('100', addresses.bbausdc?.decimals).toString(),
  ];
  const linearPoolSlots = [
    addresses.bbadai?.slot as number,
    addresses.bbausdc?.slot as number,
  ];

  await forkSetup(
    signer,
    [...mainTokens, ...linearPoolTokens],
    [...mainSlots, ...linearPoolSlots],
    [...mainInitialBalances, ...linearInitialBalances],
    jsonRpcUrl as string,
    blockNumber
  );

  const { contracts, contractAddresses } = new Contracts(
    network as number,
    provider
  );

  return await Relayer.signRelayerApproval(
    contractAddresses.relayerV4 as string,
    signerAddress,
    signer,
    contracts.vault
  );
}

/*
Example showing how to use the SDK generalisedJoin method.
This allows joining of a ComposableStable that has nested pools, e.g.:
                  CS0
              /        \
            CS1        CS2
          /    \      /   \
         DAI   USDC  USDT  FRAX

Can join with tokens: DAI, USDC, USDT, FRAX, CS1_BPT, CS2_BPT
*/
async function join() {
  const provider = new JsonRpcProvider(rpcUrl, network);
  // Local fork setup
  const relayerAuth = await setUp(provider);

  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  const wrapLeafTokens = false;
  const slippage = '100'; // 100 bps = 1%
  const bbausd2 = {
    id: addresses.bbausd2?.id as string,
    address: addresses.bbausd2?.address as string,
  };
  // Here we join with USDC and bbadai
  const tokensIn = [
    addresses.USDC.address,
    addresses.bbadai?.address as string,
  ];
  const amountsIn = [
    parseFixed('10', 6).toString(),
    parseFixed('10', 18).toString(),
  ];

  // Custom Tenderly configuration parameters - remove in order to use default values
  const tenderlyConfig = {
    accessKey: TENDERLY_ACCESS_KEY as string,
    user: TENDERLY_USER as string,
    project: TENDERLY_PROJECT as string,
    blockNumber,
  };

  const balancer = new BalancerSDK({
    network,
    rpcUrl,
    customSubgraphUrl:
      'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta',
    tenderly: tenderlyConfig,
  });

  // Checking balances to confirm success
  const tokenBalancesBefore = (
    await getBalances([bbausd2.address, ...tokensIn], signer, signerAddress)
  ).map((b) => b.toString());

  // Use SDK to create join
  const query = await balancer.pools.generalisedJoin(
    bbausd2.id,
    tokensIn,
    amountsIn,
    signerAddress,
    wrapLeafTokens,
    slippage,
    relayerAuth
  );

  // Submit join tx
  const transactionResponse = await signer.sendTransaction({
    to: query.to,
    data: query.callData,
  });

  await transactionResponse.wait();
  const tokenBalancesAfter = (
    await getBalances([bbausd2.address, ...tokensIn], signer, signerAddress)
  ).map((b) => b.toString());

  console.log('Balances before exit:        ', tokenBalancesBefore);
  console.log('Balances after exit:         ', tokenBalancesAfter);
  console.log('Expected BPT after exit:     ', [query.expectedOut]);
  console.log('Min BPT after exit:          ', [query.minOut]);
}

// yarn examples:run ./examples/joinGeneralised.ts
join();
