import { PoolDictionary } from '../poolSource';
import { RelayerModel } from '../relayer';
import { JoinModel, JoinPoolRequest } from './join';
import { ExitModel, ExitPoolRequest } from './exit';
import { SwapModel, BatchSwapRequest } from './swap';

export class PoolModel {
  joinModel: JoinModel;
  exitModel: ExitModel;
  swapModel: SwapModel;

  constructor(private relayerModel: RelayerModel) {
    this.joinModel = new JoinModel(relayerModel);
    this.exitModel = new ExitModel(relayerModel);
    this.swapModel = new SwapModel(relayerModel);
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
}
