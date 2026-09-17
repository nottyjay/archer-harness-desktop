import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
const id = JSON.stringify(pkg.name)

export default [
  {
    entry: { index: 'src/index.ts' },
    format: 'esm',
    outDir: 'dist',
    dts: false,
    sourcemap: false,
    minify: false,
    clean: false,
    publint: false,
    outExtensions: () => ({ js: '.js' }),
  },
  {
    entry: { client: 'src/client/index.ts' },
    format: 'cjs',
    outDir: 'dist',
    dts: false,
    sourcemap: true,
    minify: false,
    clean: false,
    publint: false,
    outExtensions: () => ({ js: '.cjs' }),
    banner: {
      js: `window.__ModuleLoader__.load({id:${id},factory:(require)=>{const loaderRequire=require;const resolve=(specifier)=>specifier.endsWith('/client')?specifier.slice(0,-7):specifier;require=(specifier)=>loaderRequire(resolve(specifier));var module={exports:{}};var exports=module.exports;`,
    },
    footer: {
      js: 'return module.exports;}});',
    },
  },
]
