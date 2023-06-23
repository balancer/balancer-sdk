// yarn test:only ./src/modules/pools/factory/weighted/weighted.factory.integration.spec.ts
import dotenv from 'dotenv';

dotenv.config();
import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { WeightedMaths } from '@balancer-labs/sor';
import {
  BalancerSDK,
  Network,
  PoolType,
  WeightedPool,
  WeightedPool__factory,
  WeightedCreatePoolParameters,
} from '@/.';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { ADDRESSES } from '@/test/lib/constants';
import {
  forkSetup,
  getBalances,
  sendTransactionGetBalances,
} from '@/test/lib/utils';
import { AddressZero } from '@ethersproject/constants';

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const balancer = new BalancerSDK({
  network,
  rpcUrl,
});
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const addresses = ADDRESSES[network];

describe('creating weighted pool', () => {
  const poolTokens = [addresses.USDC, addresses.USDT];
  const rawAmount = '1000000000';
  const amountsIn = poolTokens.map((p) =>
    parseFixed(rawAmount, p.decimals).toString()
  );
  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);
  let poolAddress: string;
  let poolId: string;
  let poolParams: WeightedCreatePoolParameters;
  let signerAddress: string;
  let pool: WeightedPool;
  context('create and init join', async () => {
    before(async () => {
      signerAddress = await signer.getAddress();
      await forkSetup(
        signer,
        poolTokens.map((p) => p.address),
        poolTokens.map((p) => p.slot),
        amountsIn,
        `${process.env.ALCHEMY_URL}`,
        16920000
      );
      poolParams = {
        name: 'My-Test-Pool-Name',
        symbol: 'My-Test-Pool-Symbol',
        tokenAddresses: poolTokens.map((p) => p.address),
        normalizedWeights: [
          parseFixed('0.2', 18).toString(),
          parseFixed('0.8', 18).toString(),
        ],
        rateProviders: [AddressZero, AddressZero],
        swapFeeEvm: parseFixed('0.005', 18).toString(),
        owner: signerAddress,
        salt: '0x1230000000000000000000000000000000000000000000000000000000000000',
      };
    });
    context('pool creation', async () => {
      let transactionReceipt: TransactionReceipt;
      it('should send creation tx', async () => {
        const txInfo = weightedPoolFactory.create(poolParams);
        transactionReceipt = await (
          await signer.sendTransaction({ ...txInfo })
        ).wait();
        expect(transactionReceipt.status).to.eql(1);
      });
      it('should have correct pool info on creation', async () => {
        ({ poolId, poolAddress } =
          await weightedPoolFactory.getPoolAddressAndIdWithReceipt(
            provider,
            transactionReceipt
          ));
        pool = WeightedPool__factory.connect(poolAddress, provider);
        const id = await pool.getPoolId();
        const owner = await pool.getOwner();
        const swapFee = await pool.getSwapFeePercentage();
        const name = await pool.name();
        const symbol = await pool.symbol();
        const normalizedWeights = await pool.getNormalizedWeights();
        expect(id).to.eq(poolId);
        expect(name).to.eq(poolParams.name);
        expect(symbol).to.eq(poolParams.symbol);
        expect(swapFee.toString()).to.eq(poolParams.swapFeeEvm);
        expect(
          normalizedWeights.map((weight) => weight.toString())
        ).to.deep.equal(poolParams.normalizedWeights);
        expect(owner).to.eq(poolParams.owner);
      });
    });
    context('init join', async () => {
      it('should send init join tx', async () => {
        const { to, data } = weightedPoolFactory.buildInitJoin({
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
      it('should receive correct BPT Amount', async () => {
        const amountsInEvm = poolTokens.map(() =>
          parseFixed(rawAmount, 18).toString()
        );
        const bptBalance = await getBalances(
          [poolAddress],
          signer,
          signerAddress
        );
        // The BPT Amount is calculated as:
        // BPTAmount = invariant * n - 1000000
        // where n is the number of tokens in the pool
        const invariantAfterJoin = WeightedMaths._calculateInvariant(
          poolParams.normalizedWeights.map((weight) =>
            BigInt(weight.toString())
          ),
          amountsInEvm.map(BigInt)
        );
        const invariantAfterJoinMultipliedByN = SolidityMaths.mul(
          invariantAfterJoin,
          BigInt(amountsInEvm.length)
        );
        //The pool sends 1000000 BPT to the address zero, so the BPT Supply can never be drained
        const expectedBptBalance = SolidityMaths.sub(
          invariantAfterJoinMultipliedByN,
          BigInt(1e6)
        );
        expect(bptBalance.toString()).to.eq(expectedBptBalance.toString());
      });
    });
  });
});
