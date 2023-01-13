import * as dotenv from "dotenv"; import { Network } from "@/lib/constants";

dotenv.config();

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8000';
const alchemyRpcUrl = `${ process.env.ALCHEMY_URL_GOERLI }`;
const blockNumber = 8200000;
export async function initJoinWeightedPool() {