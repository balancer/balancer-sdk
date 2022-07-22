import { defaultAbiCoder } from '@ethersproject/abi';
import { Provider } from '@ethersproject/providers';
import { StaBal3Builder } from './bbausd2-migrations/stabal3';

export class MigrateStaBal3 {
  private builder: StaBal3Builder;

  constructor(private network: 1 | 5, private provider: Provider) {
    this.builder = new StaBal3Builder(network);
  }

  /*
    From Nico -
    the flow is:
    a) relayer uses allowance to transfer staked bpt from user to itself
    b) relayer returns staked bpt to get bpt back
    (steps a) and b) are done automatically by the relayer)
    c) relayer uses the bpt it got to exit the pool
    d) relayer swaps linear bpt into stables, and stables into linear v2 bpt
    e) relayer joins bb-a-usd 2
    f) relayer stakes bb-a-usd-bpt
    g) relayer sends staked bpt to user
    (steps f) and g) are done automatically by the relayer)
    (if the relayer is not yet approved by the user, there's one more step at the beginning where the relayer submits the user signature to approve itself)
  */

  /**
   * Statically calls migration action to find final BPT amount returned.
   *
   * @param userAddress
   * @param amount Amount of staBal3 BPT.
   * @param authorisation Approving relayer to access tokens in vault.
   * @returns BPT amount from swap joining a pool.
   */
  async queryMigration(
    userAddress: string,
    amount: string,
    authorisation: string,
    staked: boolean
  ): Promise<{ to: string; data: string; decode: (output: string) => string }> {
    const request = this.builder.calldata(
      amount,
      '0',
      userAddress,
      staked,
      authorisation
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output) =>
        defaultAbiCoder.decode(['int256[]'], output[2])[3].toString(),
    };

    // const tx = await this.provider.call(request);

    // // BPT amount from batchSwap call
    // return defaultAbiCoder.decode(['int256[]'], tx[2])[3].toString();
  }

  buildMigration(
    userAddress: string,
    amount: string,
    signature: string,
    staked: boolean
  ): {
    to: string;
    data: string;
  } {}
}
