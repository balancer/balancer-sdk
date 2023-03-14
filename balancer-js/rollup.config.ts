import { nodeResolve } from '@rollup/plugin-node-resolve';
import { readFileSync } from 'fs';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import analyze from 'rollup-plugin-analyzer';
import alias from '@rollup/plugin-alias';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url)).toString()
);

const external = [...Object.keys(pkg.dependencies)];

export default [
  {
    input: 'src/index.ts',
    treeshake: { moduleSideEffects: false },
    output: [
      {
        name: 'balancer-js',
        file: pkg.browser,
        format: 'umd',
        sourcemap: true,
        globals: {
          '@ethersproject/abi': 'abi',
          '@ethersproject/constants': 'constants',
          '@ethersproject/bignumber': 'bignumber',
          '@ethersproject/address': 'address',
          '@ethersproject/bytes': 'bytes',
          '@ethersproject/abstract-signer': 'abstractSigner',
          '@ethersproject/contracts': 'contracts',
          '@balancer-labs/sor': 'sor',
          '@balancer-labs/typechain': 'typechain',
          '@ethersproject/providers': 'providers',
          'graphql-request': 'graphqlRequest',
          'json-to-graphql-query': 'jsonToGraphqlQuery',
          graphql: 'graphql',
          lodash: 'lodash',
          axios: 'axios',
        },
      },
      {
        format: 'cjs',
        sourcemap: true,
        file: 'dist/cjs/index.js',
      },
      {
        format: 'es',
        sourcemap: true,
        dir: 'dist/esm',
        preserveModules: true,
        // preserveModulesRoot is needed to be compatible with nodeResolve plugin:
        // https://github.com/rollup/rollup/issues/3684
        preserveModulesRoot: 'src',
      },
    ],
    plugins: [
      json(),
      nodeResolve({
        // extensions: ['ts', 'js', 'json'],
      }),
      commonjs(),
      typescript({
        exclude: ['node_modules', '**/*.spec.ts'],
      }),
      // aliases defined in ts.config.json work with TS plugin but we also need them here for json imports
      alias({
        entries: [
          {
            find: '@',
            replacement: './src',
          },
        ],
      }),
      terser({
        format: {
          comments: false,
        },
        compress: {
          pure_funcs: ['console.log', 'console.time', 'console.timeEnd'],
        },
      }),
      analyze({
        hideDeps: true,
        limit: 5,
        summaryOnly: true,
        onAnalysis,
      }),
    ],
    external,
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/esm/index.d.ts', format: 'es' }],
    plugins: [dts(), typescript({ exclude: ['node_modules', '**/*.spec.ts'] })],
  },
];

const limitKB = 1000;

function onAnalysis({ bundleSize }) {
  if (bundleSize / 1000 < limitKB) return;
  console.warn(`Bundle size exceeds ${limitKB} KB: ${bundleSize / 1000} KB`);
  return process.exit(1);
}
