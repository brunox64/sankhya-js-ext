
import { DocumentSymbol, SymbolKind, DocumentSymbolParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class JsDocumentSymbolProvider {
    
    public provideDocumentSymbols(document:TextDocument, documentSymbolParams:DocumentSymbolParams): DocumentSymbol[] {

        var lines:string[] = document.getText().split(/\r?\n/g);

        var symbols:DocumentSymbol[] = [];
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

                    var start = {line: i, character: varIndex};
                    var end = {line: i, character: varIndex + varName.length};
                    var range = {start, end};

                    symbols.push({ name: varName, range: range, kind: SymbolKind.Variable, selectionRange: range });
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

                var start = {line: i, character: varIndex};
                var end = {line: i, character: varIndex + varName.length};
                var range = {start, end};

                symbols.push({ name: varName, range: range, kind: SymbolKind.Variable, selectionRange: range });
            }
        }

        return symbols;
    }
}
