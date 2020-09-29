
import { DocumentSymbol, SymbolKind, DocumentSymbolParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class JsDocumentSymbolProvider {
    
    public provideDocumentSymbols(document:TextDocument, documentSymbolParams:DocumentSymbolParams): DocumentSymbol[] {

        var content:string = document.getText();
        var lines:string[] = content.split(/\r?\n/g);

        var regexVariable = /^[ \t]*(self|\$scope)\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)[ \t]*[=,;\r\n]/g;

        var symbols:DocumentSymbol[] = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            regexVariable.lastIndex = 0;
            var matchVariable = regexVariable.exec(line);

            if (matchVariable) {
                var varName = matchVariable[2];
                var varIndex = matchVariable.index + matchVariable[0].indexOf(varName);

                var start = {line: i, character: varIndex};
                var end = {line: i, character: varIndex + varName.length};
                var range = {start, end};

                symbols.push({ name: varName, range: range, kind: SymbolKind.Variable, selectionRange: range });
            }
        }
        
        return symbols;
    }
}
