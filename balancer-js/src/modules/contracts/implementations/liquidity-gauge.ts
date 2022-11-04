import { Provider } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import LiquidityGaugeAbi from '@/lib/abi/LiquidityGaugeV5.json';

export class LiquidityGauge {

    instance: Contract;

    constructor(address: string, provider: Provider) {
        this.instance = new Contract(address, LiquidityGaugeAbi, provider);
    }

    stake(amount: BigNumber) {
    }

}