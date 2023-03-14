// yarn test:only ./src/modules/pools/factory/composable-stable/composable-stable.factory.integration.spec.ts
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Network, PoolType } from '@/types';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { LogDescription } from '@ethersproject/abi';
import {
  findEventInReceiptLogs,
  forkSetup,
  sendTransactionGetBalances,
} from '@/test/lib/utils';
import dotenv from 'dotenv';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { parseFixed } from '@ethersproject/bignumber';
import { ProtocolId } from '@/modules/pools/factory/types';
import { ERC4626LinearPoolFactory__factory } from '@/contracts';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
const blockNumber = 16720000;

const { APE, sAPE } = ADDRESSES[network];
const tokens = [APE.address, sAPE.address];
const balances = [
  parseFixed('1000000000', APE.decimals).toString(),
  parseFixed('1000000000', sAPE.decimals).toString(),
];

const linearPoolCreateParams = {
  factoryAddress: `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.erc4626LinearPoolFactory}`,
  name: 'My-Test-Pool-Name',
  symbol: 'My-Test-Pool-Symbol',
  mainToken: APE.address,
  wrappedToken: sAPE.address,
  upperTarget: '20000',
  owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  protocolId: ProtocolId.EULER,
  swapFee: '0.01',
};

describe('creating linear pool', async () => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const AaveLinearPoolFactory = balancer.pools.poolFactory.of(
    PoolType.AaveLinear
  );
  context('create', async () => {
    let poolAddress: string;
    before(async () => {
      await forkSetup(
        signer,
        tokens,
        undefined,
        balances,
        alchemyRpcUrl,
        blockNumber,
        false
      );
    });
    it('should create a pool', async () => {
      const { to, data } = AaveLinearPoolFactory.create(linearPoolCreateParams);
      const signerAddress = await signer.getAddress();
      const { transactionReceipt } = await sendTransactionGetBalances(
        [],
        signer,
        signerAddress,
        to as string,
        data as string
      );
      const linearPoolInterface =
        ERC4626LinearPoolFactory__factory.createInterface();
      const poolCreationEvent: LogDescription = findEventInReceiptLogs({
        to: linearPoolCreateParams.factoryAddress,
        receipt: transactionReceipt,
        logName: 'PoolCreated',
        contractInterface: linearPoolInterface,
      });
      if (poolCreationEvent) {
        poolAddress = poolCreationEvent.args.pool;
      }
      expect(!!poolCreationEvent).to.be.true;
      return;
    });
  });
});
