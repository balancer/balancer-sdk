import create, {
  addresses,
  balancer,
  provider,
  signer,
  tokenAddresses,
} from './create';
import { parseFixed } from '@ethersproject/bignumber';
import { Interface, LogDescription } from '@ethersproject/abi';
import ComposableStablePoolAbi from '@/lib/abi/ComposableStable.json';
import { Contract } from '@ethersproject/contracts';
import { PoolType } from '@/types';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { isSameAddress } from '@/lib/utils';

const initJoinComposableStable = async () => {
  const poolAddress = await create;
  const signerAddress = await signer.getAddress();
  const composableStablePoolInterface = new Interface(ComposableStablePoolAbi);
  const pool = new Contract(
    poolAddress,
    composableStablePoolInterface,
    provider
  );
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );
  const amountsIn = [
    parseFixed('10000', addresses.USDC.decimals).toString(),
    parseFixed('10000', addresses.USDT.decimals).toString(),
  ];
  const poolId = await pool.getPoolId();
  const { to, data } = composableStablePoolFactory.buildInitJoin({
    joiner: signerAddress,
    poolId,
    poolAddress,
    tokensIn: tokenAddresses,
    amountsIn,
  });
  const tx = await signer.sendTransaction({
    to,
    data,
    gasLimit: 30000000,
  });
  await tx.wait();
  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );
  const vaultInterface = new Interface(Vault__factory.abi);
  const poolInitJoinEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => {
      return isSameAddress(log.address, to);
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
};

initJoinComposableStable().then((r) => r);
