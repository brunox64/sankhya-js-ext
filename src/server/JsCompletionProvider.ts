'use strict';

import { CompletionItem, CompletionItemKind, Position, TextDocumentPositionParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class JsCompletionProvider {

    public provideCompletionItems(
        document: TextDocument, 
        textDocPos: TextDocumentPositionParams): CompletionItem[] {
            
            var position:Position = textDocPos.position;
            var lines:string[] = document.getText().split(/\r?\n/g);
            var triggerCharacter = lines[position.line].substring(position.character-1, position.character);

            var completionList:CompletionItem[] = [];

            if (triggerCharacter == '.') {
                
                var currentLine = lines[textDocPos.position.line];
                var regexEndScope = /\$scope\s*\.\s*$/g;
                var regexEndSelf = /self\s*\.\s*$/g;
                var leftSideLine = currentLine.substring(0, textDocPos.position.character);

                if (regexEndSelf.test(leftSideLine)) {

                    var collecting = false;

                    for (var i = 0; i < document.lineCount; i++) {
                        var line = lines[i];

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
    
                                completionList.push({label: varName, kind: CompletionItemKind.Variable});
                            }
                        }
                    }

                } else if (regexEndScope.test(leftSideLine)) {
                    
                    for (var i = 0; i < document.lineCount; i++) {
                        var line = lines[i];
                        var regexVariable = /^\s*\$scope\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*[=,;\r\n]/g;
                        var matchVariable:RegExpExecArray|null = null;
    
                        while ((matchVariable = regexVariable.exec(line)) != null) {
                            var varName = matchVariable[1];
    
                            completionList.push({label: varName, kind: CompletionItemKind.Variable});
                        }
                    }

                }

            }

            return completionList;
    }

}




