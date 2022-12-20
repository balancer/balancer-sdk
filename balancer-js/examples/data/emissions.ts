/**
 * yarn examples:run ./examples/data/emissions.ts
 */
import { BalancerSDK } from '@/.';
import { balEmissions } from '@/modules/data';

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://eth-rpc.gateway.pokt.network'
})

const { data } = sdk;

const now = Math.round(new Date().getTime() / 1000)
const totalBalEmissions = balEmissions.between(now, now + 365 * 86400)

const main = async () => {
  if (data.liquidityGauges) {
    const gauge = await data.liquidityGauges.findBy('poolId', '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d');
    if (gauge) {
      console.log(`yearly emissions share: ${totalBalEmissions * gauge.relativeWeight} BAL`);
    }
  }
}

main()
