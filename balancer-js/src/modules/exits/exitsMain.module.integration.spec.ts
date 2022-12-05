// yarn test:only ./src/modules/exits/exitsMain.module.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';

import { BalancerSDK, BalancerTenderlyConfig, Network } from '@/.';
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';
import { JsonRpcSigner } from '@ethersproject/providers';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

dotenv.config();

const TEST_BOOSTED = false;
const TEST_BOOSTED_META = false;
const TEST_BOOSTED_META_ALT = false;
const TEST_BOOSTED_META_BIG = false;
const TEST_BOOSTED_WEIGHTED_SIMPLE = false;
const TEST_BOOSTED_WEIGHTED_GENERAL = false;
const TEST_BOOSTED_WEIGHTED_META = false;
const TEST_BOOSTED_WEIGHTED_META_ALT = true;
const TEST_BOOSTED_WEIGHTED_META_GENERAL = false;

/*
 * Testing on GOERLI
 * - Run node on terminal: yarn run node:goerli
 * - Uncomment section below:
 */
const network = Network.MAINNET;
const blockNumber = 16117696;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2';
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';

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

  // console.log(tokensOut);
  console.log(`\nSimulation tokens out:`);
  console.log(formatFixed(expectedAmountsOut[0], 18), 'DAI');
  const wstEthDollar = SolidityMaths.mulDownFixed(
    BigInt(expectedAmountsOut[1]),
    BigInt('1411000000000000000000')
  );
  console.log(
    formatFixed(expectedAmountsOut[1], 18),
    formatFixed(wstEthDollar, 18),
    'wstEth/wstEth($)'
  );
  console.log(formatFixed(expectedAmountsOut[2], 6), 'USDC');
  console.log(formatFixed(expectedAmountsOut[3], 6), 'USDT');

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
  boostedWeightedMetaAlt1: 1 normal token + 1 ComposableStable
  WETH
  b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
  */
  context('boostedWeightedMetaAlt', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META_ALT) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.wstETH_bbaUSD.address];
      const slots = [addresses.wstETH_bbaUSD.slot];
      const balances = [
        parseFixed('1', addresses.wstETH_bbaUSD.decimals).toString(),
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
          id: addresses.wstETH_bbaUSD.id,
          address: addresses.wstETH_bbaUSD.address,
        },
        amount: parseFixed('0.56', addresses.wstETH_bbaUSD.decimals).toString(),
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
