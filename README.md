**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/egoist).**

---

# esmon

[![npm version](https://badgen.net/npm/v/esmon)](https://npm.im/esmon)

## Install

```bash
npm i -D esmon
```

## Usage

**Run a script: (for development)**

```
esmon your-script.ts
```

This will also watch all the files imported by `your-script.ts` and re-run it on changes.

Note that this command will emit temporary files to `./temp` folder, it's recommended to add it to your `.gitignore` file.

**Build a script: (for production)**

```
esmon build your-scripts.ts
```

This command will emit bundled script to `./dist` folder which filename matching the original filename. i.e. here you will get `./dist/your-script.js`.

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
