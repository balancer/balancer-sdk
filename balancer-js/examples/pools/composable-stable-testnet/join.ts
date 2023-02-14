import { Network } from '@/lib/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { Pools } from '@/modules/pools';
import { getBalances } from '@/test/lib/utils';
import { Pool } from '@/types';
import { parseFixed } from '@ethersproject/bignumber';
import { ethers } from 'hardhat';
import dotenv from 'dotenv';
import pools_16350000 from '@/test/lib/pools_16350000.json';

dotenv.config();

const network = Network.GOERLI;

let rpcUrl = `${process.env.ALCHEMY_URL_GOERLI}`;
if ((network as Network) == Network.BSCTESTNET) {
  rpcUrl = `${process.env.GETBLOCK_URL_TEST}`;
} else if ((network as Network) == Network.BSC) {
  rpcUrl = `${process.env.GETBLOCK_URL}`;
}

const poolObj = pools_16350000.find(
  ({ id }) =>
    id == '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d'
) as unknown as Pool;

const sdk = new BalancerSDK({ network, rpcUrl });

const { networkConfig } = sdk;

//REMOVING THE BPT FROM THE TOKENS IN
const tokensIn = [
  ...poolObj.tokens
    .filter(({ address }) => address !== poolObj.address)
    .map(({ address }) => address),
];

const bptIndex = poolObj.tokens.findIndex(
  ({ address }) => address === poolObj.address
);

const amountsIn = [
  parseFixed('10', 18).toString(),
  parseFixed('40', 18).toString(),
];

const pool = Pools.wrap(poolObj, networkConfig);

async function composableStableJoin() {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const wallet = new ethers.Wallet(`${process.env.TRADER_KEY}`, provider);

  const walletAddress = await wallet.getAddress();

  const tokensBalanceBefore = await getBalances(
    poolObj.tokens.map(({ address }) => address),
    signer,
    walletAddress
  );
  const bptBalanceBefore = tokensBalanceBefore.splice(bptIndex, 1);

  const slippage = '1';

  const { to, data, minBPTOut } = pool.buildJoin(
    walletAddress,
    tokensIn,
    amountsIn,
    slippage
  );

  await wallet.sendTransaction({
    to,
    data,
    gasLimit: 3000000,
  });

  const tokensBalanceAfter = await getBalances(
    poolObj.tokens.map(({ address }) => address),
    signer,
    walletAddress
  );
  const bptBalanceAfter = tokensBalanceAfter.splice(bptIndex, 1);
  console.log('bptBalanceBefore: ' + bptBalanceBefore);
  console.log('bptBalanceAfter: ' + bptBalanceAfter);
  console.log(
    'minBptBalanceExpected: ' +
      (BigInt(bptBalanceBefore.toString()) + BigInt(minBPTOut))
  );
  console.log(
    'tokensBalanceBefore: ' + tokensBalanceBefore.map((b) => b.toString())
  );
  console.log(
    'tokensBalanceAfter: ' + tokensBalanceAfter.map((b) => b.toString())
  );
}

export default composableStableJoin();
