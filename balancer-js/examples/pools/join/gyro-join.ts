import { JsonRpcProvider } from "@ethersproject/providers";
import { setTokenBalance, approveToken } from "@/../examples/helpers/erc20";
import { formatEther, parseEther } from "@ethersproject/units";
import { defaultAbiCoder } from "@ethersproject/abi";
import { BalancerHelpers__factory, Vault__factory } from "@/contracts";
import { queryJoinParams } from "@/modules/pools/queries/types";
import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";

const bn = (value: number) => parseEther(`${value}`)
const evm = (value: BigNumber | number) => String(parseEther(`${value}`))
const hmn = (value: BigNumber | string) => Number(formatEther(value))

const chainId = 137
const poolId = '0xf0ad209e2e969eaaa8c882aac71f02d8a047d5c2000200000000000000000b49'
const provider = new JsonRpcProvider('http://127.0.0.1:8545', chainId)
const signer = provider.getSigner()
const sMatic = '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4'
const wMatic = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'
let signerAddress: string

const balancerHelpers = BalancerHelpers__factory.connect(
    '0x239e55f427d44c3cc793f49bfb507ebe76638a2b',
    signer
);

const vault = Vault__factory.connect(
    '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    signer
);

const buildParams = (
    sender: string,
    assets = [wMatic, sMatic],
    limits = [],
    bptOut = evm(1)
) => [
    poolId,
    sender,
    sender,
    {
        assets,
        maxAmountsIn: limits,
        userData: defaultAbiCoder.encode(
            ['uint256', 'uint256'],
            [3, bptOut]
        ),
        fromInternalBalance: false,
    },
] as queryJoinParams;

const join = async () => {
    // Build join
    const params = buildParams(signerAddress, [wMatic, sMatic]);

    // Query join
    const join = await balancerHelpers.callStatic.queryJoin(...params)
    console.log('Limits:', join.amountsIn.map(hmn))

    // Set maxAmountsIn
    params[3].maxAmountsIn = join.amountsIn

    // Join pool
    const { events } = await (await vault.joinPool(...params)).wait();
    const poolBalanceChanged = events?.find((e) => e.event === 'PoolBalanceChanged')
    const deltas = poolBalanceChanged?.args?.deltas

    console.log('Deltas:', deltas.map(hmn))
};

const joinWithMatic = async () => {
    // Build join
    const params = buildParams(signerAddress, [AddressZero, sMatic]);

    // Query join
    const join = await balancerHelpers.callStatic.queryJoin(...params)
    console.log('Limits:', join.amountsIn.map(hmn))

    // Set maxAmountsIn
    params[3].maxAmountsIn = join.amountsIn

    // Join pool
    const { events } = await (await vault.joinPool(...params, { value: join.amountsIn[0] })).wait();
    const poolBalanceChanged = events?.find((e) => e.event === 'PoolBalanceChanged')
    const deltas = poolBalanceChanged?.args?.deltas

    console.log('Deltas:', deltas.map(hmn))
};

const priceImpact = async () => {
    // Build join
    const params000001 = buildParams(signerAddress, [wMatic, sMatic], [], evm(0.00001));
    const join000001 = await balancerHelpers.callStatic.queryJoin(...params000001)
    const params = buildParams(signerAddress, [wMatic, sMatic], [], evm(1));
    const join = await balancerHelpers.callStatic.queryJoin(...params)
    const params10000 = buildParams(signerAddress, [wMatic, sMatic], [], evm(10000));
    const join10000 = await balancerHelpers.callStatic.queryJoin(...params10000)

    // Query join - scales lineary
    console.log(join000001.amountsIn.map(a => a.mul(1000000000)).map(hmn))
    console.log(join.amountsIn.map(a => a.mul(10000)).map(hmn))
    console.log(join10000.amountsIn.map(hmn))
}

const main = async () => {
    signerAddress = await signer.getAddress()
    await setTokenBalance(provider, signerAddress, sMatic, evm(100000), 0, false);
    await setTokenBalance(provider, signerAddress, wMatic, evm(100000), 3, false);
    await approveToken(sMatic, vault.address, evm(10), signer)
    await approveToken(wMatic, vault.address, evm(10), signer)

    await join();
    await joinWithMatic();
    await priceImpact()
}

main();
