import '@nomiclabs/hardhat-ethers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  networks: {
    hardhat: {
      chainId: 1,
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: process.env.ALCHEMY_URL_GOERLI,
      accounts: [process.env.TRADER_KEY],
      allowUnlimitedContractSize: true,
    },
    bsc: {
      url: process.env.GETBLOCK_URL,
      accounts: [process.env.TRADER_KEY],
      allowUnlimitedContractSize: true,
    },
    bsctestnet: {
      url: process.env.GETBLOCK_URL_TEST,
      accounts: [process.env.TRADER_KEY],
      allowUnlimitedContractSize: true,
    },
  },
};
