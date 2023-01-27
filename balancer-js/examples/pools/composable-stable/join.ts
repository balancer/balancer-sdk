import dotenv from "dotenv";
import { Network } from "@/lib/constants";
import { BalancerSDK } from "@/modules/sdk.module";
import { ethers } from "hardhat";
import pools_14717479 from "@/test/lib/pools_14717479.json";
import { Pool } from "@/types";
import { parseFixed } from "@ethersproject/bignumber";
import { Pools } from "@/modules/pools";
import { forkSetup, getBalances } from "@/test/lib/utils";

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const blockNumber = 16350000;

const poolObj = pools_14717479.find(
  ({ id }) =>
    id == '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d'
) as unknown as Pool;

const sdk = new BalancerSDK({ network, rpcUrl });

const { networkConfig } = sdk;

const initialBalance = '100000';

const tokensIn = [
  ...poolObj.tokens
    .filter(({ address }) => address !== poolObj.address)
    .map(({ address }) => address),
];

const poolTokensWithBptFirst = [
  ...poolObj.tokens.filter(({ address }) => address === poolObj.address),
  ...poolObj.tokens.filter(({ address }) => address !== poolObj.address),
];
const amountsIn = [
  parseFixed('100', 18).toString(),
  parseFixed('100', 18).toString(),
  parseFixed('100', 18).toString(),
];
const slots = [0, 0, 0, 0];

const pool = Pools.wrap(poolObj, networkConfig);

async function composableStableJoin() {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  let signerAddress: string;
  const balances = poolTokensWithBptFirst.map((token) =>
    token ? parseFixed(initialBalance, token.decimals).toString() : '0'
  );
  await forkSetup(
    signer,
    poolTokensWithBptFirst.map((t) => t.address),
    slots,
    balances,
    jsonRpcUrl as string,
    blockNumber
    // holds the same state as the static repository
  );
  signerAddress = await signer.getAddress();
  const [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
    pool.tokensList,
    signer,
    signerAddress
  );
  
  const slippage = '1';

  const { to, data, minBPTOut } = pool.buildJoin(
    signerAddress,
    tokensIn,
    amountsIn,
    slippage
  );

  await signer.sendTransaction(
    {
      to, data, gasLimit: 3000000
    }
  )

  const [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
    [...pool.tokensList],
    signer,
    signerAddress
  );

  console.log("bptBalanceBefore: " + bptBalanceBefore);
  console.log("bptBalanceAfter: " + bptBalanceAfter);
  console.log("minBptBalanceExpected: " + (BigInt(bptBalanceBefore.toString()) + BigInt(minBPTOut)));
  console.log("tokensBalanceBefore: " + tokensBalanceBefore.map(b => b.toString()));
  console.log("tokensBalanceAfter: " + tokensBalanceAfter.map(b => b.toString()));
}

export default composableStableJoin();