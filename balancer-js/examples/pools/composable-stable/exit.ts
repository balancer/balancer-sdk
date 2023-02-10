// yarn examples:run ./examples/pools/composable-stable/exit.ts
import dotenv from 'dotenv';
dotenv.config();
import { parseFixed } from '@ethersproject/bignumber';
import { Network, removeItem } from '@/.';
import { getBalances } from '@/test/lib/utils';
import { setUpExample } from './helper';

async function exitPoolExample() {
  const { ALCHEMY_URL: rpcUrlArchive } = process.env;
  const rpcUrlLocal = 'http://127.0.0.1:8545';
  const network = Network.MAINNET;
  const bptIn = parseFixed('10', 18).toString();
  const slippage = '100'; // 1%
  const poolToExit = {
    address: '0xa13a9247ea42d743238089903570127dda72fe44',
    id: '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
  };

  // Example runs against a local fork of mainnet state. This sets up local fork with required BPT balance and retrieves pool data
  const { pool, signer } = await setUpExample(
    rpcUrlArchive as string,
    rpcUrlLocal,
    network,
    [poolToExit.address],
    [0],
    [bptIn],
    poolToExit.id,
    16350000
  );

  const signerAddress = await signer.getAddress();

  const tokensOut = removeItem(pool.tokensList, pool.bptIndex);

  // We are exiting all the BPT to a single token out
  const { to, data, expectedAmountsOut } = pool.buildExitExactBPTIn(
    signerAddress,
    bptIn,
    slippage,
    false,
    tokensOut[0]
  );

  // Send transaction to local fork
  const transactionResponse = await signer.sendTransaction({ to, data });
  await transactionResponse.wait();

  // Check balances after transaction to confirm success
  const balances = await getBalances(pool.tokensList, signer, signerAddress);

  console.log(`${removeItem(balances, pool.bptIndex)[0]}: Token Amount Out`);
  console.log(`${expectedAmountsOut[0]}: Expected Amount Out`);
  console.log(`${balances[pool.bptIndex]}: bptBalance Remaining`);
}

exitPoolExample();
