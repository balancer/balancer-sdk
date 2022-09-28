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
    });
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

  const query = await pools.generalisedExit(
    pool.id,
    amount,
    signerAddress,
    signer,
    slippage,
    authorisation
  );

  const [bptBalanceBefore, ...tokensOutBalanceBefore] = await getBalances(
    [pool.address, ...query.tokensOut],
    signer,
    signerAddress
  );

  const response = await signer.sendTransaction({
    to: query.to,
    data: query.callData,
    gasLimit,
  });

  const receipt = await response.wait();
  console.log('Gas used', receipt.gasUsed.toString());

  const [bptBalanceAfter, ...tokensOutBalanceAfter] = await getBalances(
    [pool.address, ...query.tokensOut],
    signer,
    signerAddress
  );
  expect(receipt.status).to.eql(1);
  query.minAmountsOut.forEach((minAmountOut) => {
    expect(BigNumber.from(minAmountOut).gte('0')).to.be.true;
  });
  query.expectedAmountsOut.forEach((expectedAmountOut, i) => {
    expect(
      BigNumber.from(expectedAmountOut).gte(
        BigNumber.from(query.minAmountsOut[i])
      )
    ).to.be.true;
  });
  expect(bptBalanceAfter.eq(bptBalanceBefore.sub(amount))).to.be.true;
  tokensOutBalanceBefore.forEach((b) => expect(b.eq(0)).to.be.true);
  tokensOutBalanceAfter.forEach((balanceAfter, i) => {
    const minOut = BigNumber.from(query.minAmountsOut[i]);
    return expect(balanceAfter.gte(minOut)).to.be.true;
  });
  console.log('bpt after', query.tokensOut.toString());
  console.log('minOut', query.minAmountsOut.toString());
  console.log('expectedOut', query.expectedAmountsOut.toString());
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

  // following contexts currently applies to GOERLI only
  /*
    boostedMeta1: ComposableStable, baMai/bbausd2
    baMai: Linear, aMai/Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMeta', async () => {
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
});
