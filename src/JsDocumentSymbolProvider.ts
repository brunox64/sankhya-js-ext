
import * as vscode from 'vscode';

export default class JsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    
    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        
            return new Promise<vscode.SymbolInformation[]>((resolve, reject) => {
                var symbols:vscode.SymbolInformation[] = [];

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

                            var start = new vscode.Position(i, varIndex);
                            var end = new vscode.Position(i, varIndex + varName.length);
                            var range = new vscode.Range(start, end);
    
                            symbols.push(new vscode.SymbolInformation(varName, vscode.SymbolKind.Variable, 'self', new vscode.Location(document.uri, range)));
                        }
                    }
                }

                resolve(symbols);
            });
    }
}
