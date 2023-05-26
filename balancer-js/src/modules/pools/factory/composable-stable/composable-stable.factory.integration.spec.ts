// yarn test:only ./src/modules/pools/factory/composable-stable/composable-stable.factory.integration.spec.ts
import dotenv from 'dotenv';

dotenv.config();
import { expect } from 'chai';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import {
  Network,
  PoolType,
  ComposableStablePool__factory,
  BalancerSDK,
  ComposableStablePool,
  ComposableStableCreatePoolParameters,
} from '@/.';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { ADDRESSES } from '@/test/lib/constants';
import {
  forkSetup,
  sendTransactionGetBalances,
  getBalances,
} from '@/test/lib/utils';

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const balancer = new BalancerSDK({
  network,
  rpcUrl,
});
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const addresses = ADDRESSES[network];

describe('ComposableStable Factory', async () => {
  const poolTokens = [addresses.USDC, addresses.USDT];
  const amountsIn = poolTokens.map((p) =>
    parseFixed('1000000000', p.decimals).toString()
  );
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );
  let poolParams: ComposableStableCreatePoolParameters;
  let poolAddress: string;
  let poolId: string;
  let signerAddress: string;
  let pool: ComposableStablePool;
  before(async () => {
    signerAddress = await signer.getAddress();
    await forkSetup(
      signer,
      poolTokens.map((p) => p.address),
      poolTokens.map((p) => p.slot),
      amountsIn,
      `${process.env.ALCHEMY_URL}`,
      17040000,
      Array(poolTokens.length).fill(false)
    );
    poolParams = {
      name: 'My-Test-Pool-Name',
      symbol: 'My-Test-Pool-Symbol',
      tokenAddresses: poolTokens.map((p) => p.address),
      exemptFromYieldProtocolFeeFlags: poolTokens.map(() => false),
      rateProviders: poolTokens.map(() => AddressZero),
      tokenRateCacheDurations: poolTokens.map(() => '0'),
      owner: signerAddress,
      amplificationParameter: '92',
      swapFeeEvm: parseFixed('0.10', 18).toString(),
    };
  });
  context('pool creation', async () => {
    let transactionReceipt: TransactionReceipt;

    it('should send creation tx', async () => {
      const txInfo = composableStablePoolFactory.create(poolParams);
      transactionReceipt = await (await signer.sendTransaction(txInfo)).wait();
      expect(transactionReceipt.status).to.eql(1);
    });
    it('should have correct pool info on creation', async () => {
      ({ poolId, poolAddress } =
        await composableStablePoolFactory.getPoolAddressAndIdWithReceipt(
          provider,
          transactionReceipt
        ));
      pool = ComposableStablePool__factory.connect(poolAddress, provider);
      const id = await pool.getPoolId();
      const owner = await pool.getOwner();
      const swapFee = await pool.getSwapFeePercentage();
      const name = await pool.name();
      const symbol = await pool.symbol();
      const amp = await pool.getAmplificationParameter();
      expect(id).to.eq(poolId);
      expect(swapFee.toString()).to.eq(poolParams.swapFeeEvm);
      expect(name).to.eq(poolParams.name);
      expect(symbol).to.eq(poolParams.symbol);
      expect(amp.value.div(amp.precision).toString()).to.eq(
        poolParams.amplificationParameter
      );
      expect(owner).to.eq(poolParams.owner);
    });
  });
  context('init join', async () => {
    it('should init join a pool', async () => {
      const { to, data } = composableStablePoolFactory.buildInitJoin({
        joiner: signerAddress,
        poolId,
        poolAddress,
        tokensIn: poolTokens.map((p) => p.address),
        amountsIn,
      });
      const { transactionReceipt } = await sendTransactionGetBalances(
        [...poolTokens.map((p) => p.address), poolAddress],
        signer,
        signerAddress,
        to,
        data
      );
      expect(transactionReceipt.status).to.eql(1);
    });
    it('should have joined with full balance', async () => {
      const poolTokenBalances = await getBalances(
        poolTokens.map((p) => p.address),
        signer,
        signerAddress
      );
      poolTokenBalances.forEach((b) => expect(b.isZero()).is.true);
    });
    it('should receive correct BPT amount', async () => {
      const bptBalance = (
        await getBalances([pool.address], signer, signerAddress)
      )[0];
      const { lastPostJoinExitInvariant: poolInvariant } =
        await pool.getLastJoinExitData();
      // The amountOut of BPT shall be (invariant - 10e6) for equal amountsIn
      const expectedBptAmountOut = SolidityMaths.sub(
        parseFixed(poolInvariant.toString()).toBigInt(),
        // 1e6 is the minimum bpt, this amount of token is sent to address 0 to prevent the Pool to ever be drained
        BigInt(1e6)
      );
      expect(bptBalance.toBigInt()).eq(expectedBptAmountOut);
    });
  });
});
