import * as vscode from 'vscode';

export default class AsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        
            return new Promise<any>((resolve: any, reject: any): void => {
                var symbols = [];

                for (var i = 0; i < document.lineCount; i++) {
                    var line = document.lineAt(i);
                    var matchFunction = /function\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)\s*\(/.exec(line.text);
                    var matchVariable = /var\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line.text);
                    var matchConstante = /const\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line.text);
                    var matchMxmlVariable = /\bid\s*=\s*"([^"]+)"/.exec(line.text);

                    if (matchFunction) {
                        var start = new vscode.Position(i, line.text.indexOf(matchFunction[1]));
                        var end = new vscode.Position(i, line.text.indexOf(matchFunction[1]) + matchFunction[1].length);
                        var range = new vscode.Range(start, end);

                        symbols.push({
                            name: matchFunction[1],
                            kind: vscode.SymbolKind.Function,
                            location: new vscode.Location(document.uri, range)
                        })
                    }

                    [matchVariable, matchMxmlVariable, matchConstante].forEach(matchVar => {
                        if (matchVar) {
                            var start = new vscode.Position(i, line.text.indexOf(matchVar[1]));
                            var end = new vscode.Position(i, line.text.indexOf(matchVar[1]) + matchVar[1].length);
                            var range = new vscode.Range(start, end);

                            symbols.push({
                                name: matchVar[1],
                                kind: vscode.SymbolKind.Variable,
                                location: new vscode.Location(document.uri, range)
                            })
                        }
                    });
                }

                resolve(symbols);
            });
    }
}
