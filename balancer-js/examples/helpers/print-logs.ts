/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
import dotenv from 'dotenv';
import { Contract } from '@ethersproject/contracts';
import { formatEther } from '@ethersproject/units';
import { shortenAddress } from '.';

dotenv.config();
const { ETHERSCAN_API_KEY } = process.env;

const fetchAbi = (contract: string) => {
  const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contract}&apikey=${ETHERSCAN_API_KEY}`;
  return fetch(url);
};

const abis = new Map<string, any>();

const decodeLog = async (log: any, abi: any) => {
  let decoded;
  const contract = new Contract(log.address, abi);

  try {
    decoded = contract.interface.parseLog(log);
  } catch (err) {
    console.log('failed for', log.address);
  }

  return decoded;
};

export const decodeLogs = async (logs: any[]) => {
  const decodedLogs: any[] = [];
  let abi: any;

  for (const log of logs) {
    abi = abis.get(log.address);
    if (!abi) {
      abi = await fetchAbi(log.address)
        .then((res) => res.json())
        .then((res) => JSON.parse(res.result));
      abis.set(log.address, abi);
    }
    const decoded = await decodeLog(log, abi);
    if (decoded) decodedLogs.push({ ...decoded, address: log.address });
  }

  return decodedLogs;
};

export const printLogs = async (logs: any[]) => {
  const decodedLogs = await decodeLogs(logs);

  const printSwap = (log: any) => {
    console.table(
      [log.args].map(({ poolId, tokenIn, tokenOut, amountIn, amountOut }) => ({
        poolId: shortenAddress(poolId),
        tokenIn: shortenAddress(tokenIn),
        tokenOut: shortenAddress(tokenOut),
        amountIn: formatEther(amountIn),
        amountOut: formatEther(amountOut),
      }))
    );
  };

  const printPoolBalanceChanged = (log: any) => {
    console.log(log.args.poolId);
    console.table({
      tokens: log?.args.tokens.map(shortenAddress),
      deltas: log?.args.deltas.map((delta: string) => formatEther(delta)),
    });
  };

  const printInternalBalanceChanged = (log: any) => {
    const { user, token, delta } = log.args;
    console.log('\x1b[32m%s\x1b[0m', 'User: ', user);
    console.log('\x1b[32m%s\x1b[0m', 'Token:', token);
    console.log('\x1b[32m%s\x1b[0m', 'Delta:', formatEther(delta));
  };

  const printTransfer = (log: any) => {
    console.log(log.address);
    const { from, to, value, src, dst, wad, _to, _from, _value } = log.args;
    console.log('\x1b[32m%s\x1b[0m', 'From: ', from || _from || src);
    console.log('\x1b[32m%s\x1b[0m', 'To:   ', to || _to || dst);
    console.log(
      '\x1b[32m%s\x1b[0m',
      'Value:',
      formatEther(value || _value || wad)
    );
  };

  decodedLogs.map((log: any) => {
    console.log('-'.repeat(80));
    console.log(log.name);
    if (log.name === 'Swap') {
      printSwap(log);
    } else if (log.name === 'PoolBalanceChanged') {
      printPoolBalanceChanged(log);
    } else if (log.name === 'InternalBalanceChanged') {
      printInternalBalanceChanged(log);
    } else if (log.name === 'Transfer') {
      printTransfer(log);
    }
  });
};
