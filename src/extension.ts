import {
  window,
  workspace,
  Disposable,
  ExtensionContext,
  TextDocument,
  Range,
  TextDocumentWillSaveEvent,
} from 'vscode'
import { dirname, relative } from 'path'
import { existsSync, readFileSync } from 'fs'

const isTypescript = (languageId: string) =>
  languageId === 'typescript' || languageId === 'typescriptreact'

const isJavascript = (languageId: string) =>
  languageId === 'javascript' || languageId === 'javascriptreact'

const isSupportedLanguage = ({ languageId }: { languageId: string }) =>
  isTypescript(languageId) || isJavascript(languageId)

// this method is called when your extension is activated. activation is
// controlled by the activation events defined in package.json
export function activate(ctx: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('NX Import Fixer is now active')

  const importFixer = new ImportFixer()
  const controller = new ImportFixerController(importFixer)

  ctx.subscriptions.push(controller)
  ctx.subscriptions.push(importFixer)
}

export class ImportFixer {
  public checkForBrokenImports(doc: TextDocument) {
    const editor = window.activeTextEditor
    if (!editor) {
      return
    }

    if (doc !== editor.document) {
      return
    }

    if (!isSupportedLanguage(doc)) {
      return
    }

    // The file being saved lives in apps
    const appsDirectoryMatch = doc.fileName.match(/(.*\/apps)\/[^\/]*\//)
    if (appsDirectoryMatch === null) {
      return
    }

    const packagesDirectory = appsDirectoryMatch[1]
    const splitDirectories = packagesDirectory.split('/')

    splitDirectories.splice(-1)

    const rootDirectory = splitDirectories.join('/')
    const pathToRootDirectory = relative(dirname(doc.fileName), rootDirectory)

    // Confirm NX repo - skip otherwise
    if (
      !existsSync(rootDirectory + '/nx.json') ||
      !existsSync(rootDirectory + '/tsconfig.base.json')
    ) {
      return
    }

    // Load libs object from base paths
    const tsconfigDef: {
      compilerOptions: { paths: Record<string, string[]> }
    } = JSON.parse(readFileSync(rootDirectory + '/tsconfig.base.json', 'utf8'))
    const paths = tsconfigDef.compilerOptions.paths

    const libsDirectory = splitDirectories.join('/') + '/libs'
    const pathToLibsDirectory = relative(dirname(doc.fileName), libsDirectory)

    const libraryNameRegex = '[^"\'/.]*'
    const restOfPathRegex = '[^"\']*'
    const importPathRegex =
      escapeRegExp(pathToLibsDirectory) +
      escapeRegExp('/') +
      libraryNameRegex +
      escapeRegExp('/') +
      restOfPathRegex
    const importRegex = new RegExp('from ["\'](' + importPathRegex + ')["\']')

    let match = importRegex.exec(doc.getText())
    if (!match) {
      return
    }

    editor.edit((builder) => {
      while (match) {
        const matchedText = match[0]
        const relativePathOfImportedFile = match[1]
        const withoutPrefixPath = relativePathOfImportedFile.split(
          pathToRootDirectory + '/',
        )[1]
        const splitWithoutPrefix = withoutPrefixPath.split('/')
        const cleaned = splitWithoutPrefix.slice(0, 2).join('/')

        const matchingLibrary = Object.keys(paths).find((key) =>
          paths[key][0].startsWith(cleaned),
        )

        if (!matchingLibrary) {
          break
        }

        if (matchingLibrary !== undefined) {
          builder.delete(
            new Range(
              doc.positionAt(match.index),
              doc.positionAt(match.index + matchedText.length),
            ),
          )
          builder.insert(
            doc.positionAt(match.index),
            "from '" + matchingLibrary + "'",
          )
          break
        }
      }
    })
  }

  public dispose() {}
}

class ImportFixerController {
  private _importFixer: ImportFixer
  private _disposable: Disposable

  constructor(importFixer: ImportFixer) {
    this._importFixer = importFixer

    // subscribe to selection change and editor activation events
    let subscriptions: Disposable[] = []
    // TODO: Lets see if we can do this after a successful import alongside save
    workspace.onWillSaveTextDocument(this._onEvent, this, subscriptions)

    // create a combined disposable from both event subscriptions
    this._disposable = Disposable.from(...subscriptions)
  }

  private _onEvent(event: TextDocumentWillSaveEvent) {
    this._importFixer.checkForBrokenImports(event.document)
  }

  public dispose() {
    this._disposable.dispose()
  }
}

function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
}
