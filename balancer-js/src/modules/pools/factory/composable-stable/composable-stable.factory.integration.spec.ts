// yarn test:only ./src/modules/pools/factory/composable-stable/composable-stable.factory.integration.spec.ts
import { OldBigNumber, StableMaths } from '@balancer-labs/sor';
import { LogDescription } from '@ethersproject/abi';
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { Contract } from '@ethersproject/contracts';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { Vault__factory, ComposableStable__factory } from '@/contracts';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { findEventInReceiptLogs } from '@/lib/utils';
import { _upscale, SolidityMaths } from '@/lib/utils/solidityMaths';
import { BalancerSDK } from '@/modules/sdk.module';
import { ADDRESSES } from '@/test/lib/constants';
import { forkSetup, sendTransactionGetBalances } from '@/test/lib/utils';
import { Network, PoolType } from '@/types';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';

const addresses = ADDRESSES[network];

const USDC_address = addresses.USDC.address;
const USDT_address = addresses.USDT.address;

const tokenAddresses = [USDC_address, USDT_address];

const createComposableStableParams = {
  factoryAddress: `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.composableStablePoolFactory}`,
  name: 'My-Test-Pool-Name',
  symbol: 'My-Test-Pool-Symbol',
  tokenAddresses,
  exemptFromYieldProtocolFeeFlags: [false, false],
  rateProviders: [AddressZero, AddressZero],
  tokenRateCacheDurations: ['0', '0'],
  owner: undefined,
  amplificationParameter: '92',
  swapFeeEvm: `${1e16}`,
};

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
    let poolAddress: string;
    let poolId: string;
    before(async () => {
      const slots = [addresses.USDC.slot, addresses.USDT.slot];
      const balances = [
        parseFixed('1000000000', addresses.USDC.decimals).toString(),
        parseFixed('1000000000', addresses.USDT.decimals).toString(),
      ];
      const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
      const blockNumber = 16720000;
      await forkSetup(
        signer,
        tokenAddresses,
        slots,
        balances,
        alchemyRpcUrl,
        blockNumber,
        false
      );
    });
    it('should create a pool', async () => {
      const signerAddress = await signer.getAddress();

      const { to, data } = composableStablePoolFactory.create({
        ...createComposableStableParams,
        owner: signerAddress,
      });
      const { transactionReceipt } = await sendTransactionGetBalances(
        [],
        signer,
        signerAddress,
        to as string,
        data as string
      );
      const poolInfo =
        await composableStablePoolFactory.getPoolAddressAndIdWithReceipt(
          signer.provider,
          transactionReceipt
        );
      poolAddress = poolInfo.poolAddress;
      poolId = poolInfo.poolId;
      //Verifying if the address and id are valid
      expect(poolId.length).to.equal(66);
      expect(poolAddress.length).to.equal(42);
      expect(poolId.indexOf('x')).to.equal(1);
      expect(poolAddress.indexOf('x')).to.equal(1);
      return;
    });
    it('should init join a pool', async () => {
      const signerAddress = await signer.getAddress();
      const composableStablePoolInterface =
        ComposableStable__factory.createInterface();
      const pool = new Contract(
        poolAddress,
        composableStablePoolInterface,
        provider
      );
      const scalingFactors = await pool.getScalingFactors();
      const amountsIn = [
        parseFixed('10000', 6).toString(),
        parseFixed('10000', 6).toString(),
      ];
      const { to, data } = composableStablePoolFactory.buildInitJoin({
        joiner: signerAddress,
        poolId,
        poolAddress,
        tokensIn: tokenAddresses,
        amountsIn,
      });
      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          [...tokenAddresses, poolAddress],
          signer,
          signerAddress,
          to,
          data
        );
      const vaultInterface = Vault__factory.createInterface();
      const poolInitJoinEvent: LogDescription = findEventInReceiptLogs({
        receipt: transactionReceipt,
        to,
        contractInterface: vaultInterface,
        logName: 'PoolBalanceChanged',
      });
      expect(!!poolInitJoinEvent).to.be.true;
      expect(
        balanceDeltas
          .slice(0, amountsIn.length)
          .map((delta) => delta.toString())
      ).deep.equal(amountsIn);

      //Calculate and compare the bptAmountOut
      const poolInvariant = StableMaths._invariant(
        parseFixed(createComposableStableParams.amplificationParameter, 3),
        amountsIn.map((amount, index) => {
          const upscaledAmount = _upscale(
            BigInt(amount),
            scalingFactors[index + 1].toBigInt()
          ).toString();
          return OldBigNumber(upscaledAmount, 10);
        })
      ).toString();

      // The amountOut of BPT shall be (invariant - 10e6) for equal amountsIn
      const expectedBptAmountOut = SolidityMaths.sub(
        BigInt(poolInvariant),
        // 1e6 is the minimum bpt, this amount of token is sent to address 0 to prevent the Pool to ever be drained
        BigInt(1e6)
      );
      expect(balanceDeltas[amountsIn.length].toBigInt()).eq(
        expectedBptAmountOut
      );
    });
  });
});
