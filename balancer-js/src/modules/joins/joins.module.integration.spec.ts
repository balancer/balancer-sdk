import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';

import { BalancerSDK, Network } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';
import { JsonRpcSigner } from '@ethersproject/providers';

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

interface Test {
  signer: JsonRpcSigner;
  description: string;
  pool: {
    id: string;
    address: string;
  };
  tokensIn: string[];
  amountsIn: string[];
  authorisation: string | undefined;
  wrapMainTokens: boolean;
}

const runTests = async (tests: Test[]) => {
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    it(test.description, async () => {
      const userAddress = await test.signer.getAddress();
      const signerAddress = await signer.getAddress();
      const authorisation = await Relayer.signRelayerApproval(
        relayer,
        signerAddress,
        signer,
        contracts.vault
      );
      await testFlow(
        userAddress,
        test.pool,
        test.tokensIn,
        test.amountsIn,
        test.wrapMainTokens,
        authorisation
      );
    });
  }
};

const testFlow = async (
  userAddress: string,
  pool: { id: string; address: string },
  tokensIn: string[],
  amountsIn: string[],
  wrapMainTokens: boolean,
  authorisation: string | undefined
) => {
  const [bptBalanceBefore, ...tokensInBalanceBefore] = await getBalances(
    [pool.address, ...tokensIn],
    signer,
    userAddress
  );

  const gasLimit = MAX_GAS_LIMIT;
  const slippage = '10'; // 10 bps = 0.1%

  const query = await pools.generalisedJoin(
    pool.id,
    tokensIn,
    amountsIn,
    userAddress,
    wrapMainTokens,
    slippage,
    signer,
    authorisation
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
    userAddress
  );
  expect(receipt.status).to.eql(1);
  expect(BigNumber.from(query.minOut).gte('0')).to.be.true;
  expect(BigNumber.from(query.expectedOut).gt(query.minOut)).to.be.true;
  tokensInBalanceAfter.forEach((balanceAfter, i) => {
    expect(balanceAfter.toString()).to.eq(
      tokensInBalanceBefore[i].sub(amountsIn[i]).toString()
    );
  });
  expect(bptBalanceBefore.eq(0)).to.be.true;
  expect(bptBalanceAfter.gte(query.minOut)).to.be.true;
  console.log(bptBalanceAfter.toString(), 'bpt after');
  console.log(query.minOut, 'minOut');
  console.log(query.expectedOut, 'expectedOut');
};

describe('generalised join execution', async () => {
  // following contexts currently applies to GOERLI only
  /*
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  */
  context('boosted', async () => {
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.MAI.address,
        addresses.WETH.address,
        addresses.waMAI.address,
        addresses.waWETH.address,
        addresses.bbamai.address,
        addresses.bbaweth.address,
      ];
      const slots = [
        addresses.MAI.slot,
        addresses.WETH.slot,
        addresses.waMAI.slot,
        addresses.waWETH.slot,
        addresses.bbamai.slot,
        addresses.bbaweth.slot,
      ];
      const balances = [
        parseFixed('100', 18).toString(),
        parseFixed('100', 18).toString(),
        '0',
        '0',
        parseFixed('100', addresses.bbamai.decimals).toString(),
        parseFixed('100', addresses.bbaweth.decimals).toString(),
      ];
      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        blockNumber
      );
    });

    await runTests([
      {
        signer,
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.bbamaiweth.id,
          address: addresses.bbamaiweth.address,
        },
        tokensIn: [addresses.MAI.address, addresses.WETH.address],
        amountsIn: [
          parseFixed('100', 18).toString(),
          parseFixed('100', 18).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with 1 linear',
        pool: {
          id: addresses.bbamaiweth.id,
          address: addresses.bbamaiweth.address,
        },
        tokensIn: [addresses.bbamai.address],
        amountsIn: [parseFixed('10', 18).toString()],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with 1 leaf and 1 linear',
        pool: {
          id: addresses.bbamaiweth.id,
          address: addresses.bbamaiweth.address,
        },
        tokensIn: [addresses.WETH.address, addresses.bbamai.address],
        amountsIn: [
          parseFixed('10', 18).toString(),
          parseFixed('10', 18).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });

  // following contexts currently applies to GOERLI only
  /*
    boostedMeta1: ComposableStable, baMai/bbausd2
    baMai: Linear, aMai/Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMeta', async () => {
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.MAI.address,
        addresses.waDAI.address,
        addresses.waUSDC.address,
        addresses.waUSDT.address,
        addresses.waMAI.address,
        addresses.bbamai.address,
        addresses.bbadai.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.MAI.slot,
        addresses.waDAI.slot,
        addresses.waUSDC.slot,
        addresses.waUSDT.slot,
        addresses.waMAI.slot,
        addresses.bbamai.slot,
        addresses.bbadai.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
        '0',
        '0',
        '0',
        '0',
        parseFixed('10', addresses.bbamai.decimals).toString(),
        parseFixed('10', addresses.bbadai.decimals).toString(),
      ];
      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        blockNumber
      );
    });

    await runTests([
      {
        signer,
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedMeta1.id,
          address: addresses.boostedMeta1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.MAI.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with child linear',
        pool: {
          id: addresses.boostedMeta1.id,
          address: addresses.boostedMeta1.address,
        },
        tokensIn: [addresses.bbamai.address],
        amountsIn: [parseFixed('10', addresses.bbamai.decimals).toString()],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join withleaf and child linear',
        pool: {
          id: addresses.boostedMeta1.id,
          address: addresses.boostedMeta1.address,
        },
        tokensIn: [addresses.DAI.address, addresses.bbamai.address],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.bbamai.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // TODO child boosted
      // TODO child boosted and leaf
    ]);
  });
  // following contexts currently applies to GOERLI only
  /*
  boostedMetaBig1: ComposableStable, bbamaiweth/bbausd2
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
  */
  context('boostedMetaBig', async () => {
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.MAI.address,
        addresses.WETH.address,
        addresses.waDAI.address,
        addresses.waUSDC.address,
        addresses.waUSDT.address,
        addresses.waMAI.address,
        addresses.waWETH.address,
        addresses.bbamai.address,
        addresses.bbamaiweth.address,
        addresses.bbadai.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.MAI.slot,
        addresses.WETH.slot,
        addresses.waDAI.slot,
        addresses.waUSDC.slot,
        addresses.waUSDT.slot,
        addresses.waMAI.slot,
        addresses.waWETH.slot,
        addresses.bbamai.slot,
        addresses.bbamaiweth.slot,
        addresses.bbadai.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
        parseFixed('10', addresses.WETH.decimals).toString(),
        '0',
        '0',
        '0',
        '0',
        '0',
        parseFixed('10', addresses.bbamai.decimals).toString(),
        parseFixed('10', addresses.bbamaiweth.decimals).toString(),
        parseFixed('10', addresses.bbadai.decimals).toString(),
      ];
      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        blockNumber
      );
    });

    await runTests([
      {
        signer,
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedMetaBig1.id,
          address: addresses.boostedMetaBig1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
          addresses.WETH.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.MAI.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // TODO child boosted
      // TODO child boosted and leaf
    ]);
  });
});

// 'joins boosted pool with 2 linear input'
// 'joins boosted pool with both leaf and linear tokens'
