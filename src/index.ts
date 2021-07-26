import path from 'path'
import fs from 'fs'
import { build as esbuild } from 'esbuild'
import spawn from 'cross-spawn'
import { watch } from 'chokidar'
import kill from 'tree-kill'

const readPkg = () => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'))
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

export const build = async (file: string, outDir: string) => {
  const pkg = readPkg()
  const externals = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ]
  const result = await esbuild({
    entryPoints: [file],
    format: 'cjs',
    bundle: true,
    outdir: outDir,
    platform: 'node',
    metafile: true,
    write: false,
    target: `node${process.version.slice(1)}`,
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
    ],
  })
  const output = result.outputFiles[0]
  fs.mkdirSync(path.dirname(output.path), { recursive: true })
  fs.writeFileSync(output.path, output.text, 'utf8')
  return {
    get watchFiles() {
      return new Set(Object.keys(result.metafile?.inputs || {}))
    },
    filepath: output.path,
  }
}

export const run = async (file: string) => {
  let { watchFiles, filepath } = await build(file, 'temp')

  const startCommand = () => {
    const cmd = spawn('node', [filepath], {
      env: {
        FORCE_COLOR: '1',
        NPM_CONFIG_COLOR: 'always',
        ...process.env,
      },
      stdio: 'pipe',
    })
    cmd.stdout?.pipe(process.stdout)
    cmd.stderr?.pipe(process.stderr)
    cmd.stdin?.pipe(process.stdin)
    return cmd
  }

  let cmd = startCommand()

  watch('.', {
    ignored: '**/{node_modules,dist,temp,.git}/**',
    ignoreInitial: true,
    ignorePermissionErrors: true,
    cwd: process.cwd(),
  }).on('all', async (event, filepath) => {
    if(process.platform=='win32'){
      filepath=filepath.replace(/\\/g,'/')
    }
    if (watchFiles.has(filepath)) {
      await killProcess({ pid: cmd.pid })
      const result = await build(file, 'temp')
      watchFiles = result.watchFiles
      filepath = result.filepath
      cmd = startCommand()
    }
  })
}
