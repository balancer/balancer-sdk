import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network } from '@/.';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { B_50WBTC_50WETH, getForkedPools } from '@/test/lib/mainnetPools';
import hardhat from 'hardhat';

import { JsonRpcSigner, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';

import { balancerVault } from '@/lib/constants/config';
import { SubgraphToken } from '@balancer-labs/sor';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

let balancer: BalancerSDK;
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
let amountsIn: string[];

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

// Test scenarios

describe('join execution', async () => {
  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptMinBalanceIncrease: BigNumber;
  let signerAddress: string;

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
    amountsIn = [
      formatFixed(
        parseFixed(wETH.balance, wETH.decimals).div('1000000'),
        wETH.decimals
      ),
      formatFixed(
        parseFixed(wBTC.balance, wBTC.decimals).div('1000000'),
        wBTC.decimals
      ),
    ];
    signerAddress = await signer.getAddress();
    await setupTokenBalance(signerAddress, wETH.address, wETH_SLOT);
    await setupTokenBalance(signerAddress, wBTC.address, wBTC_SLOT);
    await approveTokens(tokensIn, amountsIn, signer);
  });

  context('exactTokensInJoinPool transaction', () => {
    before(async function () {
      this.timeout(20000);

      bptBalanceBefore = await balancer.contracts
        .ERC20(B_50WBTC_50WETH.address, signer.provider)
        .balanceOf(signerAddress);

      const slippage = '0.2';
      const { data, minAmountsOut } =
        await balancer.pools.join.buildExactTokensInJoinPool(
          signerAddress,
          B_50WBTC_50WETH.id,
          tokensInAddresses,
          amountsIn,
          slippage
        );
      const to = balancerVault;
      const tx = { data, to };

      bptMinBalanceIncrease = BigNumber.from(minAmountsOut[0]);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('balance should increase', async () => {
      const bptBalanceAfter: BigNumber = await balancer.contracts
        .ERC20(B_50WBTC_50WETH.address, signer.provider)
        .balanceOf(signerAddress);

      expect(
        bptBalanceAfter.sub(bptBalanceBefore).toNumber()
      ).to.greaterThanOrEqual(bptMinBalanceIncrease.toNumber());
    });
  });

  context('exactTokensInJoinPool transaction - slippage out of bounds', () => {
    amountsIn = [
      formatFixed(
        parseFixed(wETH.balance, wETH.decimals).div('100'),
        wETH.decimals
      ),
      formatFixed(
        parseFixed(wBTC.balance, wBTC.decimals).div('10'),
        wBTC.decimals
      ),
    ];
    before(async function () {
      this.timeout(20000);
      await approveTokens(tokensIn, amountsIn, signer);
    });

    it('should fail on slippage', async () => {
      const slippage = '0.001';
      const { data } = await balancer.pools.join.buildExactTokensInJoinPool(
        signerAddress,
        B_50WBTC_50WETH.id,
        tokensInAddresses,
        amountsIn,
        slippage
      );
      const to = balancerVault;
      const tx = { data, to };
      let reason;
      try {
        await (await signer.sendTransaction(tx)).wait();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        reason = error.reason;
      }
      // Slippage should trigger 208 error => Slippage/front-running protection check failed on a pool join
      // https://dev.balancer.fi/references/error-codes
      expect(reason).to.contain('BAL#208');
    });
  });
}).timeout(20000);
