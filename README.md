# NX Import Fixer

The NX Import Fixer extension will use the NX paths defined in your root `tsconfig.base.json` to fix your imports when you save your document.

Disclaimer: `This extension was built quickly but hasn't failed me yet. If you hit any issues - please post an Issue on the github repository.`

## Features

- When intellisense imports your library with a relative path such as `../../../../myLibrary/src/whatever`, you can save and the extension will detect and change this to: `@repo/myLibrary`
- Only activates in an NX repository. Uses `nx.json` and `tsconfig.base.json` to confirm it is an NX repository

## Future Improvements

- Navigate the `tsconfig` tree properly instead of only looking at the base.

## Contributing

All PR's are welcome on the [Github repository](https://github.com/coleby/nx-import-fixer)!
