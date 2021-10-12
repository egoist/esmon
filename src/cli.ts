#!/usr/bin/env node
import { cac } from 'cac'
import { version } from '../package.json'

const cli = cac('esmon')

cli
  .command('[file]', 'Run a file and watch for changes')
  .action(async (file, opts) => {
    if (!file) return cli.outputHelp()

    const { run } = await import('./')
    await run(file, { outDir: 'temp', ...opts }, true)
  })

cli.command('run [file]', 'Run a file only').action(async (file, opts) => {
  if (!file) return cli.outputHelp()

  const { run } = await import('./')
  await run(file, { outDir: 'temp', ...opts })
})

cli.command('build [file]', 'Build a file').action(async (file, opts) => {
  if (!file) return cli.outputHelp()

  const { build } = await import('./')
  await build(file, {
    outDir: 'dist',
    ...opts,
  })
})

cli.option('--bundleDevDeps', 'Bundle devDependencies in package.json')

cli.version(version)
cli.help()
cli.parse()
