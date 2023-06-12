// yarn test:only ./src/modules/pools/factory/linear/linear.factory.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { expect } from 'chai';
import dotenv from 'dotenv';

import { ERC4626LinearPool__factory } from '@/contracts';
import {
  LinearCreatePoolParameters,
  ProtocolId,
} from '@/modules/pools/factory/types';
import { BalancerSDK } from '@/modules/sdk.module';
import { ADDRESSES } from '@/test/lib/constants';
import { forkSetup } from '@/test/lib/utils';
import { Network, PoolType } from '@/types';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const balancer = new BalancerSDK({
  network,
  rpcUrl,
});
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const addresses = ADDRESSES[network];

describe('creating linear pool', async () => {
  const poolType = PoolType.ERC4626Linear;
  const poolTokens = [addresses.APE, addresses.sAPE];
  const linearPoolFactory = balancer.pools.poolFactory.of(poolType);
  let poolParams: LinearCreatePoolParameters;
  let signerAddress: string;
  before(async () => {
    signerAddress = await signer.getAddress();
    await forkSetup(
      signer,
      [],
      [],
      [],
      `${process.env.ALCHEMY_URL}`,
      17060000,
      false
    );
    poolParams = {
      name: 'My-Test-Pool-Name',
      symbol: 'My-Test-Pool-Symbol',
      mainToken: poolTokens[0].address,
      wrappedToken: poolTokens[1].address,
      upperTargetEvm: parseFixed('20000', 18).toString(),
      owner: signerAddress,
      protocolId: ProtocolId.TESSERA,
      swapFeeEvm: parseFixed('0.01', 18).toString(),
    };
  });
  context('create', async () => {
    let transactionReceipt: TransactionReceipt;
    it('should send the create transaction', async () => {
      const txInfo = linearPoolFactory.create(poolParams);
      transactionReceipt = await (await signer.sendTransaction(txInfo)).wait();
      expect(transactionReceipt.status).to.eql(1);
    });
    it('should have correct pool info on creation', async () => {
      const { poolId, poolAddress } =
        await linearPoolFactory.getPoolAddressAndIdWithReceipt(
          provider,
          transactionReceipt
        );
      const pool = ERC4626LinearPool__factory.connect(poolAddress, provider);
      const id = await pool.getPoolId();
      const name = await pool.name();
      const symbol = await pool.symbol();
      const swapFee = await pool.getSwapFeePercentage();
      const owner = await pool.getOwner();
      const mainToken = await pool.getMainToken();
      const wrappedToken = await pool.getWrappedToken();
      const { upperTarget } = await pool.getTargets();
      expect(id).to.eql(poolId);
      expect(name).to.eql(poolParams.name);
      expect(symbol).to.eql(poolParams.symbol);
      expect(swapFee.toString()).to.eql(poolParams.swapFeeEvm);
      expect(owner).to.eql(poolParams.owner);
      expect(mainToken.toLocaleLowerCase()).to.eql(
        poolParams.mainToken.toLocaleLowerCase()
      );
      expect(wrappedToken.toLocaleLowerCase()).to.eql(
        poolParams.wrappedToken.toLocaleLowerCase()
      );
      expect(upperTarget.toString()).to.eql(poolParams.upperTargetEvm);
    });
  });
});
