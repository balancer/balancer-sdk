/**
 *  Example showing how to find a swap for a pair using SOR directly
 *  - Path only uses swaps: use queryBatchSwap on Vault to see result
 *  - Path use join/exit: Use SDK functions to build calls to submit tx via Relayer
 */
import dotenv from 'dotenv';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Wallet } from '@ethersproject/wallet';
import { AddressZero } from '@ethersproject/constants';
import {
  BalancerSDK,
  Network,
  SwapTypes,
  someJoinExit,
  buildRelayerCalls,
  canUseJoinExit,
} from '../src/index';

import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();

async function getAndProcessSwaps(
  balancer: BalancerSDK,
  tokenIn: string,
  tokenOut: string,
  swapType: SwapTypes,
  amount: BigNumber,
  useJoinExitPaths: boolean
) {
  const swapInfo = await balancer.swaps.sor.getSwaps(
    tokenIn,
    tokenOut,
    swapType,
    amount,
    undefined,
    useJoinExitPaths
  );

  if (swapInfo.returnAmount.isZero()) {
    console.log('No Swap');
    return;
  }
  // console.log(swapInfo.swaps);
  // console.log(swapInfo.tokenAddresses);
  console.log(`Return amount: `, swapInfo.returnAmount.toString());

  const pools = balancer.swaps.sor.getPools();

  // someJoinExit will check if swaps use joinExit paths which needs additional formatting
  if (
    useJoinExitPaths &&
    someJoinExit(pools, swapInfo.swaps, swapInfo.tokenAddresses)
  ) {
    console.log(`Swaps with join/exit paths. Must submit via Relayer.`);
    const key: any = process.env.TRADER_KEY;
    const wallet = new Wallet(key, balancer.sor.provider);
    const slippage = '50'; // 50 bsp = 0.5%
    try {
      const relayerCallData = buildRelayerCalls(
        swapInfo,
        pools,
        wallet.address,
        balancer.contracts.relayerV3!.address,
        balancer.networkConfig.addresses.tokens.wrappedNativeAsset,
        slippage,
        undefined
      );
      // Static calling Relayer doesn't return any useful values but will allow confirmation tx is ok
      // relayerCallData.data can be used to simulate tx on Tenderly to see token balance change, etc
      // console.log(wallet.address);
      // console.log(await balancer.sor.provider.getBlockNumber());
      // console.log(relayerCallData.data);
      const result = await balancer.contracts.relayerV3
        ?.connect(wallet)
        .callStatic.multicall(relayerCallData.rawCalls);
      console.log(result);
    } catch (err: any) {
      // If error we can reprocess without join/exit paths
      console.log(`Error Using Join/Exit Paths`, err.reason);
      await getAndProcessSwaps(
        balancer,
        tokenIn!,
        tokenOut!,
        swapType,
        amount,
        false
      );
    }
  } else {
    console.log(`Swaps via Vault.`);
    const userAddress = AddressZero;
    const deadline = BigNumber.from(`${Math.ceil(Date.now() / 1000) + 60}`); // 60 seconds from now
    const maxSlippage = 50; // 50 bsp = 0.5%

    const transactionAttributes = balancer.swaps.buildSwap({
      userAddress,
      swapInfo,
      kind: 0,
      deadline,
      maxSlippage,
    });

    const { attributes } = transactionAttributes;

    try {
      // Simulates a call to `batchSwap`, returning an array of Vault asset deltas.
      const deltas = await balancer.contracts.vault.callStatic.queryBatchSwap(
        swapType,
        swapInfo.swaps,
        swapInfo.tokenAddresses,
        attributes.funds
      );
      console.log(deltas.toString());
    } catch (err) {
      console.log(err);
    }
  }
}

async function swapExample() {
  const network = Network.MAINNET;
  const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;
  const tokenIn = ADDRESSES[network].WETH.address;
  const tokenOut = ADDRESSES[network].auraBal?.address;
  const swapType = SwapTypes.SwapExactIn;
  const amount = parseFixed('18', 18);
  // Currently Relayer only suitable for ExactIn and non-eth swaps
  const canUseJoinExitPaths = canUseJoinExit(swapType, tokenIn!, tokenOut!);

  const balancer = new BalancerSDK({
    network,
    rpcUrl,
  });

  await balancer.swaps.sor.fetchPools();

  await getAndProcessSwaps(
    balancer,
    tokenIn!,
    tokenOut!,
    swapType,
    amount,
    canUseJoinExitPaths
  );
}

// yarn examples:run ./examples/swapSor.ts
swapExample();
