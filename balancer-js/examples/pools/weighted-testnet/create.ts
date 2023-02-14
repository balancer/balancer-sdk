import { Log, TransactionReceipt } from '@ethersproject/providers';
import { isSameAddress } from 'src';
import { Interface, LogDescription } from '@ethersproject/abi';
import WeightedPoolFactoryAbi from '@/lib/abi/WeightedPoolFactoryNew.json';
import {
  factoryAddress,
  name,
  symbol,
  tokenSymbols,
  weights,
  rateProviders,
  swapFee,
  owner,
  wallet,
  provider,
  wrappedNativeAsset,
  addresses,
} from './example-config';
import { ethers } from 'hardhat';
import { AssetHelpers, parseToBigInt18 } from '@/lib/utils';
import { BigNumberish } from '@ethersproject/bignumber';

async function createWeightedPool() {
  const factoryContract = new ethers.Contract(
    factoryAddress,
    WeightedPoolFactoryAbi,
    wallet
  );

  // GOERLI USDC address: '0x1f1f156E0317167c11Aa412E3d1435ea29Dc3cCE'
  // GOERLI USDT address: '0xe0C9275E44Ea80eF17579d33c55136b7DA269aEb'
  //================================================================
  // BSCTESTNET USDC address: '0x64544969ed7EBf5f083679233325356EbE738930'
  // BSCTESTNET USDT address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'

  const tokenAddresses = [];

  for (let i = 0; i < tokenSymbols.length; i++) {
    tokenAddresses.push(
      addresses[tokenSymbols[i] as keyof typeof addresses].address
    );
  }

  const [tokenAddressesF, rateProvidersF, weightsF, swapFeeF] = formatInputs(
    tokenAddresses,
    rateProviders,
    weights,
    swapFee
  );

  const tx = await factoryContract.create(
    name,
    symbol,
    tokenAddressesF,
    weightsF,
    rateProvidersF, // This is only needed on BSC Testnet. Goerli uses an older version of the WeightedPoolFactory
    swapFeeF,
    owner,
    {
      gasLimit: 6721975,
      // gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits('35', 'gwei')),
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
  console.log('Create tx hash: ' + tx.hash);

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

  const weightedPoolFactoryInterface = new Interface(WeightedPoolFactoryAbi);

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

function formatInputs(
  tokenAddresses: any,
  rateProviders: any,
  weights: any,
  swapFee: any
) {
  const swapFeeScaled = parseToBigInt18(`${swapFee}`);
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  const [sortedTokens, sortedRateProviders, sortedWeights] =
    assetHelpers.sortTokens(tokenAddresses, rateProviders, weights) as [
      string[],
      string[],
      BigNumberish[]
    ];

  return [sortedTokens, sortedRateProviders, sortedWeights, swapFeeScaled];
}
