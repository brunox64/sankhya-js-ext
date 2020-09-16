'use strict';
import * as vscode from 'vscode';

export default class JsCompletionProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken, 
        context:vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionList<vscode.CompletionItem>> {
            
            return new Promise((resolve, reject) => {
                
                var completionList = new vscode.CompletionList(new Array<vscode.CompletionItem>());
                completionList.isIncomplete = false;

                if (context.triggerCharacter == '.') {
                } else {
                }

                resolve(completionList);
            });
    }

}




