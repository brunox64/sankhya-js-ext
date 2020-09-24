
import { DocumentSymbol, SymbolKind, DocumentSymbolParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class AsDocumentSymbolProvider {
    
    public provideDocumentSymbols(document: TextDocument, documentSymbolParams:DocumentSymbolParams): DocumentSymbol[] {
    
        var lines:string[] = document.getText().split(/\r?\n/g);
        
        var symbols:DocumentSymbol[] = [];

        for (var i = 0; i < document.lineCount; i++) {
            var line = lines[i];
            var matchFunction = /function\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)\s*\(/.exec(line);
            var matchVariable = /var\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line);
            var matchConstante = /const\s*([a-zA-Z$_]+[a-zA-Z0-9_\-$]*)[\s:;=]/.exec(line);
            var matchMxmlVariable = /\bid\s*=\s*"([^"]+)"/.exec(line);

            if (matchFunction) {
                var start = {line: i, character: line.indexOf(matchFunction[1])};
                var end = {line: i, character: line.indexOf(matchFunction[1]) + matchFunction[1].length};
                var range = {start, end};

                symbols.push({
                    name: matchFunction[1],
                    kind: SymbolKind.Function,
                    range: range,
                    selectionRange: range
                })
            }

            [matchVariable, matchMxmlVariable, matchConstante].forEach(matchVar => {
                if (matchVar) {
                    var start = {line: i, character: line.indexOf(matchVar[1])};
                    var end = {line: i, character: line.indexOf(matchVar[1]) + matchVar[1].length};
                    var range = {start, end};

                    symbols.push({
                        name: matchVar[1],
                        kind: SymbolKind.Variable,
                        range: range,
                        selectionRange: range
                    })
                }
            });
        }

        return symbols;
    }
}
