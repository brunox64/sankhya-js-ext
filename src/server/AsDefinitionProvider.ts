
import { DefinitionParams, Location } from 'vscode-languageserver';
import { TextDocument, Position } from 'vscode-languageserver-textdocument';

export default class AsDefinitionProvider  {
    
    public provideDefinition(document:TextDocument, definitionParams:DefinitionParams): Location[] {
        
        var position:Position = definitionParams.position;
        var lines:string[] = document.getText().split(/\r?\n/g);
        
        var currentLine = lines[position.line];
        var currentRefs = new Array<string>();
        var regexRefVariable = /\b([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)\b/g;
        var matchRefVariable;

        while ((matchRefVariable = regexRefVariable.exec(currentLine)) != null) {
            currentRefs.push(matchRefVariable[1]);
        }

        currentRefs = currentRefs.filter(m => {
            return currentLine.indexOf(m) >= 0 && position.character >= 0
            && currentLine.indexOf(m) >= position.character - m.length
            && currentLine.indexOf(m) <= position.character
        });

        var definitions:Location[] = [];

        if (currentRefs.length > 0) {

            for (var i = 0; i < document.lineCount; i++) {
                var line = lines[i];
                var matchFunction = /function\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)\s*\(/.exec(line);
                var matchVariable = /var\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line);
                var matchConstante = /const\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line);
                var matchMxmlVariable = /\bid\s*=\s*"([^"]+)"/.exec(line);

                [matchFunction, matchVariable, matchMxmlVariable, matchConstante].forEach(matchVar => {
                    if (matchVar) {
                        var defName = matchVar[1];

                        if (currentRefs.find(m => m == defName)) {
                            var start = {line: i, character: line.indexOf(defName)};
                            var end = {line: i, character: line.indexOf(defName) + defName.length};
                            var range = {start,end};
    
                            definitions.push({
                                uri: document.uri,
                                range: range
                            });
                        }
                    }
                });
            }
        }

        return definitions;
    }
}
