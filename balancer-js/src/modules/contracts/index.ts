import { Contract } from 'ethers';

export { Vault } from './vault';
export { Multicall } from './multicall';

export interface ContractList {
    vault: Contract;
    multicall: Contract;
    lidoRelayer?: Contract;
}

export interface ContractAddressList {
    vault: string;
    multicall: string;
    lidoRelayer?: string;
}
