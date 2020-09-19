'use strict';
import * as vscode from 'vscode';
import AsDefinitionProvider from './AsDefinitionProvider';
import AsDocumentSymbolProvider from './AsDocumentSymbolProvider';
import HtmlCompletionProvider from './HtmlCompletionProvider';
import JsCompletionProvider from './JsCompletionProvider';
import JsDefinitionProvider from './JsDefinitionProvider';
import JsDiagnosticScanner from './JsDiagnosticScanner';
import JsDocumentSymbolProvider from './JsDocumentSymbolProvider';
import fs from 'fs';
import DirectivesScanner from './DirectivesScanner';

export function activate(context: vscode.ExtensionContext) {

    var diagnosticColl = vscode.languages.createDiagnosticCollection('javascript');
    var jsDiagnosticScanner = new JsDiagnosticScanner();
    var directivesScanner = new DirectivesScanner();

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "html" }, new HtmlCompletionProvider(directivesScanner.tagByName), '<', ' '
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "javascript" }, new JsCompletionProvider(), '.'
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: "javascript" }, new JsDocumentSymbolProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: "javascript" }, new JsDefinitionProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: "actionscript" }, new AsDocumentSymbolProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: "actionscript" }, new AsDefinitionProvider()
        )
    );


    vscode.workspace.onDidChangeTextDocument(event => {
        jsDiagnosticScanner.scan(event, diagnosticColl);
        directivesScanner.scanFile(event.document.uri);
    });

    vscode.workspace.onWillDeleteFiles(event => {
        var scanner = new DirectivesScanner();

        for (var file of event.files) {
            scanner.scanFile(file);
        }

        scanner.tagByName.forEach((value, key) => {
            directivesScanner.tagByName.delete(key);
        });
    });

    // start all tags scan
    setTimeout(() => {
        if (vscode.workspace.workspaceFolders) {
            for (var folder of vscode.workspace.workspaceFolders) {
                if (fs.existsSync(folder.uri.fsPath) && fs.statSync(folder.uri.fsPath).isDirectory()) {
                    directivesScanner.scanFolder(folder.uri);
                }
            }
        }
        
        if (vscode.workspace.workspaceFile) {
            var dirWork = vscode.workspace.workspaceFile;

            if (fs.existsSync(dirWork.fsPath) && fs.statSync(dirWork.fsPath).isDirectory()) {
                directivesScanner.scanFolder(dirWork);
            }
        }
    },1000);
}
