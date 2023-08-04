import { formatBytes32String } from '@ethersproject/strings';
import { keccak256 } from '@ethersproject/solidity';
import { defaultAbiCoder } from '@ethersproject/abi';
import { formatFixed } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { GyroConfig, GyroConfig__factory } from '@/contracts';

export interface GyroConfigRepository {
  getGyroProtocolFee(poolAddress: string): Promise<number>;
}

export class GyroConfigRepositoryImpl implements GyroConfigRepository {
  gyroConfig: GyroConfig;

  constructor(private gyroConfigAddress: string, provider: Provider) {
    this.gyroConfig = GyroConfig__factory.connect(gyroConfigAddress, provider);
  }

  async getGyroProtocolFee(poolAddress: string): Promise<number> {
    let fee = 0;
    const protocolFeePercKey = formatBytes32String('PROTOCOL_SWAP_FEE_PERC');

    const gyroPoolTypeKey = formatBytes32String('E-CLP');
    const encodedPoolSpecificKey = keccak256(
      ['bytes'],
      [
        defaultAbiCoder.encode(
          ['bytes32', 'uint256'],
          [protocolFeePercKey, poolAddress]
        ),
      ]
    );

    const encodedPoolTypeKey = keccak256(
      ['bytes'],
      [
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32'],
          [protocolFeePercKey, gyroPoolTypeKey]
        ),
      ]
    );
    const hasPoolSpecificKey = await this.gyroConfig.hasKey(
      encodedPoolSpecificKey
    );
    const hasPoolTypeKey = await this.gyroConfig.hasKey(encodedPoolTypeKey);
    const hasDefaultKey = await this.gyroConfig.hasKey(protocolFeePercKey);
    if (hasPoolSpecificKey) {
      fee = parseFloat(
        formatFixed(await this.gyroConfig.getUint(encodedPoolSpecificKey), 18)
      );
    } else if (hasPoolTypeKey) {
      fee = parseFloat(
        formatFixed(await this.gyroConfig.getUint(encodedPoolTypeKey), 18)
      );
    } else if (hasDefaultKey) {
      fee = parseFloat(
        formatFixed(await this.gyroConfig.getUint(protocolFeePercKey), 18)
      );
    }
    return fee;
  }
}
