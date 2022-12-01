// yarn test:only ./src/modules/exits/exits.module.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';

import { BalancerSDK, BalancerTenderlyConfig, Network } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';
import { JsonRpcSigner } from '@ethersproject/providers';

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

/*
 * Testing on GOERLI
 * - Run node on terminal: yarn run node:goerli
 * - Uncomment section below:
 */
const network = Network.GOERLI;
const blockNumber = 7890980;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta';
const { ALCHEMY_URL_GOERLI: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8000';

/*
 * Testing on MAINNET
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
// const network = Network.MAINNET;
// const blockNumber = 15519886;
// const customSubgraphUrl =
//   'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta';
// const { ALCHEMY_URL: jsonRpcUrl } = process.env;
// const rpcUrl = 'http://127.0.0.1:8545';

const { TENDERLY_ACCESS_KEY, TENDERLY_USER, TENDERLY_PROJECT } = process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

// Custom Tenderly configuration parameters - remove in order to use default values
const tenderlyConfig: BalancerTenderlyConfig = {
  accessKey: TENDERLY_ACCESS_KEY as string,
  user: TENDERLY_USER as string,
  project: TENDERLY_PROJECT as string,
  blockNumber,
};

const sdk = new BalancerSDK({
  network,
  rpcUrl,
  customSubgraphUrl,
  tenderly: tenderlyConfig,
});
const { pools } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const { contracts, contractAddresses } = new Contracts(
  network as number,
  provider
);
const relayer = contractAddresses.relayerV4 as string;
const addresses = ADDRESSES[network];

interface Test {
  signer: JsonRpcSigner;
  description: string;
  pool: {
    id: string;
    address: string;
  };
  amount: string;
  authorisation: string | undefined;
}

const runTests = async (tests: Test[]) => {
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    it(test.description, async () => {
      const signerAddress = await test.signer.getAddress();
      // const signerAddress = '0xb7d222a710169f42ddff2a9a5122bd7c724dc203';
      const authorisation = await Relayer.signRelayerApproval(
        relayer,
        signerAddress,
        test.signer,
        contracts.vault
      );
      // const authorisation = undefined;
      await testFlow(
        test.signer,
        signerAddress,
        test.pool,
        test.amount,
        authorisation
      );
    }).timeout(120000);
  }
};

const testFlow = async (
  signer: JsonRpcSigner,
  signerAddress: string,
  pool: { id: string; address: string },
  amount: string,
  authorisation: string | undefined
) => {
  const gasLimit = MAX_GAS_LIMIT;
  const slippage = '10'; // 10 bps = 0.1%

  const { to, callData, tokensOut, expectedAmountsOut, minAmountsOut } =
    await pools.generalisedExit(
      pool.id,
      amount,
      signerAddress,
      slippage,
      authorisation
    );

  const [bptBalanceBefore, ...tokensOutBalanceBefore] = await getBalances(
    [pool.address, ...tokensOut],
    signer,
    signerAddress
  );

  const response = await signer.sendTransaction({
    to,
    data: callData,
    gasLimit,
  });

  const receipt = await response.wait();
  console.log('Gas used', receipt.gasUsed.toString());

  const [bptBalanceAfter, ...tokensOutBalanceAfter] = await getBalances(
    [pool.address, ...tokensOut],
    signer,
    signerAddress
  );
  expect(receipt.status).to.eql(1);
  minAmountsOut.forEach((minAmountOut) => {
    expect(BigNumber.from(minAmountOut).gte('0')).to.be.true;
  });
  expectedAmountsOut.forEach((expectedAmountOut, i) => {
    expect(
      BigNumber.from(expectedAmountOut).gte(BigNumber.from(minAmountsOut[i]))
    ).to.be.true;
  });
  expect(bptBalanceAfter.eq(bptBalanceBefore.sub(amount))).to.be.true;
  tokensOutBalanceBefore.forEach((b) => expect(b.eq(0)).to.be.true);
  tokensOutBalanceAfter.forEach((balanceAfter, i) => {
    const minOut = BigNumber.from(minAmountsOut[i]);
    return expect(balanceAfter.gte(minOut)).to.be.true;
  });
  // console.log('bpt after', query.tokensOut.toString());
  // console.log('minOut', minAmountsOut.toString());
  // console.log('expectedOut', expectedAmountsOut.toString());
};

// all contexts currently applies to GOERLI only
describe('generalised exit execution', async () => {
  /*
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  */
  context('boosted', async () => {
    if (!TEST_BOOSTED) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.bbamaiweth.address];
      const slots = [addresses.bbamaiweth.slot];
      const balances = [
        parseFixed('0.02', addresses.bbamaiweth.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.bbamaiweth.id,
          address: addresses.bbamaiweth.address,
        },
        amount: parseFixed('0.01', addresses.bbamaiweth.decimals).toString(),
        authorisation: authorisation,
      },
    ]);
  });

  /*
    boostedMeta1: ComposableStable, baMai/bbausd2
    baMai: Linear, aMai/Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMeta', async () => {
    if (!TEST_BOOSTED_META) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedMeta1.address];
      const slots = [addresses.boostedMeta1.slot];
      const balances = [
        parseFixed('1', addresses.boostedMeta1.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedMeta1.id,
          address: addresses.boostedMeta1.address,
        },
        amount: parseFixed('0.05', addresses.boostedMeta1.decimals).toString(),
        authorisation: authorisation,
      },
    ]);
  });

  /*
    boostedMetaAlt1: ComposableStable, Mai/bbausd2
    Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMetaAlt', async () => {
    if (!TEST_BOOSTED_META_ALT) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedMetaAlt1.address];
      const slots = [addresses.boostedMetaAlt1.slot];
      const balances = [
        parseFixed('1', addresses.boostedMetaAlt1.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedMetaAlt1.id,
          address: addresses.boostedMetaAlt1.address,
        },
        amount: parseFixed(
          '0.05',
          addresses.boostedMetaAlt1.decimals
        ).toString(),
        authorisation: authorisation,
      },
    ]);
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
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedMetaBig1.address];
      const slots = [addresses.boostedMetaBig1.slot];
      const balances = [
        parseFixed('1', addresses.boostedMetaBig1.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedMetaBig1.id,
          address: addresses.boostedMetaBig1.address,
        },
        amount: parseFixed(
          '0.05',
          addresses.boostedMetaBig1.decimals
        ).toString(),
        authorisation: authorisation,
      },
    ]);
  });

  /*
  boostedWeightedSimple1: 1 Linear + 1 normal token
  b-a-weth: Linear, aWeth/Weth
  BAL
  */
  context('boostedWeightedSimple', async () => {
    if (!TEST_BOOSTED_WEIGHTED_SIMPLE) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedWeightedSimple1.address];
      const slots = [addresses.boostedWeightedSimple1.slot];
      const balances = [
        parseFixed('1', addresses.boostedWeightedSimple1.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedWeightedSimple1.id,
          address: addresses.boostedWeightedSimple1.address,
        },
        amount: parseFixed(
          '0.05',
          addresses.boostedWeightedSimple1.decimals
        ).toString(),
        authorisation: authorisation,
      },
    ]);
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
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedWeightedGeneral1.address];
      const slots = [addresses.boostedWeightedGeneral1.slot];
      const balances = [
        parseFixed('1', addresses.boostedWeightedGeneral1.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedWeightedGeneral1.id,
          address: addresses.boostedWeightedGeneral1.address,
        },
        amount: parseFixed(
          '0.05',
          addresses.boostedWeightedGeneral1.decimals
        ).toString(),
        authorisation: authorisation,
      },
    ]);
  });

  /*
  boostedWeightedMeta1: 1 Linear + 1 ComposableStable
  b-a-weth: Linear, aWeth/Weth
  bb-a-usd2: ComposableStable, b-a-usdc/b-a-usdt/b-a-dai
  BAL
  */
  context('boostedWeightedMeta', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedWeightedMeta1.address];
      const slots = [addresses.boostedWeightedMeta1.slot];
      const balances = [
        parseFixed('1', addresses.boostedWeightedMeta1.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedWeightedMeta1.id,
          address: addresses.boostedWeightedMeta1.address,
        },
        amount: parseFixed(
          '0.05',
          addresses.boostedWeightedMeta1.decimals
        ).toString(),
        authorisation: authorisation,
      },
    ]);
  });

  /*
  boostedWeightedMetaAlt1: 1 normal token + 1 ComposableStable
  WETH
  b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
  */
  context('boostedWeightedMetaAlt', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META_ALT) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedWeightedMetaAlt1.address];
      const slots = [addresses.boostedWeightedMetaAlt1.slot];
      const balances = [
        parseFixed('1', addresses.boostedWeightedMetaAlt1.decimals).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedWeightedMetaAlt1.id,
          address: addresses.boostedWeightedMetaAlt1.address,
        },
        amount: parseFixed(
          '0.01',
          addresses.boostedWeightedMetaAlt1.decimals
        ).toString(),
        authorisation: authorisation,
      },
    ]);
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
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.boostedWeightedMetaGeneral1.address];
      const slots = [addresses.boostedWeightedMetaGeneral1.slot];
      const balances = [
        parseFixed(
          '1',
          addresses.boostedWeightedMetaGeneral1.decimals
        ).toString(),
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
        description: 'exit pool',
        pool: {
          id: addresses.boostedWeightedMetaGeneral1.id,
          address: addresses.boostedWeightedMetaGeneral1.address,
        },
        amount: parseFixed(
          '0.05',
          addresses.boostedWeightedMetaGeneral1.decimals
        ).toString(),
        authorisation: authorisation,
      },
    ]);
  });
});
