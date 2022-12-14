// yarn test:only ./src/modules/joins/debug.module.integration.spec.ts
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

const TEST_BOOSTED = true;

/*
 * Testing on MAINNET
 * - Update hardhat.config.js with chainId = 1
 * - Update ALCHEMY_URL on .env with a mainnet api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
const network = Network.MAINNET;
const blockNumber = 16176441;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2';
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';

const { TENDERLY_ACCESS_KEY, TENDERLY_USER, TENDERLY_PROJECT } = process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

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
      const authorisation = await Relayer.signRelayerApproval(
        relayer,
        userAddress,
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
    }).timeout(120000);
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
    authorisation
  );

  console.log(query.priceImpact, 'priceImpact Raw');
  const piPercent = SolidityMaths.mulDownFixed(
    BigInt(query.priceImpact),
    BigInt('100000000000000000000')
  );
  console.log(formatFixed(piPercent, 18), 'priceImpact %');

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
  context('bbausd', async () => {
    if (!TEST_BOOSTED) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.USDC.address,
        addresses.DAI.address,
        addresses.USDT.address,
      ];
      const slots = [
        addresses.USDC.slot,
        addresses.DAI.slot,
        addresses.USDT.slot,
      ];
      const balances = [
        parseFixed('1000000', 6).toString(),
        parseFixed('1000000', 18).toString(),
        parseFixed('1000000', 6).toString(),
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
        description: 'join with leaf tokens',
        pool: {
          id: addresses.bbausd2.id,
          address: addresses.bbausd2.address,
        },
        tokensIn: [
          addresses.USDC.address,
          addresses.DAI.address,
          addresses.USDT.address,
        ],
        amountsIn: [
          parseFixed('10', 6).toString(),
          parseFixed('10', 18).toString(),
          parseFixed('10', 6).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with leaf tokens',
        pool: {
          id: addresses.bbausd2.id,
          address: addresses.bbausd2.address,
        },
        tokensIn: [addresses.USDC.address, addresses.DAI.address],
        amountsIn: [
          parseFixed('0.1', 6).toString(),
          parseFixed('0.001', 18).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with leaf tokens',
        pool: {
          id: addresses.bbausd2.id,
          address: addresses.bbausd2.address,
        },
        tokensIn: [addresses.USDC.address, addresses.DAI.address],
        amountsIn: [
          parseFixed('900000', 6).toString(),
          parseFixed('0.001', 18).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });
});
