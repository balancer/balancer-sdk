// yarn test:only ./src/modules/pools/factory/composable-stable/composable-stable.factory.spec.ts
import { expect } from 'chai';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { ethers } from 'hardhat';
import { Network, PoolType } from '@/types';
import { ADDRESSES } from '@/test/lib/constants';
import { AddressZero } from '@ethersproject/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { Interface, LogDescription } from '@ethersproject/abi';
import composableStableFactoryAbi from '@/lib/abi/ComposableStableFactory.json';
import { forkSetup } from '@/test/lib/utils';
import dotenv from 'dotenv';
import { isSameAddress } from '@/lib/utils';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
const blockNumber = 16320000;

const name = 'My-Test-Pool-Name';
const symbol = 'My-Test-Pool-Symbol';

const addresses = ADDRESSES[network];

const USDC_address = addresses.USDC.address;
const USDT_address = addresses.USDT.address;

const rateProviders = [AddressZero, AddressZero];

const exemptFromYieldProtocolFeeFlags = [false, false];
const tokenRateCacheDurations = ['0', '0'];
const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.composableStablePoolFactory}`;
const owner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const tokenAddresses = [USDC_address, USDT_address];
const amplificationParameter = '2';
const swapFee = '0.01';

describe('creating composable stable pool', async () => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );
  context('create', async () => {
    beforeEach(async () => {
      await forkSetup(signer, [], [], [], alchemyRpcUrl, blockNumber, false);
    });
    it('should create a pool', async () => {
      const { to, data } = composableStablePoolFactory.create({
        factoryAddress,
        name,
        symbol,
        tokenAddresses,
        amplificationParameter,
        rateProviders,
        tokenRateCacheDurations,
        exemptFromYieldProtocolFeeFlags,
        swapFee,
        owner,
      });
      const signerAddress = await signer.getAddress();
      const tx = await signer.sendTransaction({
        from: signerAddress,
        to,
        data,
        gasLimit: 30000000,
      });
      await tx.wait();
      const receipt: TransactionReceipt = await provider.getTransactionReceipt(
        tx.hash
      );
      const composableStableFactoryInterface = new Interface(
        composableStableFactoryAbi
      );

      const poolCreationEvent: LogDescription | null | undefined = receipt.logs
        .filter((log: Log) => {
          return isSameAddress(log.address, factoryAddress);
        })
        .map((log) => {
          try {
            return composableStableFactoryInterface.parseLog(log);
          } catch (error) {
            console.error(error);
            return null;
          }
        })
        .find((parsedLog) => parsedLog?.name === 'PoolCreated');
      expect(!!poolCreationEvent).to.be.true;
    });
  });
});
