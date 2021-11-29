import { cac } from 'cac'
import { version } from '../package.json'

export function startCLI() {
  const cli = cac('esmon')

  cli
    .command('[file]', 'Run a file and watch for changes')
    .action(async (file, opts) => {
      if (!file) return cli.outputHelp()

      const { run } = await import('./node')
      await run(file, { outDir: 'temp', watch: true, ...opts })
    })

  cli.command('run [file]', 'Run a file only').action(async (file, opts) => {
    if (!file) return cli.outputHelp()

    const { run } = await import('./node')
    await run(file, { outDir: 'temp', ...opts })
  })

  cli.command('build [file]', 'Build a file').action(async (file, opts) => {
    if (!file) return cli.outputHelp()

    const { build } = await import('./node')
    await build(file, {
      outDir: 'dist',
      ...opts,
    })
  })

  cli.option('--bundleDevDeps', 'Bundle devDependencies in package.json')
  cli.option('--esm', 'Output as esm')

  cli.version(version)
  cli.help()
  cli.parse()
}
