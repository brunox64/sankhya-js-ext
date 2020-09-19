'use strict';
import * as vscode from 'vscode';
import AsDefinitionProvider from './AsDefinitionProvider';
import AsDocumentSymbolProvider from './AsDocumentSymbolProvider';
import HtmlCompletionProvider from './HtmlCompletionProvider';
import JsCompletionProvider from './JsCompletionProvider';
import JsDefinitionProvider from './JsDefinitionProvider';
import JsDiagnosticScanner from './JsDiagnosticScanner';
import JsDocumentSymbolProvider from './JsDocumentSymbolProvider';
import Region from './Region';
import StringUtil from './StringUtil';

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "html" }, new HtmlCompletionProvider(), '<', ' '
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

    var diagnosticColl = vscode.languages.createDiagnosticCollection('javascript');
    var jsDiagnosticScanner = new JsDiagnosticScanner();

    vscode.workspace.onDidChangeTextDocument(event => {
        jsDiagnosticScanner.scan(event, diagnosticColl);
    });
}
