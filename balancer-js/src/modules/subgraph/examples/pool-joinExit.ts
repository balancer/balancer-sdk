import dotenv from "dotenv";
import {createSubgraphClient} from "@/modules/subgraph/subgraph";

dotenv.config();

(async function() {

    const POOL_ID = '0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002'
    const subgraph_url = "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2"
    const client = createSubgraphClient(`${subgraph_url}`);

    const poolQuery = await client.Pool({ id: POOL_ID});
    console.log(`${poolQuery.pool?.tokens?.map((token) => `${token.symbol}\t${token.weight}`).join("\n")}`)
    let result = await client.JoinExits({ where: { pool: POOL_ID } });

    const userId = result.joinExits.sort((a, b) => a.timestamp - b.timestamp)[0].user.id;
    console.log(`${userId}`)
    result = await client.JoinExits({ where: { sender: userId, pool: POOL_ID } });
    result.joinExits.sort((a, b) => a.timestamp - b.timestamp).forEach((item) => console.log(`${item.id}\t${new Date(item.timestamp * 1000).toLocaleString()}\t${item.type}\t${item.amounts}`))


})();

// npm run examples:run -- ./src/modules/subgraph/examples/pool-joinExit.ts