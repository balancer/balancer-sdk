import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network } from '@/.';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { B_50WBTC_50WETH, getForkedPools } from '@/test/lib/mainnetPools';
import hardhat from 'hardhat';

import { JsonRpcSigner, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { parseFixed } from '@ethersproject/bignumber';

import { balancerVault } from '@/lib/constants/config';
import { SubgraphToken } from '@balancer-labs/sor';
import { AddressZero } from '@ethersproject/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

let balancer: BalancerSDK;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
let signerAddress: string;

const wETH = B_50WBTC_50WETH.tokens[0];
const wBTC = B_50WBTC_50WETH.tokens[1];
// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const wETH_SLOT = 3;
const wBTC_SLOT = 0;

const initialBalance = '100000';

const tokensIn = [wETH, wBTC];
const tokensInAddresses = tokensIn.map((token) => token.address);
let amountsIn: string[];

// Setup

const setupTokenBalance = async (
  signerAddress: string,
  token: SubgraphToken,
  slot: number,
  balance: string
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

  const locallyManipulatedBalance = parseFixed(balance, token.decimals);

  // Get storage slot index
  const index = ethers.utils.solidityKeccak256(
    ['uint256', 'uint256'],
    [signerAddress, slot] // key, slot
  );

  // Manipulate local balance (needs to be bytes32 string)
  await setStorageAt(
    token.address,
    index,
    toBytes32(locallyManipulatedBalance).toString()
  );
};

const setupPools = async () => {
  const pools = await getForkedPools(provider);
  balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl,
    sor: {
      tokenPriceService: 'coingecko',
      poolDataService: new MockPoolDataService(pools),
      fetchOnChainBalances: true,
    },
  });
  await balancer.pools.fetchPools();
};

const approveTokens = async (
  tokens: SubgraphToken[],
  amounts: string[],
  signer: JsonRpcSigner
) => {
  const parsedAmounts = amounts.map((amount, i) => {
    return parseFixed(amount, tokens[i].decimals);
  });
  for (let i = 0; i < tokens.length; i++) {
    const tokenContract = balancer.contracts.ERC20(
      tokens[i].address,
      signer.provider
    );
    await tokenContract
      .connect(signer)
      .approve(balancerVault, parsedAmounts[i]);
  }
};

const tokenBalance = async (tokenAddress: string) => {
  const balance: Promise<BigNumber> = balancer.contracts
    .ERC20(tokenAddress, signer.provider)
    .balanceOf(signerAddress);
  return balance;
};

// Test scenarios

describe('join execution', async () => {
  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptMinBalanceIncrease: BigNumber;
  let bptBalanceAfter: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];

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
    await setupPools();
    signerAddress = await signer.getAddress();
    await setupTokenBalance(signerAddress, wETH, wETH_SLOT, initialBalance);
    await setupTokenBalance(signerAddress, wBTC, wBTC_SLOT, initialBalance);
    await approveTokens(tokensIn, [initialBalance, initialBalance], signer);
  });

  context('exactTokensInJoinPool transaction - join with encoded data', () => {
    before(async function () {
      this.timeout(20000);

      amountsIn = [
        parseFixed(wETH.balance, wETH.decimals).div('1000000').toString(),
        parseFixed(wBTC.balance, wBTC.decimals).div('1000000').toString(),
      ];

      bptBalanceBefore = await tokenBalance(B_50WBTC_50WETH.address);
      tokensBalanceBefore = [
        await tokenBalance(wETH.address),
        await tokenBalance(wBTC.address),
      ];

      const slippage = '100';
      const { to, data, minBPTOut } =
        await balancer.pools.join.buildExactTokensInJoinPool(
          signerAddress,
          B_50WBTC_50WETH.id,
          tokensInAddresses,
          amountsIn,
          slippage
        );
      const tx = { to, data };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      bptBalanceAfter = await tokenBalance(B_50WBTC_50WETH.address);

      expect(
        bptBalanceAfter.sub(bptBalanceBefore).toNumber()
      ).to.greaterThanOrEqual(bptMinBalanceIncrease.toNumber());
    });

    it('should decrease tokens balance', async () => {
      tokensBalanceAfter = [
        await tokenBalance(wETH.address),
        await tokenBalance(wBTC.address),
      ];

      for (let i = 0; i < tokensIn.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
  });

  context('exactTokensInJoinPool transaction - join with params', () => {
    before(async function () {
      this.timeout(20000);

      amountsIn = [
        parseFixed(wETH.balance, wETH.decimals).div('1000000').toString(),
        parseFixed(wBTC.balance, wBTC.decimals).div('1000000').toString(),
      ];

      bptBalanceBefore = await tokenBalance(B_50WBTC_50WETH.address);
      tokensBalanceBefore = [
        await tokenBalance(wETH.address),
        await tokenBalance(wBTC.address),
      ];

      const slippage = '100';
      const { functionName, attributes, value, minBPTOut } =
        await balancer.pools.join.buildExactTokensInJoinPool(
          signerAddress,
          B_50WBTC_50WETH.id,
          tokensInAddresses,
          amountsIn,
          slippage
        );
      const transactionResponse = await balancer.contracts.vault
        .connect(signer)
        [functionName](
          attributes.poolId,
          attributes.sender,
          attributes.recipient,
          attributes.joinPoolRequest,
          { value }
        );
      transactionReceipt = await transactionResponse.wait();

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      bptBalanceAfter = await tokenBalance(B_50WBTC_50WETH.address);

      expect(
        bptBalanceAfter.sub(bptBalanceBefore).toNumber()
      ).to.greaterThanOrEqual(bptMinBalanceIncrease.toNumber());
    });

    it('should decrease tokens balance', async () => {
      tokensBalanceAfter = [
        await tokenBalance(wETH.address),
        await tokenBalance(wBTC.address),
      ];

      for (let i = 0; i < tokensIn.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
  });

  context('exactTokensInJoinPool transaction - join with ETH', () => {
    let transactionCost: BigNumber;
    before(async function () {
      this.timeout(20000);

      amountsIn = [
        parseFixed(wETH.balance, wETH.decimals).div('1000000').toString(),
        parseFixed(wBTC.balance, wBTC.decimals).div('1000000').toString(),
      ];

      bptBalanceBefore = await tokenBalance(B_50WBTC_50WETH.address);
      tokensBalanceBefore = [
        await signer.getBalance(),
        await tokenBalance(wBTC.address),
      ];

      const slippage = '100';
      const { to, data, value, minBPTOut } =
        await balancer.pools.join.buildExactTokensInJoinPool(
          signerAddress,
          B_50WBTC_50WETH.id,
          [AddressZero, wBTC.address],
          amountsIn,
          slippage
        );
      const tx = { to, data, value };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      transactionCost = transactionReceipt.gasUsed.mul(
        transactionReceipt.effectiveGasPrice
      );
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      bptBalanceAfter = await tokenBalance(B_50WBTC_50WETH.address);

      expect(
        bptBalanceAfter.sub(bptBalanceBefore).toNumber()
      ).to.greaterThanOrEqual(bptMinBalanceIncrease.toNumber());
    });

    it('should decrease tokens balance', async () => {
      tokensBalanceAfter = [
        await (await signer.getBalance()).add(transactionCost),
        await tokenBalance(wBTC.address),
      ];

      for (let i = 0; i < tokensIn.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
  });

  context('exactTokensInJoinPool transaction - single token join', () => {
    before(async function () {
      this.timeout(20000);
      amountsIn = [
        parseFixed(wETH.balance, wETH.decimals).div('100').toString(),
      ];
    });

    it('should fail on number of input tokens', async () => {
      const slippage = '10';
      let errorMessage;
      try {
        await balancer.pools.join.buildExactTokensInJoinPool(
          signerAddress,
          B_50WBTC_50WETH.id,
          tokensInAddresses,
          amountsIn,
          slippage
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      // Slippage should trigger 208 error => Slippage/front-running protection check failed on a pool join
      // https://dev.balancer.fi/references/error-codes
      expect(errorMessage).to.contain(
        'Must provide amount for all tokens in the pool'
      );
    });
  });
}).timeout(20000);
