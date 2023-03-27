// yarn test:only ./src/modules/pools/factory/composable-stable/composable-stable.factory.integration.spec.ts
import { LogDescription } from '@ethersproject/abi';
import { parseFixed } from '@ethersproject/bignumber';
import { expect } from 'chai';
import dotenv from 'dotenv';

import {
  LinearCreatePoolParameters,
  ProtocolId,
} from '@/modules/pools/factory/types';
import { BalancerSDK } from '@/modules/sdk.module';
import { ADDRESSES } from '@/test/lib/constants';
import { forkSetup, sendTransactionGetBalances } from '@/test/lib/utils';
import { Network, PoolType } from '@/types';
import { findEventInReceiptLogs } from '@/lib/utils';
import { JsonRpcProvider } from '@ethersproject/providers';
import { LinearFactory } from '@/modules/pools/factory/linear/linear.factory';

dotenv.config();

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8000';
const balancer = new BalancerSDK({
  network,
  rpcUrl,
});
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const addresses = ADDRESSES[network];

describe('creating linear pool', async () => {
  const poolTokens = [addresses.APE, addresses.sAPE];
  const rawAmount = '100000';
  const amountsIn = poolTokens.map((p) =>
    parseFixed(rawAmount, p.decimals).toString()
  );
  const poolType = PoolType.AaveLinear;
  const linearPoolFactory = balancer.pools.poolFactory.of(poolType);
  let poolParams: LinearCreatePoolParameters;
  let signerAddress: string;
  before(async () => {
    signerAddress = await signer.getAddress();
    await forkSetup(
      signer,
      poolTokens.map((p) => p.address),
      // poolTokens.map((p) => p.slot),
      undefined,
      amountsIn,
      `${process.env.ALCHEMY_URL}`,
      16720000,
      false
    );
    poolParams = {
      name: 'My-Test-Pool-Name',
      symbol: 'My-Test-Pool-Symbol',
      mainToken: poolTokens[0].address,
      wrappedToken: poolTokens[1].address,
      upperTarget: '20000',
      owner: signerAddress,
      protocolId: ProtocolId.EULER,
      swapFeeEvm: parseFixed('0.01', 18).toString(),
    };
  });
  context('create', async () => {
    it('should create a pool', async () => {
      const { to, data } = linearPoolFactory.create(poolParams);
      const signerAddress = await signer.getAddress();
      const { transactionReceipt } = await sendTransactionGetBalances(
        [],
        signer,
        signerAddress,
        to as string,
        data as string
      );
      const linearPoolInterface = LinearFactory.getPoolInterface(poolType);
      const poolCreationEvent: LogDescription = findEventInReceiptLogs({
        to: to as string,
        receipt: transactionReceipt,
        logName: 'PoolCreated',
        contractInterface: linearPoolInterface,
      });
      expect(!!poolCreationEvent).to.be.true;
      return;
    });
  });
});
