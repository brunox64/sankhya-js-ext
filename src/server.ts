
import fs from 'fs';

import {
    createConnection,
    TextDocuments,
    Diagnostic,
    ProposedFeatures,
    InitializeParams,
    CompletionItem,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult, 
    FileChangeType, 
    DocumentSymbol, 
    Location, 
    DocumentSymbolParams, 
    DefinitionParams
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';

import AsDefinitionProvider from './server/AsDefinitionProvider';
import AsDocumentSymbolProvider from './server/AsDocumentSymbolProvider';

import DirectivesScanner from './server/DirectivesScanner';
import HtmlCompletionProvider from './server/HtmlCompletionProvider';
import JsCompletionProvider from './server/JsCompletionProvider';
import JsDefinitionProvider from './server/JsDefinitionProvider';
import JsDiagnosticScanner from './server/JsDiagnosticScanner';
import JsDocumentSymbolProvider from './server/JsDocumentSymbolProvider';

main();

function main() {

    // Create a connection for the server, using Node's IPC as a transport.
    // Also include all preview / proposed LSP features.
    let connection = createConnection(ProposedFeatures.all);

    // Create a simple text document manager.
    let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

    var jsDiagnosticScanner = new JsDiagnosticScanner();
    var directivesScanner = new DirectivesScanner();

    function scanAllKnownFiles() {
        
        (connection.workspace.getWorkspaceFolders() || Promise.resolve()) .then(folders => {
            (folders || []).forEach(wf => {
                var folder = new URL(wf.uri);
                if (fs.existsSync(folder.pathname) && fs.statSync(folder.pathname).isDirectory()) {
                    directivesScanner.scanFolder(folder.pathname);
                }
            });

            for (var document of documents.all()) {
                var diagnosticColl: Diagnostic[] = [];
                jsDiagnosticScanner.scan(document, diagnosticColl);
                connection.sendDiagnostics({ uri: document.uri, diagnostics: diagnosticColl });
            } 
        });

    }

    connection.onInitialized(scanAllKnownFiles);

    connection.onInitialize((params:InitializeParams):InitializeResult => {
        return {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental,
                completionProvider: {
                    triggerCharacters: [ '<','.',' ' ],
                    resolveProvider: false
                },
                documentSymbolProvider: true,
                definitionProvider: true,
                workspace: {
                    workspaceFolders: {
                        supported: true
                    }
                }
            }
        };
    });

    connection.onDidChangeWatchedFiles(event => {
        var deletouAlgum = false;

        for (var change of event.changes) {
            if (change.type == FileChangeType.Deleted) {
                deletouAlgum = true;
                break;
            }
        }
        
        if (deletouAlgum) {
            directivesScanner.clear();
            scanAllKnownFiles();
        }
    });

    documents.onDidOpen(event => {
        directivesScanner.scanFile(new URL(event.document.uri).pathname);

        var diagnosticColl: Diagnostic[] = [];
        jsDiagnosticScanner.scan(event.document, diagnosticColl);
        connection.sendDiagnostics({ uri: event.document.uri, diagnostics: diagnosticColl });
    });

    documents.onDidSave(event => {
        directivesScanner.scanFile(new URL(event.document.uri).pathname);
        
        var diagnosticColl: Diagnostic[] = [];
        jsDiagnosticScanner.scan(event.document, diagnosticColl);
        connection.sendDiagnostics({ uri: event.document.uri, diagnostics: diagnosticColl });
    });


    var jsCompletionProvider = new JsCompletionProvider();
    var jsSymbolProvider = new JsDocumentSymbolProvider();
    var jsDefinitionProvider = new JsDefinitionProvider();
    var asSymbolProvider = new AsDocumentSymbolProvider();
    var asDefinitionProvider = new AsDefinitionProvider();
    var htmlCompletionProvider = new HtmlCompletionProvider(directivesScanner.tagByName);

    connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        var document = documents.get(textDocumentPosition.textDocument.uri);

        if (document) {
            if (document.languageId == 'javascript') {
                return jsCompletionProvider.provideCompletionItems(document, textDocumentPosition);
            } else if (document.languageId == 'html') {
                return htmlCompletionProvider.provideCompletionItems(document, textDocumentPosition);
            }
        }

        return new Array<CompletionItem>();
    });

    connection.onDocumentSymbol((documentSymbolParams:DocumentSymbolParams): DocumentSymbol[] => {
        var document = documents.get(documentSymbolParams.textDocument.uri);

        if (document) {
            if (document.languageId == 'javascript') {
                return jsSymbolProvider.provideDocumentSymbols(document, documentSymbolParams);
            } else if (document.languageId == 'actionscript') {
                return asSymbolProvider.provideDocumentSymbols(document, documentSymbolParams);
            }
        }

        return new Array<DocumentSymbol>();
    });

    connection.onDefinition((definitionParams:DefinitionParams): Location[] => {
        var document = documents.get(definitionParams.textDocument.uri);

        if (document) {
            if (document.languageId == 'javascript') {
                return jsDefinitionProvider.provideDefinition(document, definitionParams);
            } else if (document.languageId == 'actionscript') {
                return asDefinitionProvider.provideDefinition(document, definitionParams);
            }
        }

        return new Array<Location>();
    });


    // Make the text document manager listen on the connection
    // for open, change and close text document events
    documents.listen(connection);

    // Listen on the connection
    connection.listen();

}
