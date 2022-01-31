import { Fragment, JsonFragment } from '@ethersproject/abi';
import { Provider } from '@ethersproject/providers';
import { Multicaller } from './multiCaller';
import { BalancerNetworkConfig } from '@/types';

// TODO: decide whether we want to trim these ABIs down to the relevant functions
import vaultAbi from '../../abi/Vault.json';
import aTokenRateProvider from '../../abi/StaticATokenRateProvider.json';
import weightedPoolAbi from '../../abi/WeightedPool.json';
import stablePoolAbi from '../../abi/StablePool.json';
import elementPoolAbi from '../../abi/ConvergentCurvePool.json';
import linearPoolAbi from '../../abi/LinearPool.json';

export class MulticallerFactory {
    private static readonly DEFAULT_ABI: Array<
        Fragment | JsonFragment | string
    > = [
        ...new Map(
            [
                ...vaultAbi,
                ...aTokenRateProvider,
                ...weightedPoolAbi,
                ...stablePoolAbi,
                ...elementPoolAbi,
                ...linearPoolAbi,
            ].map((v) => [v.name, v]) // Remove duplicate entries using their names
        ).values(),
    ];

    public static create(
        networkConfig: BalancerNetworkConfig,
        provider: Provider,
        abi:
            | string
            | Array<
                  Fragment | JsonFragment | string
              > = MulticallerFactory.DEFAULT_ABI
    ): Multicaller {
        return new Multicaller(networkConfig.multicall, provider, abi);
    }
}
