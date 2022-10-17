export type Address = string;

export type CreatePoolParameters = {
  contractAddress: string;
  name: string;
  symbol: string;
  tokenAddresses: string[];
  amplificationParameter: number | string;
  rateProviders: string[];
  tokenRateCacheDurations: number[] | string[];
  exemptFromYieldProtocolFeeFlags: boolean[];
  swapFee: string | number;
  owner: Address;
};
