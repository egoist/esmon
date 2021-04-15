import fs from 'fs'
import { build as esbuild } from 'esbuild'
import spawn from 'cross-spawn'
import { watch } from 'chokidar'

export const build = async (file: string, outDir: string) => {
  const result = await esbuild({
    entryPoints: [file],
    format: 'cjs',
    bundle: true,
    outdir: outDir,
    platform: 'node',
    metafile: true,
    write: false,
    target: `node${process.version.slice(1)}`,
  })
  const output = result.outputFiles[0]
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
    if (watchFiles.has(filepath)) {
      cmd.kill()
      const result = await build(file, 'temp')
      watchFiles = result.watchFiles
      filepath = result.filepath
      cmd = startCommand()
    }
  })
}
