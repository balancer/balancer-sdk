import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network } from '@/.';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { B_50WBTC_50WETH, getForkedPools } from '@/test/lib/mainnetPools';
import hardhat from 'hardhat';

import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { BigNumber } from 'ethers';
import { parseFixed } from '@ethersproject/bignumber';

import { Pools } from '../pools.module';
import { balancerVault } from '@/lib/constants/config';
import erc20Abi from '@/lib/abi/erc20.json';
import { SubgraphToken } from '@balancer-labs/sor';

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
const signer = provider.getSigner();

const wETH = B_50WBTC_50WETH.tokens[0];
const wBTC = B_50WBTC_50WETH.tokens[1];
// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const wETH_SLOT = 3;
const wBTC_SLOT = 0;

const tokensIn = [wETH, wBTC];
const tokensInAddresses = tokensIn.map((token) => token.address);
const amountsIn = ['0.018174', '0.001099'];

// Setup

const setupTokenBalance = async (
  signerAddress: string,
  tokenAddress: string,
  slot: number
) => {
  const toBytes32 = (bn: BigNumber) => {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
  };

  const setStorageAt = async (
    tokenAddress: string,
    index: string,
    value: string
  ) => {
    await provider.send('hardhat_setStorageAt', [tokenAddress, index, value]);
    await provider.send('evm_mine', []); // Just mines to the next block
  };

  const locallyManipulatedBalance = parseFixed('100000', 18);

  // Get storage slot index
  const index = ethers.utils.solidityKeccak256(
    ['uint256', 'uint256'],
    [signerAddress, slot] // key, slot
  );

  // Manipulate local balance (needs to be bytes32 string)
  await setStorageAt(
    tokenAddress,
    index,
    toBytes32(locallyManipulatedBalance).toString()
  );
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

const approveTokens = async (tokens: SubgraphToken[], amounts: string[]) => {
  const parsedAmounts = amounts.map((amount, i) => {
    return parseFixed(amount, tokens[i].decimals);
  });
  for (let i = 0; i < tokens.length; i++) {
    const tokenContract = new Contract(tokens[i].address, erc20Abi, signer);
    await tokenContract.approve(balancerVault, parsedAmounts[i]);
  }
};

// Test scenarios

describe('join execution', async () => {
  let poolsModule: Pools;
  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptBalanceIncrease: BigNumber;
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
    poolsModule = await setupPoolsModule(provider); // must setup pools module before amountsIn calculation
    signerAddress = await signer.getAddress();
    await setupTokenBalance(signerAddress, wETH.address, wETH_SLOT);
    await setupTokenBalance(signerAddress, wBTC.address, wBTC_SLOT);
    await approveTokens(tokensIn, amountsIn);
  });

  context('exactTokensInJoinPool transaction', () => {
    before(async function () {
      this.timeout(20000);

      bptBalanceBefore = await bptContract.balanceOf(signerAddress);

      const slippage = '0.01';
      const { data } = await poolsModule.join.buildExactTokensInJoinPool(
        signerAddress,
        B_50WBTC_50WETH.id,
        tokensInAddresses,
        amountsIn,
        slippage
      );
      const to = balancerVault;
      const tx = { data, to }; // , gasPrice: '60000000000', gasLimit: '2000000'

      bptBalanceIncrease = BigNumber.from('8793334702586135'); // get from bptOut value (after adapting function to return transaction attributes)
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('balance should increase', async () => {
      const bptBalanceAfter: BigNumber = await bptContract.balanceOf(
        signerAddress
      );

      expect(bptBalanceAfter.sub(bptBalanceBefore).toNumber()).to.eql(
        bptBalanceIncrease.toNumber()
      );
    });
  });
}).timeout(20000);
