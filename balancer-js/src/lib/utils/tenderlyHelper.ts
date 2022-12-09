import axios from 'axios';
import { MaxInt256 } from '@ethersproject/constants';
import { networkAddresses } from '@/lib/constants/config';
import { BalancerTenderlyConfig } from '@/types';

type StateOverrides = {
  [address: string]: { value: { [key: string]: string } };
};

export default class TenderlyHelper {
  private vaultAddress;
  private tenderlyUrl;
  private opts?;
  private blockNumber: number | undefined;

  constructor(
    private chainId: number,
    tenderlyConfig?: BalancerTenderlyConfig
  ) {
    const { contracts } = networkAddresses(this.chainId);
    this.vaultAddress = contracts.vault as string;
    if (tenderlyConfig?.user && tenderlyConfig?.project) {
      this.tenderlyUrl = `https://api.tenderly.co/api/v1/account/${tenderlyConfig.user}/project/${tenderlyConfig.project}/`;
    } else {
      this.tenderlyUrl = 'https://api.balancer.fi/tenderly/';
    }

    if (tenderlyConfig?.accessKey) {
      this.opts = {
        headers: {
          'X-Access-Key': tenderlyConfig.accessKey,
        },
      };
    }

    this.blockNumber = tenderlyConfig?.blockNumber;
  }

  simulateMulticall = async (
    to: string,
    data: string,
    userAddress: string,
    tokens: string[]
  ): Promise<string> => {
    const tokensOverrides = await this.encodeBalanceAndAllowanceOverrides(
      userAddress,
      tokens
    );
    const relayerApprovalOverride = await this.encodeRelayerApprovalOverride(
      userAddress,
      to
    );
    const encodedStateOverrides = {
      ...tokensOverrides,
      ...relayerApprovalOverride,
    };
    return this.simulateTransaction(
      to,
      data,
      userAddress,
      encodedStateOverrides
    );
  };

  simulateTransaction = async (
    to: string,
    data: string,
    userAddress: string,
    encodedStateOverrides: StateOverrides
  ): Promise<string> => {
    // Map encoded-state response into simulate request body by replacing property names
    const state_objects = Object.fromEntries(
      Object.keys(encodedStateOverrides).map((address) => {
        // Object.fromEntries require format [key, value] instead of {key: value}
        return [address, { storage: encodedStateOverrides[address].value }];
      })
    );

    const body = {
      // -- Standard TX fields --
      network_id: this.chainId.toString(),
      block_number: this.blockNumber,
      from: userAddress,
      to,
      input: data,
      // gas: 8000000,
      // gas_price: '0',
      // value: '0',
      // -- Simulation config (tenderly specific) --
      save_if_fails: true,
      // save: true,
      simulation_type: 'quick', // remove this while developing/debugging
      state_objects,
    };

    const SIMULATE_URL = this.tenderlyUrl + 'simulate';

    const resp = await axios.post(SIMULATE_URL, body, this.opts);

    const simulatedTransactionOutput =
      resp.data.transaction.transaction_info.call_trace.output;

    return simulatedTransactionOutput;
  };

  // Encode relayer approval state override
  encodeRelayerApprovalOverride = async (
    userAddress: string,
    relayerAddress: string
  ): Promise<StateOverrides> => {
    const stateOverrides: StateOverrides = {
      [`${this.vaultAddress}`]: {
        value: {
          [`_approvedRelayers[${userAddress}][${relayerAddress}]`]:
            true.toString(),
        },
      },
    };

    const encodedStateOverrides = await this.requestStateOverrides(
      stateOverrides
    );

    return encodedStateOverrides;
  };

  // Encode token balances and allowances overrides to max value
  encodeBalanceAndAllowanceOverrides = async (
    userAddress: string,
    tokens: string[]
  ): Promise<StateOverrides> => {
    if (tokens.length === 0) return {};

    // Create balances and allowances overrides for each token address provided
    let stateOverrides: StateOverrides = {};
    tokens.forEach(
      (token) =>
        (stateOverrides = {
          ...stateOverrides,
          [`${token}`]: {
            value: {
              [`_balances[${userAddress}]`]: MaxInt256.toString(),
              [`_allowances[${userAddress}][${this.vaultAddress}]`]:
                MaxInt256.toString(),
              [`balanceOf[${userAddress}]`]: MaxInt256.toString(),
              [`allowance[${userAddress}][${this.vaultAddress}]`]:
                MaxInt256.toString(),
              [`balances[${userAddress}]`]: MaxInt256.toString(),
              [`allowed[${userAddress}][${this.vaultAddress}]`]:
                MaxInt256.toString(),
            },
          },
        })
    );

    const encodedStateOverrides = await this.requestStateOverrides(
      stateOverrides
    );

    if (
      Object.keys(encodedStateOverrides).some((k) => {
        return Object.keys(encodedStateOverrides[k].value).length !== 2;
      })
    )
      throw new Error(
        "Couldn't encode state overrides - states should match the ones in the contracts"
      );

    return encodedStateOverrides;
  };

  private requestStateOverrides = async (
    stateOverrides: StateOverrides
  ): Promise<StateOverrides> => {
    const ENCODE_STATES_URL = this.tenderlyUrl + 'contracts/encode-states';
    const body = {
      networkID: this.chainId.toString(),
      stateOverrides,
    };

    const encodedStatesResponse = await axios.post(
      ENCODE_STATES_URL,
      body,
      this.opts
    );
    const encodedStateOverrides = encodedStatesResponse.data
      .stateOverrides as StateOverrides;

    if (
      !encodedStateOverrides ||
      Object.keys(encodedStateOverrides).length !==
        Object.keys(stateOverrides).length
    )
      throw new Error(
        "Couldn't encode state overrides - contracts should be verified and whitelisted on Tenderly"
      );

    return encodedStateOverrides;
  };
}
