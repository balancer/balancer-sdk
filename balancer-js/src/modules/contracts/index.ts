import { Multicall, Vault } from '@/contracts/generated';
import { Contract } from 'ethers';

export interface ContractList {
    vault: Vault;
    multicall: Multicall;
    lidoRelayer?: Contract;
}

export interface ContractAddressList {
    vault: string;
    multicall: string;
    lidoRelayer?: string;
}
