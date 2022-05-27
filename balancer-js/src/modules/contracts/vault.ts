import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import VaultAbi from '@/lib/abi/Vault.json';

export const Vault = (address: string, provider?: Provider): Contract =>
    new Contract(address, VaultAbi, provider);
