#!/usr/bin/env node
import { cac } from 'cac'
import { version } from '../package.json'

const cli = cac('esmon')

cli
  .command('[file]', 'Run a file and watch for changes')
  .action(async (file) => {
    if (!file) return cli.outputHelp()

    const { run } = await import('./')
    await run(file, { watch: true })
  })

cli.command('run [file]', 'Run a file only').action(async (file) => {
  if (!file) return cli.outputHelp()

  const { run } = await import('./')
  await run(file)
})

cli.command('build [file]', 'Build a file').action(async (file) => {
  if (!file) return cli.outputHelp()

  const { build } = await import('./')
  await build(file, 'dist')
})

cli.version(version)
cli.help()
cli.parse()
