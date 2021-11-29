**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/egoist).**

---

# esmon

[![npm version](https://badgen.net/npm/v/esmon)](https://npm.im/esmon)

## Install

```bash
npm i -D esmon
```

## Usage

**Run a script and watch for changes: (for development)**

```
esmon your-script.ts
```

This will also watch all the files imported by `your-script.ts` and re-run it on changes.

Note that this command will emit temporary files to `./temp` folder, it's recommended to add it to your `.gitignore` file.

If you intend to run the file without watching files, you can use the `run` command instead: `esmon run your-script.ts`.

**Build a script: (for production)**

```
esmon build your-scripts.ts
```

This command will emit bundled script in esm format to `./dist` folder with a filename matching the original filename. i.e. here you will get `./dist/your-script.mjs`.

### Externals

`dependencies`, `devDependencies` and `peerDependencies` are automatically excluded from the bundled scripts. If you wish to bundle `devDependencies`, you can pass the `--bundleDevDeps` flag.

### Decorators

Both `experimentalDecorators` and `emitDecoratorMetadata` options in `tsconfig.json` are supported, when you have `emitDecoratorMetadata` enabled we will use `swc` to transform decorators.

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
