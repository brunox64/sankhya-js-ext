'use strict';
import * as vscode from 'vscode';
import JsCompletionProvider from './JsCompletionProvider';
import JsDefinitionProvider from './JsDefinitionProvider';
import JsDocumentSymbolProvider from './JsDocumentSymbolProvider';

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "html" }, new JsCompletionProvider(), '<', ' '
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

}
