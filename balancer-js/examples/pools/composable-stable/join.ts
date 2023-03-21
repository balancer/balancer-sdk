// yarn examples:run ./examples/pools/composable-stable/join.ts
import dotenv from 'dotenv';
dotenv.config();
import { Network } from '@/lib/constants';
import { getBalances } from '@/test/lib/utils';
import { parseFixed } from '@ethersproject/bignumber';
import { setUpExample } from '../helper';
import { removeItem } from '@/index';

async function joinPoolExample() {
  const { ALCHEMY_URL: rpcUrlArchive } = process.env;
  const rpcUrlLocal = 'http://127.0.0.1:8545';
  const network = Network.MAINNET;
  const poolToJoin =
    '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
  const tokensIn = [
    '0x2f4eb100552ef93840d5adc30560e5513dfffacb', // bbausdt
    '0x82698aecc9e28e9bb27608bd52cf57f704bd1b83', // bbausdc
    '0xae37d54ae477268b9997d4161b96b8200755935c', // bbadai
  ];
  const amountsIn = [
    parseFixed('100', 18).toString(),
    parseFixed('100', 18).toString(),
    parseFixed('100', 18).toString(),
  ];
  const slippage = '100'; // 1%

  // Example runs against a local fork of mainnet state. This sets up local fork with required token balances and approvals and retrieves pool data
  const { pool, signer } = await setUpExample(
    rpcUrlArchive as string,
    rpcUrlLocal,
    network,
    tokensIn,
    [0, 0, 0],
    amountsIn,
    poolToJoin,
    16350000
  );

  const signerAddress = await signer.getAddress();

  // Joining with full balances of tokens in
  const { to, data, expectedBPTOut } = pool.buildJoin(
    signerAddress,
    tokensIn,
    amountsIn,
    slippage
  );

  await signer.sendTransaction({ to, data });

  const tokensBalanceAfter = await getBalances(
    pool.tokensList,
    signer,
    signerAddress
  );
  console.log(
    `${removeItem(
      tokensBalanceAfter,
      pool.bptIndex
    ).toString()}: tokensBalanceAfter`
  );
  console.log(`${tokensBalanceAfter[pool.bptIndex]}: bptBalanceAfter`);
  console.log(`${expectedBPTOut}: expectedBptOut`);
}

joinPoolExample();
