// import { Sor } from '@/modules/sor/sor.module';
// import { BalancerSdkConfig, Pool } from '@/types';
// import { SOR } from '@balancer-labs/sor';
// import { PoolAttribute, PoolProvider } from './provider.interface';

// export class SORPoolProvider implements PoolProvider {
//     readonly sor: SOR;
//     initialized: boolean;

//     constructor(private config: BalancerSdkConfig) {
//         this.sor = new Sor(this.config);
//         this.initialized = false;
//     }

//     async init(): Promise<boolean> {
//         this.initialized = await this.sor.fetchPools();
//         return this.initialized;
//     }

//     async checkInitialized(): Promise<void> {
//         if (!this.initialized) {
//             await this.init();
//             if (!this.initialized) {
//                 throw new Error('Cannot initialize SOR Provider');
//             }
//         }
//     }

//     async find(id: string): Promise<Pool | undefined> {
//         await this.checkInitialized();
//         return this.sor.getPools().find((pool) => {
//             return pool.id.toLowerCase() === id.toLowerCase();
//         });
//     }

//     async findBy(
//         attribute: PoolAttribute,
//         value: string
//     ): Promise<Pool | undefined> {
//         await this.checkInitialized();
//         return this.sor.getPools().find((pool) => {
//             return pool[attribute] === value;
//         });
//     }
// }
