'use strict';
import * as vscode from 'vscode';
import AsDefinitionProvider from './AsDefinitionProvider';
import AsDocumentSymbolProvider from './AsDocumentSymbolProvider';
import JsCompletionProvider from './JsCompletionProvider';
import JsDefinitionProvider from './JsDefinitionProvider';
import JsDocumentSymbolProvider from './JsDocumentSymbolProvider';
import Region from './Region';
import StringUtil from './StringUtil';

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "html" }, new JsCompletionProvider(), '<', ' '
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: "javascript" }, new JsDocumentSymbolProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: "javascript" }, new JsDefinitionProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: "actionscript" }, new AsDocumentSymbolProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: "actionscript" }, new AsDefinitionProvider()
        )
    );



    var diagnosticColl = vscode.languages.createDiagnosticCollection('javascript');

    vscode.workspace.onDidChangeTextDocument(event => {
        var document = event.document;
        
        if (document.languageId == 'javascript' && document.uri.fsPath.endsWith('.controller.js')) {

            var collection = new Array<vscode.Diagnostic>();
            var content = document.getText();
            
            var regexController = /\)\s*\.\s*controller\s*\(/g;
            var matchController = regexController.exec(content);
            
            if (matchController) {
                var regController = StringUtil.getJsRegion(content, matchController.index, '(', ')');

                if (regController) {
                    var regArray = StringUtil.getJsRegion(content, regController.start(), '[', ']');

                    if (regArray) {
                        var regFnController = StringUtil.getJsRegion(content, regArray.start(), '{', '}');

                        if (regFnController) {
                            var regFnControllerIn = new Region(regFnController.start(), regFnController.end());
                            regFnControllerIn.add(-1);
                            var controller = content.substring(regFnControllerIn.start(), regFnControllerIn.end());
                            var regFnArray:Region[] = [];
                            var regFnDef:Region|null = StringUtil.getJsRegion(controller, 0, '{', '}');

                            while (regFnDef != null) {
                                regFnArray.push(regFnDef);
                                regFnDef = StringUtil.getJsRegion(controller, regFnDef.end(), '{', '}');
                            }

                            var maSelfDef:RegExpExecArray[] = [];
                            var maSelfRef:RegExpExecArray[] = [];
                            var regexSelfDR = /[^a-zA-Z0-9_\$](self|\$scope)\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
                            var matchSelfDR = null;

                            while ((matchSelfDR = regexSelfDR.exec(controller)) != null) {
                                
                                var found = false;
                                for (var regFn of regFnArray) {
                                    if (matchSelfDR.index >= regFn.start() && matchSelfDR.index < regFn.end()) {
                                        maSelfRef.push(matchSelfDR);
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    maSelfDef.push(matchSelfDR);
                                }
                            }

                            for (var matchRef of maSelfRef) {

                                if (matchRef[2].indexOf('$') == 0) {
                                    continue;
                                }

                                var found = false;
                                var refName = matchRef[1] + matchRef[2];

                                for (var matchDef of maSelfDef) {
                                    var defName = matchDef[1] + matchDef[2];

                                    if (refName == defName) {
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    var region = new Region(matchRef.index, matchRef.index);
                                    region.move(regFnControllerIn.start());
                                    region.setLength(matchRef[0].length);
                                    region.move(+1);// compensar primeiro caractere da regex
                                    region.setLength(region.getLength()-1);

                                    var start = document.positionAt(region.start());
                                    var end = document.positionAt(region.end());
                                    var range = new vscode.Range(start, end);
                                    var message = 'referência a propriedade '+content.substring(region.start(), region.end())+' não definida!';
                                    var severity = vscode.DiagnosticSeverity.Warning;

                                    collection.push(new vscode.Diagnostic(range, message, severity));
                                }
                            }
                        }
                    }
                }
            }


            diagnosticColl.set(document.uri, collection);
        }
    });
}
