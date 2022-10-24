import dotenv from 'dotenv';
import axios from 'axios';
import { MaxUint256 } from '@ethersproject/constants';
import { networkAddresses } from '@/lib/constants/config';

dotenv.config();
const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

export const simulateTransaction = async (
  userAddress: string,
  encodedCallData: string,
  tokensIn: string[],
  chainId: number
): Promise<string> => {
  const { contracts } = networkAddresses(chainId);
  const relayerAddress = contracts.relayer as string;
  const vaultAddress = contracts.vault as string;

  let staticResult = '';
  try {
    let stateOverrides: {
      [address: string]: { value: { [key: string]: string } };
    } = {};
    tokensIn.forEach(
      (tokenIn) =>
        (stateOverrides = {
          ...stateOverrides,
          [`${tokenIn}`]: {
            value: {
              [`_balances[${userAddress}]`]: MaxUint256.toString(),
              [`_allowances[${userAddress}][${vaultAddress}]`]:
                MaxUint256.toString(),
            },
          },
        })
    );

    console.log(stateOverrides);

    const ENCODE_STATES_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/contracts/encode-states`;
    const encodedStatesBody = {
      networkID: chainId.toString(),
      stateOverrides,
    };
    // const oda = {
    //   networkID: chainId.toString(),
    //   stateOverrides: {
    //     '0x14468fd5e1de5a5a4882fa5f4e2217c5a8ddcadb': {
    //       value: {
    //         '_balances[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]':
    //           '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    //         '_allowances[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266][0xBA12222222228d8Ba445958a75a0704d566BF2C8]':
    //           '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    //       },
    //     },
    //     '0x398106564948feeb1fedea0709ae7d969d62a391': {
    //       value: {
    //         '_balances[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]':
    //           '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    //         '_allowances[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266][0xBA12222222228d8Ba445958a75a0704d566BF2C8]':
    //           '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    //       },
    //     },
    //   },
    // };
    // console.log(oda);

    const opts = {
      headers: {
        'X-Access-Key': TENDERLY_ACCESS_KEY as string,
      },
    };

    const encodedStatesResponse = await axios.post(
      ENCODE_STATES_URL,
      encodedStatesBody,
      opts
    );
    const encodedStateOverrides = encodedStatesResponse.data.stateOverrides;

    console.log(encodedStateOverrides);

    // Map encoded-state response into simulate request body by replacing property names
    const state_objects = Object.fromEntries(
      Object.keys(encodedStateOverrides).map((address) => {
        // Object.fromEntries require format [key, value] instead of {key: value}
        return [address, { storage: encodedStateOverrides[address].value }];
      })
    );

    console.log(state_objects);

    const body = {
      // standard TX fields
      network_id: chainId.toString(),
      from: userAddress,
      to: relayerAddress,
      input: encodedCallData,
      // gas: 8000000,
      // gas_price: '0',
      // value: '0',
      // simulation config (tenderly specific)
      save_if_fails: true,
      // save: true,
    };

    const simulateBody = { ...body, state_objects };

    const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;

    const resp = await axios.post(SIMULATE_URL, simulateBody, opts);

    staticResult = resp.data.transaction.transaction_info.call_trace.output;
  } catch (error) {
    const errorMessage = (error as Error).message;
    throw new Error(errorMessage);
  }
  return staticResult;
};
