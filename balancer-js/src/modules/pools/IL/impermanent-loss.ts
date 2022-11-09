import {BalancerSDK} from "@/modules/sdk.module";
import {PoolToken, Price} from "@/types";

type Asset = {
    priceDelta: number;
    weight: number;
}

let balancer: BalancerSDK;

const getPricesAt = async (tokens: PoolToken[] | undefined, timestamp: number): Promise<Price[]> => {
    return [];
}

const getAssets = async (tokens: PoolToken[] | undefined, prices: Price[]): Promise<Asset[]> => {
    return [];
}

const getJoinTimestamp = async (poolId: string, address: string): Promise<number> => {
  return Date.now();
}



export const calculateIL = async (poolId: string, userAddress: string): Promise<number> => {
    const pool = await balancer.pools.find(poolId);
    const joinTimestamp = await getJoinTimestamp(poolId, userAddress);
    const prices = await getPricesAt(pool?.tokens, joinTimestamp);
    const assets = await getAssets(pool?.tokens, prices);

    const poolValue = assets.reduce((result, asset) => result * Math.pow(asset.priceDelta, asset.weight), 0);
    const holdValue = assets.reduce((result, asset) => result + Math.pow(asset.priceDelta, asset.weight), 0);
    return poolValue/holdValue - 1;
}

