import * as vscode from 'vscode';

export default class AsDefinitionProvider implements vscode.DefinitionProvider {
    
    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken): Thenable<vscode.Definition> {
        
            return new Promise<any>((resolve: any, reject: any): void => {
                
                var currentLine = document.lineAt(position.line);
                var currentRefs = new Array<string>();
                var regexRefVariable = /\b([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)\b/g;
                var matchRefVariable;

                while ((matchRefVariable = regexRefVariable.exec(currentLine.text)) != null) {
                    currentRefs.push(matchRefVariable[1]);
                }

                currentRefs = currentRefs.filter(m => {
                    return currentLine.text.indexOf(m) >= 0 && position.character >= 0
                    && currentLine.text.indexOf(m) >= position.character - m.length
                    && currentLine.text.indexOf(m) <= position.character
                });

                var definitions = new Array<vscode.Definition>();

                if (currentRefs.length > 0) {

                    for (var i = 0; i < document.lineCount; i++) {
                        var line = document.lineAt(i);
                        var matchFunction = /function\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)\s*\(/.exec(line.text);
                        var matchVariable = /var\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line.text);
                        var matchConstante = /const\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line.text);
                        var matchMxmlVariable = /\bid\s*=\s*"([^"]+)"/.exec(line.text);
        
                        [matchFunction, matchVariable, matchMxmlVariable, matchConstante].forEach(matchVar => {
                            if (matchVar) {
                                var defName = matchVar[1];

                                if (currentRefs.find(m => m == defName)) {
                                    var start = new vscode.Position(i, line.text.indexOf(defName));
                                    var end = new vscode.Position(i, line.text.indexOf(defName) + defName.length);
                                    var range = new vscode.Range(start, end);
            
                                    definitions.push(new vscode.Location(document.uri, range));
                                }
                            }
                        });
                    }
                }

                resolve(definitions);
            });
    }
}
