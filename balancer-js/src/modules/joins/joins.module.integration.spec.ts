import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';

import { BalancerSDK, Network } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';

/*
 * Testing on GOERLI
 * - Update hardhat.config.js with chainId = 5
 * - Update ALCHEMY_URL on .env with a goerli api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
const network = Network.GOERLI;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta';
const blockNumber = 7596322;
const bbausd2id =
  '0x3d5981bdd8d3e49eb7bbdc1d2b156a3ee019c18e0000000000000000000001a7';
const bbausd2address = '0x3d5981bdd8d3e49eb7bbdc1d2b156a3ee019c18e';

/*
 * Testing on MAINNET
 * - Update hardhat.config.js with chainId = 1
 * - Update ALCHEMY_URL on .env with a mainnet api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
// const network = Network.MAINNET;
// const blockNumber = 15519886;
// const customSubgraphUrl =
//   'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta';
// const bbausd2id =
//   '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
// const bbausd2address = '0xa13a9247ea42d743238089903570127dda72fe44';
// const bbadai = '0xae37d54ae477268b9997d4161b96b8200755935c';

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

const testFlow = async (
  pool: { id: string; address: string },
  tokens: string[],
  slots: number[],
  balances: string[],
  tokensIn: string[],
  amountsIn: string[],
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

  const authorisation = await Relayer.signRelayerApproval(
    relayer,
    signerAddress,
    signer,
    contracts.vault
  );
  const [bptBalanceBefore, ...tokensInBalanceBefore] = await getBalances(
    [pool.address, ...tokensIn],
    signer,
    signerAddress
  );

  const gasLimit = MAX_GAS_LIMIT;
  const slippage = '10'; // 10 bps = 0.1%

  const query = await pools.generalisedJoin(
    pool.id,
    tokensIn,
    amountsIn,
    signerAddress,
    wrapMainTokens,
    slippage,
    signer,
    previouslyAuthorised ? undefined : authorisation
  );

  const response = await signer.sendTransaction({
    to: query.to,
    data: query.callData,
    gasLimit,
  });

  const receipt = await response.wait();
  console.log('Gas used', receipt.gasUsed.toString());

  const [bptBalanceAfter, ...tokensInBalanceAfter] = await getBalances(
    [pool.address, ...tokensIn],
    signer,
    signerAddress
  );

  expect(receipt.status).to.eql(1);
  expect(BigNumber.from(query.minOut).gte('0')).to.be.true;
  expect(BigNumber.from(query.expectedOut).gt(query.minOut)).to.be.true;
  tokensInBalanceAfter.forEach((balanceAfter, i) => {
    expect(balanceAfter.toString()).to.eq(
      tokensInBalanceBefore[i].sub(amountsIn[i]).toString()
    );
  });
  tokensInBalanceAfter.forEach((b) => expect(b.toString()).to.eq('0'));
  expect(bptBalanceBefore.eq(0)).to.be.true;
  expect(bptBalanceAfter.gte(query.minOut)).to.be.true;
  console.log(bptBalanceAfter.toString(), 'bpt after');
  console.log(query.minOut, 'minOut');
  console.log(query.expectedOut, 'expectedOut');
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
    // tests with wrapped tokens will be ignored for now - transactions are failing because mock wrappers don't have deposit functions
    // it('joins with wrapping', async () => {
    //   await testFlow(
    //     pool,
    //     [...mainTokens, ...wrappedTokens, ...linearTokens],
    //     [...mainSlots, ...wrappedSlots, ...linearSlots],
    //     [...mainBalances, ...wrappedBalances, ...linearBalances],
    //     mainTokens,
    //     mainBalances,
    //     true
    //   );
    // });
  });
  context('linear pool token as input', async () => {
    it('joins boosted pool with single linear input', async () => {
      await testFlow(
        pool,
        [...mainTokens, ...wrappedTokens, ...linearTokens],
        [...mainSlots, ...wrappedSlots, ...linearSlots],
        [...mainBalances, ...wrappedBalances, ...linearBalances],
        [linearTokens[0]],
        [linearBalances[0]],
        false
      );
    });
    it('joins boosted pool with 2 linear input', async () => {
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
        [mainTokens[1], ...linearTokens],
        [mainBalances[1], ...linearBalances],
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
  //       id: bbausd2id,
  //       address: bbausd2address,
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
  //     linearTokens: [addresses.bbadai.address, addresses.bbausdc.address],
  //     linearSlots: [0, 0],
  //     linearBalances: [
  //       parseFixed('100', 18).toString(),
  //       parseFixed('100', 18).toString(),
  //     ],
  //   });
  // });

  // following contexts currently applies to GOERLI only
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
      // joins with wrapping require token approvals. These are taken care of as part of fork setup when wrappedTokens passed in.
      wrappedTokens: [addresses.waMAI.address, addresses.waWETH.address],
      wrappedSlots: [addresses.waMAI.slot, addresses.waWETH.slot],
      wrappedBalances: ['0', '0'],
      linearTokens: [addresses.bbamai.address],
      linearSlots: [addresses.bbamai.slot],
      linearBalances: [parseFixed('100', 18).toString()],
    });
  });

  context('boostedMeta1', async () => {
    await testScenario({
      pool: {
        id: addresses.boostedMeta1.id,
        address: addresses.boostedMeta1.address,
      },
      mainTokens: [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.MAI.address,
      ],
      mainSlots: [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.MAI.slot,
      ],
      mainBalances: [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
      ],
      // joins with wrapping require token approvals. These are taken care of as part of fork setup when wrappedTokens passed in.
      wrappedTokens: [
        addresses.waDAI.address,
        addresses.waUSDC.address,
        addresses.waUSDT.address,
        addresses.waMAI.address,
      ],
      wrappedSlots: [
        addresses.waDAI.slot,
        addresses.waUSDC.slot,
        addresses.waUSDT.slot,
        addresses.waMAI.slot,
      ],
      wrappedBalances: ['0', '0', '0', '0'],
      linearTokens: [addresses.bbamai.address],
      linearSlots: [addresses.bbamai.slot],
      linearBalances: [parseFixed('10', addresses.bbamai.decimals).toString()],
    });
  });

  context('boostedMetaBig1', async () => {
    await testScenario({
      pool: {
        id: addresses.boostedMetaBig1.id,
        address: addresses.boostedMetaBig1.address,
      },
      mainTokens: [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.MAI.address,
        addresses.WETH.address,
      ],
      mainSlots: [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.MAI.slot,
        addresses.WETH.slot,
      ],
      mainBalances: [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
        parseFixed('10', addresses.WETH.decimals).toString(),
      ],
      // joins with wrapping require token approvals. These are taken care of as part of fork setup when wrappedTokens passed in.
      wrappedTokens: [
        addresses.waDAI.address,
        addresses.waUSDC.address,
        addresses.waUSDT.address,
        addresses.waMAI.address,
        addresses.waWETH.address,
      ],
      wrappedSlots: [
        addresses.waDAI.slot,
        addresses.waUSDC.slot,
        addresses.waUSDT.slot,
        addresses.waMAI.slot,
        addresses.waWETH.slot,
      ],
      wrappedBalances: ['0', '0', '0', '0', '0'],
      linearTokens: [addresses.bbamaiweth.address],
      linearSlots: [addresses.bbamaiweth.slot],
      linearBalances: [
        parseFixed('10', addresses.bbamaiweth.decimals).toString(),
      ],
    });
  });
});
