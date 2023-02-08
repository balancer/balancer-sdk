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
    },
    goerli: {
      url: process.env.ALCHEMY_URL_GOERLI,
      accounts: [process.env.TRADER_KEY],
      allowUnlimitedContractSize: true,
    },
  },
};
