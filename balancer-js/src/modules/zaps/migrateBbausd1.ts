import { Contract } from '@ethersproject/contracts';
import { defaultAbiCoder } from '@ethersproject/abi';
import { MaxUint256 } from '@ethersproject/constants';
import { Network } from '@/lib/constants/network';
import { Relayer, OutputReference } from '../relayer/relayer.module';
import { SwapType, FundManagement, BatchSwapStep } from '../swaps/types';

// TO DO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { JsonRpcProvider } from '@ethersproject/providers';

import { Constants, CONSTANTS } from './migrateStaBal3';

type GaugeWithDraw = string;
type BatchSwap = string;
type GaugeDeposit = string;
type CallData = [GaugeWithDraw, BatchSwap, GaugeDeposit];

export interface MigrationAttributes {
  to: string;
  functionName: string;
  calldata: CallData;
}

export class MigrateBbausd1 {
  public constants: Constants;
  constructor(public network: Network, public relayer: Relayer) {
    if (!(network === Network.MAINNET || network === Network.GOERLI))
      throw new Error('This is not a supported network');

    this.constants =
      this.network === Network.MAINNET ? CONSTANTS.Mainnet : CONSTANTS.Goerli;
  }

  buildWithdraw(migrator: string, amount: string): GaugeWithDraw {
    /*
          a) relayer uses allowance to transfer staked bpt from user to itself
          b) relayer returns staked bpt to get bpt back
         (steps a) and b) are done automatically by the relayer)
          TO DO -
          See relayer GaugeActions.sol
          Encode gaugeWithdraw
          GaugeActions gaugeWithdraw(
              IStakingLiquidityGauge gauge,
              address sender,
              address recipient,
              uint256 amount
          )
          gaugeWithdraw(
            this.constants.bbausd1Gauge,
            migrator,
            this.constants.relayer,
            amount
          );
          */
    return '';
  }

  buildDeposit(migrator: string, bptAmount: OutputReference): GaugeDeposit {
    /*
            f) relayer stakes bb-a-usd-bpt
            g) relayer sends staked bpt to user
            (steps f) and g) are done automatically by the relayer)
            TO DO -
            Encode gaugeDeposit
            GaugeActions gaugeDeposit(
                IStakingLiquidityGauge gauge,
                address sender,
                address recipient,
                uint256 amount
            )
            Uses chainedReference from previous action for amount
            gaugeDeposit(
                this.constants.bbausd2Gauge,
                this.constants.relayer,
                migrator,
                bptAmount
            )
            */
    return '';
  }

  /**
   * Creates encoded batchSwap function to swap Linear BPTs to underlying stables.
   * outputreferences should contain the amounts of each new Linear BPT.
   * @param outputReferences References from previous exit call.
   * @returns BatchSwap call.
   */
  buildSwap(
    bptAmount: string,
    expectedBptReturn: string,
    slippage: string
  ): {
    call: BatchSwap;
    bbausd2AmountsReference: OutputReference;
  } {
    // bbausd1[bbausd1]blinear1[linear1]stable[linear2]blinear2[bbausd2]bbausd2 and then do that proportionally for each underlying stable.
    // TO DO - Will swap order matter here? John to ask Fernando.
    // TO DO - Need to split BPT amount proportionally
    const daiBptAmt = '';
    const usdcBptAmt = '';
    const usdtBptAmt = '';

    const swaps: BatchSwapStep[] = [
      {
        poolId: this.constants.bbausd1.id,
        assetInIndex: 0,
        assetOutIndex: 1,
        amount: daiBptAmt,
        userData: '0x',
      },
      {
        poolId: this.constants.linearDai1.id,
        assetInIndex: 1,
        assetOutIndex: 2,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.linearDai2.id,
        assetInIndex: 2,
        assetOutIndex: 3,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.bbausd2.id,
        assetInIndex: 3,
        assetOutIndex: 4,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.bbausd1.id,
        assetInIndex: 0,
        assetOutIndex: 5,
        amount: usdcBptAmt,
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdc1.id,
        assetInIndex: 5,
        assetOutIndex: 6,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdc2.id,
        assetInIndex: 6,
        assetOutIndex: 7,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.bbausd2.id,
        assetInIndex: 7,
        assetOutIndex: 4,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.bbausd1.id,
        assetInIndex: 0,
        assetOutIndex: 8,
        amount: usdtBptAmt,
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdt1.id,
        assetInIndex: 8,
        assetOutIndex: 9,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdt2.id,
        assetInIndex: 9,
        assetOutIndex: 10,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.bbausd2.id,
        assetInIndex: 10,
        assetOutIndex: 4,
        amount: '0',
        userData: '0x',
      },
    ];
    const assets = [
      this.constants.bbausd1.address,
      this.constants.linearDai1.address,
      this.constants.DAI,
      this.constants.linearDai2.address,
      this.constants.bbausd2.address,
      this.constants.linearUsdc1.address,
      this.constants.USDC,
      this.constants.linearUsdc2.address,
      this.constants.linearUsdt1.address,
      this.constants.USDT,
      this.constants.linearUsdt2.address,
    ];
    // For now assuming ref amounts will be safe - should we add more accurate?
    const limits = [
      bptAmount,
      '0',
      '0',
      '0',
      '0', // Can use expectedBpt amount and slippage to set this limit
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
    ];

    // Swap to/from Relayer
    const funds: FundManagement = {
      sender: this.constants.relayer,
      recipient: this.constants.relayer,
      fromInternalBalance: false,
      toInternalBalance: false,
    };

    // Output of exit is used as input to swaps
    // This should have a value for each delta returned by batchSwap
    const swapOutputReferences: OutputReference[] = [];
    assets.forEach((asset, i) => {
      const key = Relayer.toChainedReference(i);
      swapOutputReferences.push({
        index: i,
        key: key,
      });
    });

    const encodedBatchSwap = Relayer.encodeBatchSwap({
      swapType: SwapType.SwapExactIn,
      swaps: swaps,
      assets: assets,
      funds: funds,
      limits,
      deadline: MaxUint256,
      value: '0',
      outputReferences: swapOutputReferences,
    });

    // We only need the deltas/amounts of the new bbausd2 pools (matches assets index)
    // Final order should match token order required for joinPool
    const bbausd2AmountsReference = swapOutputReferences[4];

    return {
      call: encodedBatchSwap,
      bbausd2AmountsReference: bbausd2AmountsReference,
    };
  }

  buildMigration(
    migrator: string,
    amount: string,
    expectedBptReturn: string,
    slippage: string
  ): MigrationAttributes {
    /*
    the flow is:
    withdraw from gauge
    swap bbausd1 > bbausd2 via proportional underlying.
    deposit into gauge
    */
    const gaugeWithdraw = this.buildWithdraw(migrator, amount);

    const swaps = this.buildSwap(amount, expectedBptReturn, slippage);

    const gaugeDeposit = this.buildDeposit(
      migrator,
      swaps.bbausd2AmountsReference
    );

    const calls: CallData = [gaugeWithdraw, swaps.call, gaugeDeposit];

    return {
      to: this.constants.relayer,
      functionName: 'multicall',
      calldata: calls,
    };
  }

  /**
   * Statically calls migration action to find final bbausd2 BPT amount returned.
   * @param migrator Migrator address.
   * @param amount Amount of bbausd1 BPT.
   * @param provider Provider.
   * @returns BPT amount from poolJoin call.
   */
  async queryMigration(
    migrator: string,
    amount: string,
    provider: JsonRpcProvider
  ): Promise<string> {
    const migrationData = this.buildMigration(migrator, amount, '0', '0');
    const relayerContract = new Contract(
      this.constants.relayer,
      balancerRelayerAbi,
      provider
    );
    // Returns result of each call in an array
    const tx = await relayerContract.callStatic[migrationData.functionName](
      migrationData.calldata
    );
    // bbausd2 delta amount from batchSwap call
    return defaultAbiCoder.decode(['int256[]'], tx[1])[4].toString();
  }
}
