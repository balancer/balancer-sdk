import { Log, TransactionReceipt } from '@ethersproject/providers';
import { isSameAddress } from 'src';
import { Interface, LogDescription } from '@ethersproject/abi';
import { WeightedPoolFactory__factory } from '@balancer-labs/typechain';
import {
  factoryAddress,
  name,
  symbol,
  tokenAddresses,
  weights,
  rateProviders,
  swapFee,
  owner,
  balancer,
  wallet,
  provider,
  wrappedNativeAsset,
} from './example-config';
import { ethers } from 'hardhat';
import { AssetHelpers, parseToBigInt18 } from '@/lib/utils';
import { BigNumberish } from '@ethersproject/bignumber';

async function createWeightedPool() {
  const oldAbi =
    '[{"inputs":[{"internalType":"contract IVault","name":"vault","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"pool","type":"address"}],"name":"PoolCreated","type":"event"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"contract IERC20[]","name":"tokens","type":"address[]"},{"internalType":"uint256[]","name":"weights","type":"uint256[]"},{"internalType":"uint256","name":"swapFeePercentage","type":"uint256"},{"internalType":"address","name":"owner","type":"address"}],"name":"create","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getPauseConfiguration","outputs":[{"internalType":"uint256","name":"pauseWindowDuration","type":"uint256"},{"internalType":"uint256","name":"bufferPeriodDuration","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getVault","outputs":[{"internalType":"contract IVault","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"pool","type":"address"}],"name":"isPoolFromFactory","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]';
  const abi = '';

  const factoryContract = new ethers.Contract(factoryAddress, oldAbi, wallet);

  const [
    tokenAddressesF,
    weightsF,
    // rateProvidersF,
    swapFeeF,
  ] = formatInputs(
    tokenAddresses,
    weights,
    // rateProviders,
    swapFee
  );

  const tx = await factoryContract.create(
    name,
    symbol,
    tokenAddressesF,
    weightsF,
    // rateProviders,
    swapFeeF,
    owner,
    {
      gasLimit: 6721975,
      gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits('20', 'gwei')),
    }
  );

  // WeighedPoolFactory address on Goerli: 0x8E9aa87E45e92bad84D5F8DD1bff34Fb92637dE9
  // WeighedPoolFactory address BSC Testnet: 0x7b61837701Fad187d24f11A0b02E08308cB3912D

  if (tx.gasPrice) {
    console.log(
      'gasPrice: ' + tx.gasPrice.toNumber() / Math.pow(10, 9) + ' gwei'
    );
  }

  console.log('gasLimit: ' + tx.gasLimit);
  console.log('Transaction sent with tx hash: ' + tx.hash);

  try {
    const txReceipt = await tx.wait();

    console.log(
      'Transaction included in block number:' + txReceipt.blockNumber
    );
    // console.log('Transaction validated. Gas used:' + txReceipt.gasUsed);
  } catch (err: any) {
    // Slippage should trigger 507 error:
    // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/solidity-utils/contracts/helpers/BalancerErrors.sol#L218
    console.log(err.reason);
    // console.log('TRANSACTION: ' + JSON.stringify(err.transaction));
    // console.log('RECEIPT: ' + JSON.stringify(err.receipt));
  }

  // console.log('Transaction included in block: ' + txReceipt.blockNumber);
  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );

  const weightedPoolFactoryInterface = new Interface(
    WeightedPoolFactory__factory.abi
  );

  const poolCreationEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => {
      return isSameAddress(log.address, factoryAddress);
    })
    .map((log) => {
      return weightedPoolFactoryInterface.parseLog(log);
    })
    .find((parsedLog) => parsedLog?.name === 'PoolCreated');
  if (!poolCreationEvent) return console.error("There's no event");
  console.log('poolAddress: ' + poolCreationEvent.args.pool);
  return poolCreationEvent.args.pool;
}

export default createWeightedPool();

function formatInputs(tokenAddresses: any, weights: any, swapFee: any) {

  const swapFeeScaled = parseToBigInt18(`${swapFee}`);
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  const [sortedTokens, sortedWeights] = assetHelpers.sortTokens(
    tokenAddresses,
    weights
  ) as [string[], BigNumberish[]];

  return [sortedTokens, sortedWeights, swapFeeScaled];
}
