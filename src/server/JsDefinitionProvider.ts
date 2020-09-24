

import { DefinitionParams, Location, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class JsDefinitionProvider {

    public provideDefinition(document: TextDocument, definitionparams:DefinitionParams): Location[] {
        
        var position:Position = definitionparams.position;
        var lines:string[] = document.getText().split(/\r?\n/g);

        var definitions:Location[] = [];

        var currentLine = lines[position.line];
        var currentRefs = new Array<string>();
        var regexRefVariable = /[^a-zA-Z0-9_\$](self|\$scope)\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
        var matchRefVariable = null;

        while ((matchRefVariable = regexRefVariable.exec(currentLine)) != null) {
            currentRefs.push(matchRefVariable[2]);
        }

        currentRefs = currentRefs.filter(m => {
            return currentLine.indexOf(m) >= 0 && position.character >= 0
            && currentLine.indexOf(m) >= position.character - m.length
            && currentLine.indexOf(m) <= position.character
        });

        if (currentRefs.length > 0) {

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
                        var varIndex = line.indexOf(varName, matchVariable.index);

                        if (currentRefs.find(m => m == varName)) {
                            var start = {line: i, character: varIndex};
                            var end = {line: i, character: varIndex + varName.length};
                            var range = {start, end};
    
                            definitions.push({ uri: document.uri, range: range });
                        }
                    }
                }
            }

            for (var i = 0; i < document.lineCount; i++) {
                var line = lines[i];
                var regexVariable = /^\s*\$scope\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*=/g;
                var matchVariable:RegExpExecArray|null = null;

                while ((matchVariable = regexVariable.exec(line)) != null) {
                    var varName = matchVariable[1];
                    var varIndex = line.indexOf(varName, matchVariable.index);

                    if (currentRefs.find(m => m == varName)) {
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
