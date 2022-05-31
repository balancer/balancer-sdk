import dotenv from 'dotenv';
import { defaultAbiCoder } from '@ethersproject/abi';
import { parseFixed } from '@ethersproject/bignumber';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import linearPoolAbi from '../src/lib/abi/LinearPool.json';

import { BalancerSDK, Network, BalancerSdkConfig } from '../src/index';
import { FundManagement } from '../src/modules/swaps/types';

import balancerRelayerAbi from '../src/lib/abi/BalancerRelayer.json';

dotenv.config();

/*
Example showing how to exit bb-a-USDC to stables via Relayer.
ExactIn - Exact amount of tokenIn to use in swap.
User must approve relayer
Vault must have approvals for tokens
*/
async function runRelayerSwapUnwrapExactIn() {
  const config: BalancerSdkConfig = {
    network: Network.MAINNET,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
  };

  const provider = new JsonRpcProvider(config.rpcUrl);
  const key: any = process.env.TRADER_KEY;
  const relayerAddress = '0xAc9f49eF3ab0BbC929f7b1bb0A17E1Fca5786251';
  const wallet = new Wallet(key, provider);

  const balancer = new BalancerSDK(config);

  // Creates fund management info for swap part of call
  const funds: FundManagement = {
    sender: wallet.address,
    recipient: relayerAddress, // Note relayer is recipient of swaps
    fromInternalBalance: false,
    toInternalBalance: false,
  };

  const bbausd = '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2';
  const bbadai = '0x804CdB9116a10bB78768D3252355a1b18067bF8f';
  const bbausdc = '0x9210F1204b5a24742Eba12f710636D76240dF3d0';
  const bbausdt = '0x2BBf681cC4eb09218BEe85EA2a5d3D13Fa40fC0C';
  const daiLinearPool = new Contract(bbadai, linearPoolAbi, provider);
  const usdcLinearPool = new Contract(bbausdc, linearPoolAbi, provider);
  const usdtLinearPool = new Contract(bbausdt, linearPoolAbi, provider);
  // This is gets the up to date rates for the Aave tokens
  const daiRate = await daiLinearPool.getWrappedTokenRate();
  const usdcRate = await usdcLinearPool.getWrappedTokenRate();
  const usdtRate = await usdtLinearPool.getWrappedTokenRate();

  console.log(`DAI Rate: ${daiRate.toString()}`);
  console.log(`USDC Rate: ${usdcRate.toString()}`);
  console.log(`USDT Rate: ${usdtRate.toString()}`);

  const txInfo = await balancer.relayer.swapUnwrapAaveStaticExactIn(
    [bbausd, bbausd, bbausd],
    [
      '0x02d60b84491589974263d922d9cc7a3152618ef6', // waDAI
      '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de', // waUSDC
      '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58', // waUSDT
    ],
    [
      parseFixed('30000000', 18).toString(),
      parseFixed('30000000', 18).toString(),
      parseFixed('30000000', 18).toString(),
    ],
    [daiRate, usdcRate, usdtRate],
    funds,
    '50000000000000000' // Slippage 5%
  );

  const relayerContract = new Contract(
    relayerAddress,
    balancerRelayerAbi,
    provider
  );

  console.log(`Unwrapped Amounts Out:`);
  console.log(txInfo.outputs?.amountsOut?.toString());
  const tx = await relayerContract
    .connect(wallet)
    .callStatic[txInfo.function](txInfo.params, {
      value: '0',
      // gasLimit: '2000000',
    });

  console.log(`Swap Deltas:`);
  console.log(defaultAbiCoder.decode(['int256[]'], tx[0]).toString());
}

/*
Example showing how to exit bb-a-USDC to stables via Relayer.
ExactOut - Exact amount of tokens out are used for swaps.
User must approve relayer
Vault must have approvals for tokens
*/
async function runRelayerSwapUnwrapExactOut() {
  const config: BalancerSdkConfig = {
    network: Network.MAINNET,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
  };

  const provider = new JsonRpcProvider(config.rpcUrl);
  const key: any = process.env.TRADER_KEY;
  const relayerAddress = '0xAc9f49eF3ab0BbC929f7b1bb0A17E1Fca5786251';
  const wallet = new Wallet(key, provider);

  const balancer = new BalancerSDK(config);

  // Creates fund management info for swap part of call
  const funds: FundManagement = {
    sender: wallet.address,
    recipient: relayerAddress, // Note relayer is recipient of swaps
    fromInternalBalance: false,
    toInternalBalance: false,
  };

  const bbausd = '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2';
  const bbadai = '0x804CdB9116a10bB78768D3252355a1b18067bF8f';
  const bbausdc = '0x9210F1204b5a24742Eba12f710636D76240dF3d0';
  const bbausdt = '0x2BBf681cC4eb09218BEe85EA2a5d3D13Fa40fC0C';
  const daiLinearPool = new Contract(bbadai, linearPoolAbi, provider);
  const usdcLinearPool = new Contract(bbausdc, linearPoolAbi, provider);
  const usdtLinearPool = new Contract(bbausdt, linearPoolAbi, provider);
  // This is gets the up to date rates for the Aave tokens
  const daiRate = await daiLinearPool.getWrappedTokenRate();
  const usdcRate = await usdcLinearPool.getWrappedTokenRate();
  const usdtRate = await usdtLinearPool.getWrappedTokenRate();

  console.log(`DAI Rate: ${daiRate.toString()}`);
  console.log(`USDC Rate: ${usdcRate.toString()}`);
  console.log(`USDT Rate: ${usdtRate.toString()}`);

  const txInfo = await balancer.relayer.swapUnwrapAaveStaticExactOut(
    [bbausd, bbausd, bbausd],
    [
      '0x02d60b84491589974263d922d9cc7a3152618ef6', // waDAI
      '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de', // waUSDC
      '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58', // waUSDT
    ],
    [parseFixed('1', 16).toString(), '1000', '1000'], // Amount of unwrapped Aave token we want to receive
    [daiRate, usdcRate, usdtRate],
    funds,
    '50000000000000000' // Slippage 5%
  );

  console.log(`Amounts In:`);
  console.log(txInfo.outputs?.amountsIn?.toString());

  const relayerContract = new Contract(
    relayerAddress,
    balancerRelayerAbi,
    provider
  );
  const tx = await relayerContract
    .connect(wallet)
    .callStatic[txInfo.function](txInfo.params, {
      value: '0',
      // gasLimit: '2000000',
    });

  console.log(`Swap Deltas:`);
  console.log(defaultAbiCoder.decode(['int256[]'], tx[0]).toString());
}

// yarn examples:run ./examples/relayerSwapUnwrap.ts
runRelayerSwapUnwrapExactIn();
// runRelayerSwapUnwrapExactOut();
