import dotenv from "dotenv";
import hardhat from "hardhat";
import { Network } from "@/lib/constants";
import { BalancerSDK } from "@/modules/sdk.module";
import pools_16350000 from "@/test/lib/pools_16350000.json";
import { Pool } from "@/types";
import { Pools } from "@/modules/pools";
import { forkSetup, getBalances } from "@/test/lib/utils";
import { BigNumber, parseFixed } from "@ethersproject/bignumber";

dotenv.config();

const { ethers } = hardhat;

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const { networkConfig } = new BalancerSDK({ network, rpcUrl });

const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

const initialBalance = '100000';
const slippage = '100'; // 1%

const pool = pools_16350000.find(
  (pool) =>
    pool.id ==
    '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d' // Balancer Aave Boosted StablePool
) as unknown as Pool;

const tokensOut = pool.tokens.filter(({ address }) => address !== pool.address);
const controller = Pools.wrap(pool, networkConfig);

async function composablePoolExitExactBPTIn() {
  await forkSetup(
    signer,
    pool.tokensList,
    Array(pool.tokensList.length).fill(0),
    Array(pool.tokensList.length).fill(
      parseFixed(initialBalance, 18).toString()
    ),
    jsonRpcUrl as string,
    16350000 // holds the same state as the static repository
  );
  const signerAddress = await signer.getAddress();

  const amountsOut = tokensOut.map((t, i) => {
    if (i === 0) {
      return parseFixed('200', t.decimals).toString();
    }
    return '0';
  });

  const { to, data, maxBPTIn } = controller.buildExitExactTokensOut(
    signerAddress,
    tokensOut.map((t) => t.address),
    amountsOut,
    slippage
  );

  const [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
    [pool.address, ...pool.tokensList.filter((address) => address !== pool.address)],
    signer,
    signerAddress
  );

  // Send transaction to local fork
  await signer.sendTransaction({
    to,
    data,
    gasLimit: 3000000,
  });

  // Check balances after transaction to confirm success
  const [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
    [pool.address, ...pool.tokensList.filter((address) => address !== pool.address)],
    signer,
    signerAddress
  );

  console.log("bptBalanceBefore: " + bptBalanceBefore);
  console.log("bptBalanceAfter: " + bptBalanceAfter);
  console.log("maxBPTIn: " + maxBPTIn);
  console.log("bptIn: " + BigNumber.from(bptBalanceBefore).sub(BigNumber.from(bptBalanceAfter)).toString());
  console.log("amountsOut: " + amountsOut);
  console.log("tokensBalanceBefore: " + tokensBalanceBefore);
  console.log("tokensBalanceAfter: " + tokensBalanceAfter);
}

composablePoolExitExactBPTIn().then(() => {});
