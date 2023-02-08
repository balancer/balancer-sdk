import { Log, TransactionReceipt } from '@ethersproject/providers';
import { isSameAddress, PoolType } from 'src';
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
} from './example-config';
import { ethers } from 'hardhat';

async function createWeightedPool() {
  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);
  const { to, data } = weightedPoolFactory.create({
    factoryAddress,
    name,
    symbol,
    tokenAddresses,
    weights,
    // rateProviders,
    swapFee,
    owner,
  });

  console.log('WeightedPoolFactory address: ' + to);
  // WeighedPoolFactory address on Goerli: 0x8E9aa87E45e92bad84D5F8DD1bff34Fb92637dE9
  // WeighedPoolFactory address BSC Testnet: 0x7b61837701Fad187d24f11A0b02E08308cB3912D

  const walletAddress = await wallet.getAddress();

  const tx = await wallet.sendTransaction({
    from: walletAddress,
    to: to,
    data: data,
    // value: ethers.utils.parseEther('0.01'),
    // gasPrice: ethers.utils.hexlify(gasPrice.toNumber() * 2),
    gasLimit: ethers.utils.hexlify(300000),
  });

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
  } catch (err: any) {
    // Slippage should trigger 507 error:
    // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/solidity-utils/contracts/helpers/BalancerErrors.sol#L218
    console.log(err.reason);
    console.log('TRANSACTION: ' + JSON.stringify(err.transaction));
    console.log('RECEIPT: ' + JSON.stringify(err.receipt));
  }

  // console.log('Transaction included in block: ' + txReceipt.blockNumber);
  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );

  // console.log('Are the 2 receipts the same? =>' + (txReceipt == receipt));

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
