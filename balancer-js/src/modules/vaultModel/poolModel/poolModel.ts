import { PoolDictionary } from '../poolSource';
import { RelayerModel } from '../relayer';
import { JoinModel, JoinPoolRequest } from './join';
import { ExitModel, ExitPoolRequest } from './exit';
import { SwapModel, BatchSwapRequest, SwapRequest } from './swap';
import { UnwrapModel, UnwrapRequest } from './unwrap';

export class PoolModel {
  joinModel: JoinModel;
  exitModel: ExitModel;
  swapModel: SwapModel;
  unwrapModel: UnwrapModel;

  constructor(private relayerModel: RelayerModel) {
    this.joinModel = new JoinModel(relayerModel);
    this.exitModel = new ExitModel(relayerModel);
    this.swapModel = new SwapModel(relayerModel);
    this.unwrapModel = new UnwrapModel(relayerModel);
  }

  async doJoin(
    joinPoolRequest: JoinPoolRequest,
    pools: PoolDictionary
  ): Promise<[string[], string[]]> {
    return this.joinModel.doJoinPool(joinPoolRequest, pools);
  }

  async doExit(
    exitPoolRequest: ExitPoolRequest,
    pools: PoolDictionary
  ): Promise<[string[], string[]]> {
    return this.exitModel.doExitPool(exitPoolRequest, pools);
  }

  async doBatchSwap(
    batchSwapRequest: BatchSwapRequest,
    pools: PoolDictionary
  ): Promise<string[]> {
    return this.swapModel.doBatchSwap(batchSwapRequest, pools);
  }

  async doSingleSwap(
    swapRequest: SwapRequest,
    pools: PoolDictionary
  ): Promise<string[]> {
    return this.swapModel.doSingleSwap(swapRequest, pools);
  }

  async doUnwrap(
    unwrapRequest: UnwrapRequest,
    pools: PoolDictionary
  ): Promise<[string[], string[]]> {
    return this.unwrapModel.doUnwrap(unwrapRequest, pools);
  }
}
