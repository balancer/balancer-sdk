import { formatBytes32String } from '@ethersproject/strings';
import { keccak256 } from '@ethersproject/solidity';
import { defaultAbiCoder } from '@ethersproject/abi';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { GyroConfig, GyroConfig__factory, Multicall } from '@/contracts';
import { GyroConfigInterface } from '@/contracts/GyroConfig';

export interface GyroConfigRepository {
  getGyroProtocolFee(poolAddress: string): Promise<number>;
}

const protocolFeePercKey = formatBytes32String('PROTOCOL_SWAP_FEE_PERC');
const gyroPoolTypeKey = formatBytes32String('E-CLP');
const encodedPoolTypeKey = keccak256(
  ['bytes'],
  [
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32'],
      [protocolFeePercKey, gyroPoolTypeKey]
    ),
  ]
);

export class GyroConfigRepositoryImpl implements GyroConfigRepository {
  gyroConfigInterface: GyroConfigInterface;
  gyroConfig: GyroConfig;

  constructor(
    private gyroConfigAddress: string,
    private multicall: Multicall,
    provider: Provider
  ) {
    this.gyroConfigInterface = GyroConfig__factory.createInterface();
    this.gyroConfig = GyroConfig__factory.connect(gyroConfigAddress, provider);
  }

  async getGyroProtocolFee(poolAddress: string): Promise<number> {
    let fee;
    const encodedPoolSpecificKey = keccak256(
      ['bytes'],
      [
        defaultAbiCoder.encode(
          ['bytes32', 'uint256'],
          [protocolFeePercKey, poolAddress]
        ),
      ]
    );
    const payload = [
      {
        target: this.gyroConfigAddress,
        callData: this.gyroConfigInterface.encodeFunctionData('hasKey', [
          encodedPoolSpecificKey,
        ]),
      },
      {
        target: this.gyroConfigAddress,
        callData: this.gyroConfigInterface.encodeFunctionData('hasKey', [
          encodedPoolTypeKey,
        ]),
      },
      {
        target: this.gyroConfigAddress,
        callData: this.gyroConfigInterface.encodeFunctionData('hasKey', [
          protocolFeePercKey,
        ]),
      },
    ];
    const [, [hasSpecificKeyHex, hasPoolTypeKeyHex, hasDefaultKeyHex]] =
      await this.multicall.callStatic.aggregate(payload);
    const hasSpecificKey = BigNumber.from(hasSpecificKeyHex).eq(1);
    const hasPoolTypeKey = BigNumber.from(hasPoolTypeKeyHex).eq(1);
    const hasDefaultKey = BigNumber.from(hasDefaultKeyHex).eq(1);
    if (hasSpecificKey) {
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
    } else {
      fee = 0;
    }
    return fee;
  }
}
