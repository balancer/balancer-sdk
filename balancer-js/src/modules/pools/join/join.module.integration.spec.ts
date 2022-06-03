import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network } from '@/.';
import { MockPoolDataService } from '@/test/lib/mockPool';
import hardhat from 'hardhat';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { B_50WBTC_50WETH, getForkedPools } from '@/test/lib/mainnetPools';
import { Pools } from '../pools.module';
import { balancerVault } from '@/lib/constants/config';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

const getERC20Contract = (address: string) => {
  return new ethers.Contract(
    address,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
};

const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);

const IMPERSONATED_ADDRESS = '0xf933058d90020e88ae97fa5a4753ff9b4f3a7879';
let signer: SignerWithAddress;

// Setup

const setupSigner = async (address: string): Promise<SignerWithAddress> => {
  await hardhat.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  return ethers.getSigner(address);
};

const resetSigner = async (address: string) => {
  await hardhat.network.provider.request({
    method: 'hardhat_stopImpersonatingAccount',
    params: [address],
  });
};

const setupBalance = async (address: string) => {
  await hardhat.network.provider.send('hardhat_setBalance', [
    address,
    '0x1000000000000000000',
  ]);
};

const setupPoolsModule = async (provider: JsonRpcProvider) => {
  const pools = await getForkedPools(provider);
  const poolsModule = new Pools({
    network: Network.MAINNET,
    rpcUrl,
    sor: {
      tokenPriceService: 'coingecko',
      poolDataService: new MockPoolDataService(pools),
      fetchOnChainBalances: true,
    },
  });
  await poolsModule.fetchPools();
  return poolsModule;
};

// Test scenarios

describe('join execution', async () => {
  let poolsModule: Pools;
  let transactionReceipt: TransactionReceipt;
  let balanceBefore: BigNumber;
  let balanceExpected: BigNumber;
  let signerAddress: string;
  const bptContract = getERC20Contract(B_50WBTC_50WETH.address);

  // Setup chain
  before(async function () {
    this.timeout(20000);

    await provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl,
        },
      },
    ]);
    signer = await setupSigner(IMPERSONATED_ADDRESS);
    signerAddress = await signer.getAddress();
    await setupBalance(signerAddress);
    poolsModule = await setupPoolsModule(provider);
  });

  context('exactTokensInJoinPool transaction', () => {
    before(async function () {
      this.timeout(20000);

      balanceBefore = await bptContract.balanceOf(signerAddress);
      const wETH = B_50WBTC_50WETH.tokens[0];
      const wBTC = B_50WBTC_50WETH.tokens[1];
      const tokensIn = [wETH.address, wBTC.address];
      const amountsIn = [
        (parseInt(wETH.balance) / 100).toString(),
        (parseInt(wBTC.balance) / 100).toString(),
      ];
      const slippage = '0.01';
      const data = await poolsModule.join.encodedExactTokensInJoinPool(
        signerAddress,
        B_50WBTC_50WETH.id,
        tokensIn,
        amountsIn,
        slippage
      );
      const to = balancerVault;
      const tx = { data, to };

      balanceExpected = BigNumber.from('1'); // setting 1 to force test to fail - correct value will be available when code works as expected
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('balance should increase', async () => {
      const balanceAfter: BigNumber = await bptContract.balanceOf(
        signerAddress
      );

      expect(balanceAfter.sub(balanceBefore).toNumber()).to.eql(
        balanceExpected.toNumber()
      );
    });

    after(async () => {
      await resetSigner(IMPERSONATED_ADDRESS);
      await signer.getAddress();
    });
  });
}).timeout(20000);
