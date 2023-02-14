import * as dotenv from 'dotenv';
import { ADDRESSES } from '@/test/lib/constants';
import { Network } from '@/lib/constants';
import ERC20Abi from '@/lib/abi/ERC20.json';
import { ethers } from 'hardhat';

dotenv.config();

////////////////////////////////////////////////
//////////////////// INPUTS ////////////////////
const network = Network.BSCTESTNET;
const amountToSend = '3'; // This should be a number
const tokenSymbol = 'USDC';
const recipientAddress = '0x565baefe8796e46c5743bb02f0ed267e454bdac3';
//////////////// END OF INPUTS /////////////////
////////////////////////////////////////////////

let rpcUrl = `${process.env.ALCHEMY_URL_GOERLI}`;
export let wrappedNativeAsset = '0xdfcea9088c8a88a76ff74892c1457c17dfeef9c1';

if ((network as Network) == Network.BSCTESTNET) {
  rpcUrl = `${process.env.GETBLOCK_URL_TEST}`;
  wrappedNativeAsset = '0xE906CBeCd4A17DF62B8d6c8C82F3882af25295f5';
} else if ((network as Network) == Network.BSC) {
  rpcUrl = `${process.env.GETBLOCK_URL}`;
  wrappedNativeAsset = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
}

const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(`${process.env.TRADER_KEY}`, provider);

// GOERLI USDC address: '0x1f1f156E0317167c11Aa412E3d1435ea29Dc3cCE'
// GOERLI USDT address: '0xe0C9275E44Ea80eF17579d33c55136b7DA269aEb'
//================================================================
// BSCTESTNET USDC address: '0x64544969ed7EBf5f083679233325356EbE738930'
// BSCTESTNET USDT address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'

const tokenAddress = ADDRESSES[network][tokenSymbol].address;
const ERC20Contract = new ethers.Contract(tokenAddress, ERC20Abi, wallet);

async function callsToContract() {
  const decimals = await ERC20Contract.decimals();
  const numberOfTokens = ethers.utils.parseUnits(amountToSend, decimals);

  const senderAddress = await wallet.getAddress();
  let balanceERC20 = await ERC20Contract.balanceOf(senderAddress);

  const tx = await ERC20Contract.transfer(recipientAddress, numberOfTokens, {
    // gasLimit: 250000,
    // gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits('20', 'gwei')),
  });

  console.log(
    'Sending ' +
      amountToSend +
      ' ' +
      ADDRESSES[network][tokenSymbol].symbol +
      ' in tx: ' +
      tx.hash
  );
  console.log(
    'Initial sender balance: ' + balanceERC20 / Math.pow(10, decimals)
  );

  const txReceipt = await tx.wait();

  console.log('Transaction included in block: ' + txReceipt.blockNumber);

  balanceERC20 = await ERC20Contract.balanceOf(senderAddress);

  console.log('Final sender balance: ' + balanceERC20 / Math.pow(10, decimals));
}

export default callsToContract();
