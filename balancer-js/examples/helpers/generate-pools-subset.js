// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

async function doStuff() {
  const poolIds = [
    '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
    '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe',
    '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
    '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
    '0x90291319f1d4ea3ad4db0dd8fe9e12baf749e84500020000000000000000013c',
    '0x186084ff790c65088ba694df11758fae4943ee9e000200000000000000000013',
    '0xf4c0dd9b82da36c07605df83c8a416f11724d88b000200000000000000000026',
    '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a',
  ];

  const poolData = await Promise.all(
    poolIds.map(async (id) => {
      console.log('Getting pool', id);
      const res = await axios.get('http://localhost:8090/pools/1/' + id);
      return res.data;
    })
  );

  console.log('Pooldata is: ', poolData);

  await fs.writeFile(
    path.resolve(__dirname, 'pools-subset.json'),
    JSON.stringify(poolData)
  );
}

doStuff();
