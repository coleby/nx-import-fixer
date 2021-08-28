# NX Import Fixer

This extension will use your NX paths in your root `tsconfig.base.json` to fix your imports. When intellisense imports your library with a relative path such as `../../../../myLibrary/src/whatever`, you can save and the extension will detect and change this to: `@repo/myLibrary`.
