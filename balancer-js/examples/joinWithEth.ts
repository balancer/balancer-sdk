// yarn examples:run ./examples/joinWithEth.ts
import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ADDRESSES } from '../src/test/lib/constants';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  truncateAddresses,
} from '../src/index';
import { forkSetup, sendTransactionGetBalances } from '../src/test/lib/utils';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

/*
Example showing how to use Pools module to join pools with ETH.
Note: same as join.ts but adding the `value` parameter to the transaction
*/
async function join() {
  const network = Network.MAINNET;
  const rpcUrl = 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const wBTCwETH = ADDRESSES[network].WBTCWETH; // 50/50 WBTC/WETH Pool
  const wBTC = ADDRESSES[network].WBTC;

  // Tokens that will be provided to pool by joiner
  const tokensIn = [
    wBTC.address, // wBTC
    AddressZero, // ETH
  ];

  // Slots used to set the account balance for each token through hardhat_setStorageAt
  // Info fetched using npm package slot20
  const slots = [wBTC.slot, 0];

  const amountsIn = [
    parseFixed('1', wBTC.decimals).toString(),
    parseFixed('1', 18).toString(), // ETH has 18 decimals
  ];
  const slippage = '100'; // 100 bps = 1%

  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);

  // Use SDK to find pool info
  const pool = await balancer.pools.find(wBTCwETH.id);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  // Sets up local fork granting signer initial balances and token approvals
  await forkSetup(signer, tokensIn, slots, amountsIn, jsonRpcUrl as string);

  // Use SDK to create join
  const { to, data, expectedBPTOut, minBPTOut, value } = pool.buildJoin(
    signerAddress,
    tokensIn,
    amountsIn,
    slippage
  );

  // Calculate price impact
  const priceImpact = await pool.calcPriceImpact(amountsIn, minBPTOut, true);
  console.table({
    priceImpact,
  });

  const { balanceDeltas } = await sendTransactionGetBalances(
    [pool.address, ...tokensIn],
    signer,
    signerAddress,
    to,
    data,
    value // required for joining with ETH
  );

  console.table({
    tokens: truncateAddresses([pool.address, ...tokensIn]),
    minOut: [minBPTOut, ...amountsIn],
    expectedOut: [expectedBPTOut, ...amountsIn],
    balanceDeltas: balanceDeltas.map((delta) => delta.toString()),
  });
}

join();
