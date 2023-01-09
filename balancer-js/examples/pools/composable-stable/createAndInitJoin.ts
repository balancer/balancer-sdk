import * as dotenv from 'dotenv';
import {
  JsonRpcProvider,
  JsonRpcSigner,
  Log,
  TransactionReceipt,
} from '@ethersproject/providers';
import { BalancerSDK, Network, PoolType } from '../../../src';
// @ts-ignore
import composableStableFactoryAbi from '../../../src/lib/abi/ComposableStableFactory.json';
// @ts-ignore
import composableStablePoolAbi from '../../../src/lib/abi/ComposableStable.json';
// @ts-ignore
import { ethers } from 'hardhat';
import { Interface, LogDescription } from '@ethersproject/abi';
import { getNetworkConfig } from '@/modules/sdk.helpers';
import { Contract } from '@ethersproject/contracts';
import { networkAddresses } from '@/lib/constants/config';
import { approveToken, getBalances, setTokenBalance } from '@/test/lib/utils';
import { AddressZero, MaxUint256 } from '@ethersproject/constants';
import { parseEther } from '@ethersproject/units';
// @ts-ignore
import { ADDRESSES } from '@/test/lib/constants';
import { parseFixed } from '@ethersproject/bignumber';
import { utils } from 'ethers';

dotenv.config();

const name = 'My-Test-Pool-Name';

const symbol = 'My-Test-Pool-Symbol';

const network = Network.GOERLI;

const addresses = ADDRESSES[network];

const WETH_address = addresses.WETH.address;
const MAI_address = addresses.MAI.address;
const tokenAddresses = [MAI_address, WETH_address];

const amplificationParameter = '1';

const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];

const tokenRateCacheDurations = ['0', '0'];

const exemptFromYieldProtocolFeeFlags = [false, false];

const swapFee = '0.01';
const owner = '0x817b6923f3cB53536859b1f01262d0E7f513dB78';
const contractAddress = '0x85a80afee867adf27b50bdb7b76da70f1e853062';

// const forkSetupLocalNode = async (signer: JsonRpcSigner) => {
//   const tokens = tokenAddresses;
//
//   const slots = [addresses.MAI.slot, addresses.WETH.slot];
//   const balances = [
//     parseFixed('100', 18).toString(),
//     parseFixed('100', 18).toString(),
//   ];
//
//   // await forkSetup(signer, tokens, slots, balances, jsonRpcUrl); // TODO: FIX "Headers Timeout Error" for hardhat_reset transaction
//
//   for (let i = 0; i < tokens.length; i++) {
//     // Set initial account balance for each token that will be used to join pool
//     await setTokenBalance(signer, tokens[i], slots[i], balances[i], false);
//
//     // Approve appropriate allowances so that vault contract can move tokens
//     await approveToken(tokens[i], MaxUint256.toString(), signer);
//   }
// };

async function createComposableStablePool() {
  // const rpcUrl = `https://mainnet.infura.io/v3/444153f7f8f2499db7be57a11b1f696e`;
  // const rpcUrl = 'https://goerli.gateway.tenderly.co/4Rzjgxiyt0WELoXRl1312Q'
  const rpcUrl = 'http://localhost:8000';
  const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    rpcUrl,
    'goerli'
  );

  const signer = provider.getSigner();

  const sdkConfig = {
    network,
    rpcUrl,
  };

  // await forkSetupLocalNode(signer);

  const balancer = new BalancerSDK(sdkConfig);
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );
  const { to, data } = composableStablePoolFactory.create({
    contractAddress,
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFee,
    owner,
  });

  const signerAddress = await signer.getAddress();

  const tx = await signer.sendTransaction({
    from: signerAddress,
    to,
    data,
    gasLimit: 6721975,
  });

  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );

  const composableStableFactoryInterface = new Interface(
    composableStableFactoryAbi
  );

  const poolCreationEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => {
      return log.address.toUpperCase() === contractAddress.toUpperCase();
    })
    .map((log) => {
      try {
        return composableStableFactoryInterface.parseLog(log);
      } catch (error) {
        console.error(error);
        return null;
      }
    })
    .find((parsedLog) => parsedLog?.name === 'PoolCreated');
  //
  // if (!poolCreationEvent) return console.error("There's no event");
  // const composableStablePoolInterface = new Interface(composableStablePoolAbi);
  //
  // const poolAddress: string = poolCreationEvent.args.pool;
  // const pool = new Contract(
  //   poolAddress,
  //   composableStablePoolInterface,
  //   provider
  // );
  // const poolId = await pool.getPoolId();
  //
  // const networkConfig = getNetworkConfig(sdkConfig);
  //
  // const {
  //   tokens: { wrappedNativeAsset },
  // } = networkAddresses(networkConfig.chainId);
  //
  // const iERC20 = [
  //   'function approve(address,uint256) nonpayable',
  //   'function balanceOf(address) view returns(uint)',
  // ];
  // const tokenBalances = (
  //   await getBalances(tokenAddresses, signer, signerAddress)
  // ).map((b) => b.toString());
  //
  // console.log('tokenBalances: ' + tokenBalances);
  //
  // const initJoinParams = composableStablePoolFactory.buildInitJoin({
  //   joiner: signerAddress,
  //   poolId,
  //   poolAddress,
  //   tokensIn: tokenAddresses,
  //   amountsIn: [
  //     utils.parseEther('1.0').toString(),
  //     utils.parseEther('1.0').toString(),
  //   ],
  //   wrappedNativeAsset,
  // });
  //
  // const erc20 = new Contract(AddressZero, iERC20);
  //
  // // Approve vault for seeder
  // await Promise.all(
  //   Object.values(tokenAddresses).map((address) => {
  //     return erc20
  //       .attach(address)
  //       .connect(signer)
  //       .approve(to, parseEther('100').toString());
  //   })
  // );
  //
  // const initJoinTx = await signer.sendTransaction({
  //   // TODO: FIX something that's causing BAL#506 error
  //   to: initJoinParams.to,
  //   data: initJoinParams.data,
  //   gasLimit: 6721975,
  // });
  //
  // await initJoinTx.wait();
}

createComposableStablePool().then((r) => r);
