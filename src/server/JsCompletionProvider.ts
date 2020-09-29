'use strict';

import { CompletionItem, CompletionItemKind, Position, TextDocumentPositionParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import ServiceInfo from '../model/ServiceInfo';
import DirectivesScanner from './DirectivesScanner';

export default class JsCompletionProvider {

    public constructor(
        private directivesScanner:DirectivesScanner
    ){}

    public provideCompletionItems(
        document: TextDocument, 
        textDocPos: TextDocumentPositionParams): CompletionItem[] {
            
            var position:Position = textDocPos.position;
            var content = document.getText();
            var lines:string[] = content.split(/\r?\n/g);
            var currentLine = lines[position.line];
            var triggerCharacter = currentLine.substring(position.character-1, position.character);

            var completionList:CompletionItem[] = [];

            if (triggerCharacter == '.') {

                var leftSideLine = currentLine.substring(0, position.character);

                var regexEndScope = /\$scope\s*\.\s*$/g;
                var regexEndSelf = /self\s*\.\s*$/g;

                var regexVariable:RegExp = /(\$scope|self)\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)[ \t]*[=,;\r\n]/g;
                var matchVariable:RegExpExecArray|null = null;
                var varName:string|null = null;

                var uniqueVarNames:Set<string> = new Set();

                if (regexEndSelf.test(leftSideLine) || regexEndScope.test(leftSideLine)) {
                    while (matchVariable = regexVariable.exec(content)) {
                        varName = matchVariable[2];
                        uniqueVarNames.add(varName);
                    }
                } else {
                    var regexEndService = /([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*\.\s*$/g;
                    var matchEndService = regexEndService.exec(leftSideLine);

                    if (matchEndService) {
                        var serviceName:string = matchEndService[1];
                        var serviceInfo:ServiceInfo|undefined = this.directivesScanner.serviceByName.get(serviceName);

                        if (serviceInfo) {
                            serviceInfo.methods.forEach(m => {
                                completionList.push({
                                    label: m.name,
                                    kind: CompletionItemKind.Method,
                                    documentation: m.doc
                                })
                            });
                        }
                    }
                }

                uniqueVarNames.forEach(varName => completionList.push({label: varName, kind: CompletionItemKind.Variable}));
            }

            return completionList;
    }

}




