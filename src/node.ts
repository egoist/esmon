import path from 'path'
import fs from 'fs'
import { build as esbuild, BuildResult } from 'esbuild'
import spawn from 'cross-spawn'
import kill from 'tree-kill'
import { parse } from 'jsonc-parser'

const readPkg = () => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'))
  } catch (err) {
    return {}
  }
}

const loadTsConfig = () => {
  try {
    return parse(fs.readFileSync(path.resolve('tsconfig.json'), 'utf8'))
  } catch (err) {
    return {}
  }
}

const killProcess = ({
  pid,
  signal = 'SIGTERM',
}: {
  pid: number
  signal?: string | number
}) =>
  new Promise<unknown>((resolve) => {
    kill(pid, signal, resolve)
  })

export interface BuildOptions {
  outDir: string
  bundleDevDeps?: boolean
  watch?: boolean
  esm?: boolean
}

export const build = async (
  file: string,
  opts: BuildOptions,
): Promise<{ watchFiles: Set<string>; outfile: string }> => {
  const pkg = readPkg()
  const tsconfig = loadTsConfig()
  const compilerOptions = tsconfig.compilerOptions || {}
  const externals = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...(opts.bundleDevDeps ? [] : Object.keys(pkg.devDependencies || {})),
  ]

  const output = async (result: BuildResult) => {
    if (!result.outputFiles) {
      throw new Error(`no output files`)
    }
    if (!result.metafile) {
      throw new Error(`no metafile`)
    }

    // Write files
    await Promise.all(
      result.outputFiles.map(async (outfile) => {
        fs.promises.mkdir(path.dirname(outfile.path), { recursive: true })
        fs.promises.writeFile(outfile.path, outfile.text, 'utf8')
      }),
    )

    // Find the output file
    let outfile: string | undefined
    for (const filename of Object.keys(result.metafile.outputs)) {
      const file = result.metafile.outputs[filename]
      if (file.entryPoint) {
        outfile = path.resolve(filename)
      }
    }
    if (!outfile) {
      throw new Error(`cannot find the output file`)
    }

    return {
      get watchFiles() {
        return new Set(Object.keys(result.metafile?.inputs || {}))
      },
      outfile,
    }
  }

  const inject: string[] = []
  if (opts.esm) {
    inject.push(path.join(__dirname, '../assets/cjs-shims.js'))
  }
  const result = await esbuild({
    entryPoints: [file],
    format: opts.esm ? 'esm' : 'cjs',
    bundle: true,
    outdir: opts.outDir,
    platform: 'node',
    metafile: true,
    write: false,
    target: `node${process.version.slice(1)}`,
    incremental: opts.watch,
    outExtension: {
      '.js': opts.esm ? '.mjs' : '.cjs',
    },
    inject,
    plugins: [
      {
        name: 'externalize-deps',
        setup(build) {
          build.onResolve({ filter: /.+/ }, (args) => {
            if (
              externals.some(
                (external) =>
                  args.path === external ||
                  args.path.startsWith(`${external}/`),
              )
            ) {
              return {
                path: args.path,
                external: true,
              }
            }
          })
        },
      },
      {
        name: 'swc',
        async setup(build) {
          if (!compilerOptions.emitDecoratorMetadata) return

          const { transform } = await import('@swc/core')

          build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
            const contents = await fs.promises.readFile(args.path, 'utf-8')
            const isTS = /\.tsx?$/.test(args.path)
            const isJSX = /sx$/.test(args.path)
            const result = await transform(contents, {
              configFile: false,
              filename: args.path,
              sourceMaps: 'inline',
              jsc: {
                target: 'es2021',
                keepClassNames: true,
                parser: isTS
                  ? {
                      syntax: 'typescript',
                      tsx: isJSX,
                      decorators: true,
                    }
                  : {
                      syntax: 'ecmascript',
                      jsx: isJSX,
                      decorators: true,
                    },
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                },
              },
            })
            return {
              contents: result.code,
              loader: 'js',
            }
          })
        },
      },
    ],
  })
  return output(result)
}

export const run = async (file: string, buildOpts: BuildOptions) => {
  let { outfile, watchFiles } = await build(file, buildOpts)

  const startCommand = () => {
    const cmd = spawn('node', [path.relative(process.cwd(), outfile)], {
      env: {
        FORCE_COLOR: '1',
        NPM_CONFIG_COLOR: 'always',
        ...process.env,
      },
      stdio: 'inherit',
    })
    return cmd
  }

  let cmd = startCommand()

  if (buildOpts.watch) {
    const { watch } = await import('chokidar')
    watch('.', {
      ignored: '**/{node_modules,dist,temp,.git}/**',
      ignoreInitial: true,
      ignorePermissionErrors: true,
      cwd: process.cwd(),
    }).on('all', async (event, filepath) => {
      if (watchFiles.has(filepath) && cmd.pid) {
        await killProcess({ pid: cmd.pid })
        const result = await build(file, buildOpts)
        watchFiles = result.watchFiles
        outfile = result.outfile
        cmd = startCommand()
      }
    })
  }
}
