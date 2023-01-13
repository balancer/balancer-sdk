import '@nomiclabs/hardhat-ethers';
import dotenv from "dotenv";

dotenv.config({path: `${__dirname}/.env`})
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const { ALCHEMY_URL } = process.env;

export default {
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: ALCHEMY_URL,
        blockNumber: 16361609
      },
      chainId: 1
    },
  },
};
