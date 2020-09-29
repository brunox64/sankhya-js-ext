

import { DefinitionParams, Location, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class JsDefinitionProvider {

    public provideDefinition(document: TextDocument, definitionParams:DefinitionParams): Location[] {
        
        var position:Position = definitionParams.position;
        var content:string = document.getText();
        var lines:string[] = content.split(/\r?\n/g);
        var currentLine = lines[position.line];
        
        var currentRefs = [];
        var regexRefVariable = /(self|\$scope)\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
        var matchRefVariable = null;

        while ((matchRefVariable = regexRefVariable.exec(currentLine)) != null) {
            currentRefs.push({tipo: matchRefVariable[1], name: matchRefVariable[2]});
        }

        currentRefs = currentRefs.filter(m => {
            return currentLine.indexOf(m.name) >= 0 && position.character >= 0
            && currentLine.indexOf(m.name) >= position.character - m.name.length
            && currentLine.indexOf(m.name) <= position.character
        });

        var definitions:Location[] = [];

        if (currentRefs.length > 0) {
            
            var regexVariable:RegExp = /^[ \t]*(\$scope|self)\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)[ \t]*[=,;\r\n]/g;
            var matchVariable:RegExpExecArray|null;
            var varTipo:string;
            var varName:string;
            var varIndex:number;
            var line:string;

            for (var i = 0; i < lines.length; i++) {
                line = lines[i];
                regexVariable.lastIndex = 0;
                matchVariable = null;

                if (matchVariable = regexVariable.exec(line)) {
                    varTipo = matchVariable[1];
                    varName = matchVariable[2];
                    varIndex = matchVariable.index + matchVariable[0].indexOf(varName);
    
                    if (currentRefs.find(m => m.name == varName && m.tipo == varTipo)) {
                        var start = {line:i, character: varIndex};
                        var end = {line: i, character: varIndex + varName.length};
                        var range = {start, end};
    
                        definitions.push({ uri: document.uri, range: range });
                    }
                }
            }
        }
        
        return definitions;
    }
}
