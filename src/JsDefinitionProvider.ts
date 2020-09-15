
import * as vscode from 'vscode';

export default class JsDefinitionProvider implements vscode.DefinitionProvider {

    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {
        
            return new Promise<vscode.Definition>((resolve, reject) => {
                
                var currentLine = document.lineAt(position.line);
                var currentRefs = new Array<string>();
                var regexRefVariable = /\bself\.([a-zA-Z$_][a-zA-Z0-9_$]*)/g;
                var matchRefVariable = null;

                while ((matchRefVariable = regexRefVariable.exec(currentLine.text)) != null) {
                    currentRefs.push(matchRefVariable[1]);
                }

                currentRefs = currentRefs.filter(m => {
                    return currentLine.text.indexOf(m) >= 0 && position.character >= 0
                    && currentLine.text.indexOf(m) >= position.character - m.length
                    && currentLine.text.indexOf(m) <= position.character
                });

                var definitions = new Array<vscode.Location>();

                if (currentRefs.length > 0) {

                    var collecting = false;

                    for (var i = 0; i < document.lineCount; i++) {
                        var line = document.lineAt(i).text;

                        var regexStart = /^[\s\t]+(var|let)\s+self\s*=\s*this/g;
                        var regexEnd = /^[\s\t]+function/g;
                        var regexVariable = /^[\s\t]+self\.([a-zA-Z$_][a-zA-Z0-9_$]*)/g;

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
                                    var start = new vscode.Position(i, varIndex);
                                    var end = new vscode.Position(i, varIndex + varName.length);
                                    var range = new vscode.Range(start, end);
            
                                    definitions.push(new vscode.Location(document.uri, range));
                                }
                            }
                        }
                    }
                }

                resolve(definitions);
            });
    }
}
