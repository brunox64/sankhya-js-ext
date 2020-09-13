'use strict';
import * as vscode from 'vscode';
import JsCompletionProvider from './JsCompletionProvider';

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            "html", new JsCompletionProvider(), '<', ' '
        )
    );

}
