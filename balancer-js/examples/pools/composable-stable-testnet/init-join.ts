import {
  // createComposableStablePool,
  provider,
  network,
  wallet,
  tokenAmounts,
  tokenAddresses,
  wrappedNativeAsset,
} from './create';
import createComposableStablePool from './create';
import { Interface, LogDescription } from '@ethersproject/abi';
import { Vault__factory } from '@balancer-labs/typechain';
import composableStableFactoryAbi from '@/lib/abi/ComposableStableFactory.json';
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { AssetHelpers, isSameAddress } from '@/lib/utils';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';

export async function initJoinComposableStablePool() {
  const poolAddress = await createComposableStablePool;
  const walletAddress = await wallet.getAddress();

  const vaultAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.vault}`;

  console.log('vaultAddress: ' + vaultAddress);

  const poolContract = new ethers.Contract(
    poolAddress,
    composableStableFactoryAbi,
    wallet
  );
  const poolId = await poolContract.getPoolId();

  const vaultContract = new ethers.Contract(
    vaultAddress,
    Vault__factory.abi,
    wallet
  );

  const [tokensIn, amountsInF, userData] = formatInputs(
    tokenAddresses,
    tokenAmounts
  );

  const tx = await vaultContract.joinPool(
    poolId,
    walletAddress, // sender
    walletAddress, // recipient
    {
      // joinPoolRequest
      assets: tokensIn,
      maxAmountsIn: amountsInF,
      userData,
      fromInternalBalance: false,
    },
    {
      gasLimit: 1000000, // 217855
      // gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits('20', 'gwei')),
    }
  );

  console.log('Init join tx hash: ' + tx.hash);

  await tx.wait();

  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );

  const vaultInterface = new Interface(Vault__factory.abi);
  const poolInitJoinEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => {
      return isSameAddress(log.address, vaultAddress);
    })
    .map((log) => {
      return vaultInterface.parseLog(log);
    })
    .find((parsedLog) => parsedLog?.name === 'PoolBalanceChanged');
  if (!poolInitJoinEvent)
    return console.error("Couldn't find event in the receipt logs");

  const poolTokens = poolInitJoinEvent.args[2];
  const newBalances = poolInitJoinEvent.args[3];
  const oldBalances = poolInitJoinEvent.args[4];
  console.log('Pool Token Addresses: ' + poolTokens);
  console.log('Pool new balances(Big Number): ' + newBalances);
  console.log('Pool old balances: ' + oldBalances);
}

initJoinComposableStablePool().then((r) => r);

function formatInputs(tokensIn: any, amountsIn: any) {
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);

  const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
    tokensIn,
    amountsIn
  ) as [string[], string[]];

  const userData = ComposableStablePoolEncoder.joinInit(sortedAmounts);

  return [sortedTokens, sortedAmounts, userData];
}
