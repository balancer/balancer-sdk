import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';

import { BalancerSDK, Network, RelayerAuthorization } from '@/.';
import { parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { JsonRpcSigner } from '@ethersproject/providers';
import { MaxUint256 } from '@ethersproject/constants';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';

/*
 * Testing on GOERLI
 * - Update hardhat.config.js with chainId = 5
 * - Update ALCHEMY_URL on .env with a goerli api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
const network = Network.GOERLI;
const blockNumber = 7590000;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta';

/*
 * Testing on MAINNET
 * - Update hardhat.config.js with chainId = 1
 * - Update ALCHEMY_URL on .env with a mainnet api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
// const network = Network.MAINNET;
// const blockNumber = 15495943;
// const customSubgraphUrl =
//   'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const rpcUrl = 'http://127.0.0.1:8545';
const sdk = new BalancerSDK({
  network,
  rpcUrl,
  customSubgraphUrl,
});
const { pools } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const { contracts, contractAddresses } = new Contracts(
  network as number,
  provider
);
const relayer = contractAddresses.relayer as string;
const addresses = ADDRESSES[network];

const signRelayerApproval = async (
  relayerAddress: string,
  signerAddress: string,
  signer: JsonRpcSigner
): Promise<string> => {
  const approval = contracts.vault.interface.encodeFunctionData(
    'setRelayerApproval',
    [signerAddress, relayerAddress, true]
  );

  const signature =
    await RelayerAuthorization.signSetRelayerApprovalAuthorization(
      contracts.vault,
      signer,
      relayerAddress,
      approval
    );

  const calldata = RelayerAuthorization.encodeCalldataAuthorization(
    '0x',
    MaxUint256,
    signature
  );

  return calldata;
};

const testFlow = async (
  pool: { id: string; address: string },
  tokens: string[],
  slots: number[],
  balances: string[],
  tokensIn: string[],
  amountIn: string[],
  wrapMainTokens: boolean,
  previouslyAuthorised = false
) => {
  const signerAddress = await signer.getAddress();

  await forkSetup(
    signer,
    tokens,
    slots,
    balances,
    jsonRpcUrl as string,
    blockNumber
  );

  const authorisation = await signRelayerApproval(
    relayer,
    signerAddress,
    signer
  );
  const [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
    [pool.address, ...tokensIn],
    signer,
    signerAddress
  );

  const gasLimit = MAX_GAS_LIMIT;
  const slippage = '0';

  const query = await pools.generalisedJoin(
    pool.id,
    tokensIn,
    amountIn,
    signerAddress,
    wrapMainTokens,
    slippage,
    previouslyAuthorised ? undefined : authorisation
  );

  const response = await signer.sendTransaction({
    to: query.to,
    data: query.callData,
    gasLimit,
  });

  const receipt = await response.wait();
  console.log('Gas used', receipt.gasUsed.toString());

  const [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
    [pool.address, ...tokensIn],
    signer,
    signerAddress
  );

  expect(receipt.status).to.eql(1);
  expect(bptBalanceBefore.eq(0)).to.be.true;
  // tokensBalanceBefore.forEach(
  //   (b, i) => expect(b.eq(mainInitialBalances[i])).to.be.true
  // );
  tokensBalanceAfter.forEach((b) => expect(b.toString()).to.eq('0'));
  console.log(bptBalanceAfter.toString());
  console.log(query.minOut);
  expect(bptBalanceAfter.gte(query.minOut)).to.be.true;
};

const testScenario = async (params: {
  pool: { id: string; address: string };
  mainTokens: string[];
  wrappedTokens: string[];
  linearTokens: string[];
  mainSlots: number[];
  wrappedSlots: number[];
  linearSlots: number[];
  mainBalances: string[];
  wrappedBalances: string[];
  linearBalances: string[];
}) => {
  const {
    pool,
    mainTokens,
    wrappedTokens,
    linearTokens,
    mainSlots,
    wrappedSlots,
    linearSlots,
    mainBalances,
    wrappedBalances,
    linearBalances,
  } = params;

  context('leaf token input', async () => {
    it('joins with no wrapping', async () => {
      await testFlow(
        pool,
        [...mainTokens, ...wrappedTokens, ...linearTokens],
        [...mainSlots, ...wrappedSlots, ...linearSlots],
        [...mainBalances, ...wrappedBalances, ...linearBalances],
        mainTokens,
        mainBalances,
        false
      );
    }).timeout(2000000);
    it('joins with wrapping', async () => {
      await testFlow(
        pool,
        [...mainTokens, ...wrappedTokens, ...linearTokens],
        [...mainSlots, ...wrappedSlots, ...linearSlots],
        [...mainBalances, ...wrappedBalances, ...linearBalances],
        mainTokens,
        mainBalances,
        true
      );
    });
  });
  context('linear pool token as input', async () => {
    it('joins boosted pool', async () => {
      await testFlow(
        pool,
        [...mainTokens, ...wrappedTokens, ...linearTokens],
        [...mainSlots, ...wrappedSlots, ...linearSlots],
        [...mainBalances, ...wrappedBalances, ...linearBalances],
        linearTokens,
        linearBalances,
        false
      );
    });
  });
  context('leaf and linear pool token as input', async () => {
    it('joins boosted pool', async () => {
      await testFlow(
        pool,
        [...mainTokens, ...wrappedTokens, ...linearTokens],
        [...mainSlots, ...wrappedSlots, ...linearSlots],
        [...mainBalances, ...wrappedBalances, ...linearBalances],
        [mainTokens[1], linearTokens[0]],
        [mainBalances[1], linearBalances[0]],
        false
      );
    });
  });
};

describe('generalised join execution', async () => {
  // // this context currently applies to MAINNET only
  // context('bb-a-usd', async () => {
  //   await testScenario({
  //     pool: {
  //       id: '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d', // bbausd2
  //       address: '0xa13a9247ea42d743238089903570127dda72fe44',
  //     },
  //     mainTokens: [addresses.DAI.address, addresses.USDC.address],
  //     mainSlots: [addresses.DAI.slot, addresses.USDC.slot],
  //     mainBalances: [
  //       parseFixed('100', addresses.DAI.decimals).toString(),
  //       parseFixed('100', addresses.USDC.decimals).toString(),
  //     ],
  //     wrappedTokens: [
  //       addresses.waUSDT.address,
  //       addresses.waDAI.address,
  //       addresses.waUSDC.address,
  //     ], // joins with wrapping require token approvals. These are taken care of as part of fork setup when wrappedTokens passed in.
  //     wrappedSlots: [
  //       addresses.waUSDT.slot,
  //       addresses.waDAI.slot,
  //       addresses.waUSDC.slot,
  //     ],
  //     wrappedBalances: ['0', '0', '0'],
  //     linearTokens: ['0xae37d54ae477268b9997d4161b96b8200755935c'],
  //     linearSlots: [0],
  //     linearBalances: [parseFixed('100', 18).toString()],
  //   });
  // });
  // this context currently applies to GOERLI only
  context('bb-a-mai-weth', async () => {
    await testScenario({
      pool: {
        id: addresses.bbamaiweth.id,
        address: addresses.bbamaiweth.address,
      },
      mainTokens: [addresses.MAI.address, addresses.WETH.address],
      mainSlots: [addresses.MAI.slot, addresses.WETH.slot],
      mainBalances: [
        parseFixed('100', 18).toString(),
        parseFixed('100', 18).toString(),
      ],
      wrappedTokens: [addresses.waMAI.address, addresses.waWETH.address], // joins with wrapping require token approvals. These are taken care of as part of fork setup when wrappedTokens passed in.
      wrappedSlots: [addresses.waMAI.slot, addresses.waWETH.slot],
      wrappedBalances: ['0', '0'],
      linearTokens: [addresses.bbamai.address],
      linearSlots: [addresses.bbamai.slot],
      linearBalances: [parseFixed('100', 18).toString()],
    });
  });
});
