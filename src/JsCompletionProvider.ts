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

                    var currentLine = document.lineAt(position.line).text;
                    var regexEndScope = /\$scope\s*\.\s*$/g;
                    var regexEndSelf = /self\s*\.\s*$/g;
                    var leftSideLine = currentLine.substring(0, position.character);

                    if (regexEndSelf.test(leftSideLine)) {

                        var collecting = false;
    
                        for (var i = 0; i < document.lineCount; i++) {
                            var line = document.lineAt(i).text;
    
                            var regexStart = /^\s*(var|let|const)\s+self\s*=\s*this/g;
                            var regexEnd = /^\s*function/g;
                            var regexVariable = /^\s*self\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
    
                            if (!collecting) {
                                if (regexStart.test(line)) {
                                    collecting = true;
                                }
                            } else {
                                if (regexEnd.test(line)) {
                                    break;
                                }
        
                                var matchVariable = regexVariable.exec(line);
        
                                if (matchVariable) {
                                    var varName = matchVariable[1];
        
                                    completionList.items.push(new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable));
                                }
                            }
                        }

                    } else if (regexEndScope.test(leftSideLine)) {
                        
                        for (var i = 0; i < document.lineCount; i++) {
                            var line = document.lineAt(i).text;
                            var regexVariable = /^\s*\$scope\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*[=,;\r\n]/g;
                            var matchVariable:RegExpExecArray|null = null;
        
                            while ((matchVariable = regexVariable.exec(line)) != null) {
                                var varName = matchVariable[1];
        
                                completionList.items.push(new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable));
                            }
                        }

                    }

                }

                resolve(completionList);
            });
    }

}




