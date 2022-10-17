export type Address = string;

export type CreatePoolParameters = {
  contractAddress: string;
  name: string;
  symbol: string;
  tokenAddresses: string[];
  amplificationParameter: number;
  rateProviders: string[];
  tokenRateCacheDurations: number[];
  exemptFromYieldProtocolFeeFlags: boolean[];
  swapFee: string | number;
  owner: Address;
};
