import { Contract } from '@ethersproject/contracts';
import { defaultAbiCoder } from '@ethersproject/abi';
import { MaxUint256 } from '@ethersproject/constants';
import { ExitPoolRequest } from '@/types';
import { Network } from '@/lib/constants/network';
import { Relayer, OutputReference } from '../relayer/relayer.module';
import { StablePoolEncoder } from '@/pool-stable';
import { SwapType, FundManagement, BatchSwapStep } from '../swaps/types';

// TO DO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { JsonRpcProvider } from '@ethersproject/providers';

export const CONSTANTS: NewtorkConstants = {
  Mainnet: {
    relayer: 'TODO',
    staBal3: {
      id: '',
      address: '0x8fd162f338b770f7e879030830cde9173367f301',
    },
    staBal3Gauge: '0x8fd162f338b770f7e879030830cde9173367f301',
    linearUsdc1: {
      id: '',
      address: 'N/A',
    },
    linearDai1: {
      id: '',

      address: 'N/A',
    },
    linearUsdt1: {
      id: '',

      address: 'N/A',
    },
    linearUsdc2: {
      id: '',

      address: 'N/A',
    },
    linearDai2: {
      id: '',

      address: 'N/A',
    },
    linearUsdt2: {
      id: '',

      address: 'N/A',
    },
    bbausd2Gauge: '0x8fd162f338b770f7e879030830cde9173367f301',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  Goerli: {
    relayer: 'TODO',
    staBal3Gauge: '0x8fd162f338b770f7e879030830cde9173367f301',
    staBal3: {
      id: '',
      address: '0x8fd162f338b770f7e879030830cde9173367f301',
    },
    linearUsdc1: {
      id: '',
      address: 'N/A',
    },
    linearDai1: {
      id: '',
      address: 'N/A',
    },
    linearUsdt1: {
      id: '',
      address: 'N/A',
    },
    linearUsdc2: {
      id: '',
      address: 'N/A',
    },
    linearDai2: {
      id: '',
      address: 'N/A',
    },
    linearUsdt2: {
      id: '',
      address: 'N/A',
    },
    bbausd2Gauge: '0x8fd162f338b770f7e879030830cde9173367f301',
    DAI: '',
    USDC: '',
    USDT: '',
  },
};

interface Pool {
  id: string;
  address: string;
}

interface Constants {
  relayer: string;
  staBal3: Pool;
  staBal3Gauge: string;
  linearUsdc1: Pool;
  linearDai1: Pool;
  linearUsdt1: Pool;
  linearUsdc2: Pool;
  linearDai2: Pool;
  linearUsdt2: Pool;
  bbausd2Gauge: string;
  DAI: string;
  USDC: string;
  USDT: string;
}

interface NewtorkConstants {
  Mainnet: Constants;
  Goerli: Constants;
}

type GaugeWithDraw = string;
type ExitPool = string;
type BatchSwap = string;
type JoinPool = string;
type GaugeDeposit = string;

type CallData = [GaugeWithDraw, ExitPool, BatchSwap, JoinPool, GaugeDeposit];

export interface MigrationAttributes {
  to: string;
  functionName: string;
  calldata: CallData;
}

export class MigrateStaBal3 {
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
        this.constants.staBal3Gauge,
        migrator,
        this.constants.relayer,
        amount
      );
      */
    return '';
  }

  /**
   * Creates encoded exitPool function.
   * Exit staBal3 pool proportionally to underlying Linear BPTs. Exits to relayer.
   * Outputreferences are used to store exit amounts for next transaction.
   * @param migrator Migrator address.
   * @param amount Amount of staBal3 BPT to exit with.
   * @returns Encoded exitPool call. Output references.
   */
  buildPoolExit(
    migrator: string,
    amount: string
  ): { call: ExitPool; oldLinearAmountsReferences: OutputReference[] } {
    // Assume gaugeWithdraw returns same amount value
    const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);

    // TO DO - Tokens have to be in correct order - might not be.
    const exitTokens = [
      this.constants.linearDai1.address,
      this.constants.linearUsdc1.address,
      this.constants.linearUsdt1.address,
    ];
    // Output of exit is used as input to swaps
    const exitOutputReferences: OutputReference[] = [];
    exitTokens.forEach((asset, i) => {
      const key = Relayer.toChainedReference(i);
      exitOutputReferences.push({
        index: i,
        key: key,
      });
    });

    const call = Relayer.constructExitCall({
      assets: exitTokens,
      minAmountsOut: ['0', '0', '0'],
      userData: userData,
      toInternalBalance: false,
      poolId: this.constants.staBal3.id,
      poolKind: 0, // This will always be 0 to match supported Relayer types
      sender: migrator,
      recipient: this.constants.relayer,
      outputReferences: exitOutputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
    });

    return {
      call,
      oldLinearAmountsReferences: exitOutputReferences,
    };
  }

  /**
   * Creates encoded batchSwap function to swap Linear BPTs to underlying stables.
   * outputreferences should contain the amounts of each new Linear BPT.
   * @param outputReferences References from previous exit call.
   * @returns BatchSwap call.
   */
  buildSwap(outputReferences: OutputReference[]): {
    call: BatchSwap;
    newLinearAmountsReferences: OutputReference[];
  } {
    // for each linear pool swap -
    // linear1Bpt[linear1]stable[linear2]linear2bpt Uses chainedReference from previous action for amount.
    // TO DO - Will swap order matter here? John to ask Fernando.
    const swaps: BatchSwapStep[] = [
      {
        poolId: this.constants.linearDai1.id,
        assetInIndex: 0,
        assetOutIndex: 1,
        amount: outputReferences[0].key.toString(),
        userData: '0x',
      },
      {
        poolId: this.constants.linearDai2.id,
        assetInIndex: 1,
        assetOutIndex: 2,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdc1.id,
        assetInIndex: 3,
        assetOutIndex: 4,
        amount: outputReferences[1].key.toString(),
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdc2.id,
        assetInIndex: 4,
        assetOutIndex: 5,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdt1.id,
        assetInIndex: 6,
        assetOutIndex: 7,
        amount: outputReferences[2].key.toString(),
        userData: '0x',
      },
      {
        poolId: this.constants.linearUsdt2.id,
        assetInIndex: 7,
        assetOutIndex: 8,
        amount: '0',
        userData: '0x',
      },
    ];
    const assets = [
      this.constants.linearDai1.address,
      this.constants.DAI,
      this.constants.linearDai2.address,
      this.constants.linearUsdc1.address,
      this.constants.USDC,
      this.constants.linearUsdc2.address,
      this.constants.linearUsdt1.address,
      this.constants.USDT,
      this.constants.linearUsdt2.address,
    ];
    // For now assuming ref amounts will be safe - should we add more accurate?
    const limits = [
      MaxUint256.toString(),
      '0',
      '0',
      MaxUint256.toString(),
      '0',
      '0',
      MaxUint256.toString(),
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

    // We only need the deltas/amounts of the new Linear pools (matches assets index)
    // Final order should match token order required for joinPool
    const linearDai2OutputRef = swapOutputReferences[2];
    const linearUsdc2OutputRef = swapOutputReferences[5];
    const linearUsdt2OutputRef = swapOutputReferences[8];

    return {
      call: encodedBatchSwap,
      newLinearAmountsReferences: [
        linearDai2OutputRef,
        linearUsdc2OutputRef,
        linearUsdt2OutputRef,
      ],
    };
  }

  buildPoolJoin(
    joinAmounts: OutputReference[],
    expectedBptReturn: string,
    slippage: string
  ): {
    call: JoinPool;
    bptOutputReference: OutputReference;
  } {
    /*
      Create encoded joinPool.
      join bbausd2 pool using Linear2 BPT tokens.
      Use expectedBptReturn and slippage to set minAmount out
      The join amounts should be stored in previous reference
      Needs to set output references for next step - this will be the amount of bpt returned by join
      */
    return {
      call: '',
      bptOutputReference: {} as OutputReference,
    };
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

  buildMigration(
    migrator: string,
    amount: string,
    expectedBptReturn: string,
    slippage: string
  ): MigrationAttributes {
    /*
    From Nico -
    the flow is:
    a) relayer uses allowance to transfer staked bpt from user to itself
    b) relayer returns staked bpt to get bpt back
    (steps a) and b) are done automatically by the relayer)
    c) relayer uses the bpt it got to exit the pool
    d) relayer swaps linear bpt into stables, and stables into linear v2 bpt
    e) relayer joins bb-a-usd 2
    f) relayer stakes bb-a-usd-bpt
    g) relayer sends staked bpt to user
    (steps f) and g) are done automatically by the relayer)
    (if the relayer is not yet approved by the user, there's one more step at the beginning where the relayer submits the user signature to approve itself)
    */
    const gaugeWithdraw = this.buildWithdraw(migrator, amount);

    const poolExit = this.buildPoolExit(migrator, amount);

    const swaps = this.buildSwap(poolExit.oldLinearAmountsReferences);

    const poolJoin = this.buildPoolJoin(
      swaps.newLinearAmountsReferences,
      expectedBptReturn,
      slippage
    );

    const gaugeDeposit = this.buildDeposit(
      migrator,
      poolJoin.bptOutputReference
    );

    const calls: CallData = [
      gaugeWithdraw,
      poolExit.call,
      swaps.call,
      poolJoin.call,
      gaugeDeposit,
    ];

    return {
      to: this.constants.relayer,
      functionName: 'multicall',
      calldata: calls,
    };
  }

  /**
   * Statically calls migration action to find final BPT amount returned.
   * @param migrator Migrator address.
   * @param amount Amount of staBal3 BPT.
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
    // BPT amount from poolJoin call
    return defaultAbiCoder.decode(['int256[]'], tx[3]).toString();
  }
}
