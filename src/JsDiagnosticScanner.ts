import * as vscode from 'vscode';
import JsCommentSkipper from './JsCommentSkipper';
import JsStringSkipper from './JsStringSkipper';
import Region from './Region';
import SkipperChain from './SkipperChain';
import StringSkipper from './StringSkipper';
import StringUtil from './StringUtil';

export default class JsDiagnosticScanner {
    
    public scan(event:vscode.TextDocumentChangeEvent, diagnosticColl:vscode.DiagnosticCollection):void {
        var document = event.document;
        
        if (document.languageId == 'javascript' && document.uri.fsPath.endsWith('.controller.js')) {

            var excludedWords:string[] = [
                'if','else','case','switch','true','false','while','for','var','let','const','break','continue',
                'throw','function','new','undefined','null','return','async','await','delete','this','isNaN',
                'Date','Array','Object','String','Number','Boolean','JSON','setInterval','setTimeout','window','document',
                'parseInt','parseFloat','$','jQuery','angular'
            ];

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


                            var skipper = new SkipperChain();
                            skipper.addSkipper(new JsCommentSkipper());
                            skipper.addSkipper(new JsStringSkipper());

                            var strSkipper = new StringSkipper(controller, new Region(0, controller.length));
                            var strSkipped = strSkipper.skip(skipper);


                            var maSelfDef:RegExpExecArray[] = [];
                            var maSelfRef:RegExpExecArray[] = [];
                            var regexSelfDR = /[^a-zA-Z0-9_\$](self|\$scope)\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
                            var matchSelfDR = null;

                            while ((matchSelfDR = regexSelfDR.exec(controller)) != null) {
                                
                                if (strSkipped.indexOf(matchSelfDR.index) == -1) {
                                    continue;// está dentro de um comentário ou string
                                }

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
                                    var varName = matchRef[2];
                                    var varIndex = matchRef.index + matchRef[0].indexOf(varName);

                                    var region = new Region(varIndex, varIndex);
                                    region.move(regFnControllerIn.start());
                                    region.setLength(varName.length);

                                    var start = document.positionAt(region.start());
                                    var end = document.positionAt(region.end());
                                    var range = new vscode.Range(start, end);
                                    var message = 'referência a propriedade '+content.substring(region.start(), region.end())+' não definida!';
                                    var severity = vscode.DiagnosticSeverity.Warning;

                                    collection.push(new vscode.Diagnostic(range, message, severity));
                                }
                            }


                            // verificar se alguma variável dentro da function não está definida
                            var variaveisGlobais:string[] = [];

                            var regexArgName = /[a-zA-Z\$_][a-zA-Z0-9_\$]*/g;
                            var regexVar = /(var|const|let|function)\s+([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
                            var matchArgName:RegExpExecArray|null = null;
                            var matchVar:RegExpExecArray|null = null;

                            var argsFnController = StringUtil.getJsCallArgs(content, regArray.start(), '(', ')');
                            if (argsFnController.length > 0) {
                                
                                for (var argName of argsFnController) {
                                    regexArgName.lastIndex = 0;
                                    matchArgName = regexArgName.exec(argName);

                                    if (matchArgName) {
                                        argName = matchArgName[0];
                                        variaveisGlobais.push(argName);
                                    }
                                }
                            }

                            regexVar.lastIndex = 0;
                            matchVar = null;
                            while ((matchVar = regexVar.exec(controller)) != null) {
                                
                                if (strSkipped.indexOf(matchVar.index) == -1) {
                                    continue;// está dentro de um comentário ou string
                                }

                                var found = false;
                                for (var regFn of regFnArray) {
                                    if (matchVar.index >= regFn.start() && matchVar.index < regFn.end()) {
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    variaveisGlobais.push(matchVar[2]);
                                }
                            }

                            // fazer a validação de referência dentro de cada função
                            var regexFnSign = /function\s+([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*\(/g;
                            var matchFnSign:RegExpExecArray|null = null;
                            while ((matchFnSign = regexFnSign.exec(controller)) != null) {

                                if (strSkipped.indexOf(matchFnSign.index) == -1) {
                                    continue;// está dentro de um comentário ou string
                                }
                                
                                var argsFnDef = StringUtil.getJsCallArgs(controller, matchFnSign.index, '(', ')');
                                var bodyFnDef = StringUtil.getJsRegion(controller, matchFnSign.index, '{', '}');

                                if (argsFnDef && bodyFnDef) {

                                    var innerFunction = false;
                                    for (var regFn of regFnArray) {
                                        if (regFn.start() < bodyFnDef.start() && regFn.end() > bodyFnDef.end()) {
                                            innerFunction = true;
                                            break;
                                        }
                                    }

                                    if (innerFunction) {
                                        continue;
                                    }

                                    var indexVarLocais:number[] = [];
                                    var variaveisLocais:string[] = [];

                                    for (var argName of argsFnDef) {
                                        regexArgName.lastIndex = 0;
                                        matchArgName = regexArgName.exec(argName);
    
                                        if (matchArgName) {
                                            indexVarLocais.push(0);
                                            variaveisLocais.push(matchArgName[0]);
                                        }
                                    }

                                    var fnContent = controller.substring(bodyFnDef.start(), bodyFnDef.end());

                                    var fnStrSkipper = new StringSkipper(fnContent, new Region(0, fnContent.length));
                                    var fnStrSkipped = fnStrSkipper.skip(skipper);

                                    regexVar.lastIndex = 0;
                                    matchVar = null;
                                    while ((matchVar = regexVar.exec(fnContent)) != null) {

                                        if (fnStrSkipped.indexOf(matchVar.index) == -1) {
                                            continue;
                                        }

                                        indexVarLocais.push(matchVar.index);
                                        variaveisLocais.push(matchVar[2]);
                                    }

                                    // extrair arrow functions arguments
                                    var regexArrow = /[\)a-zA-Z0-9\$_]\s*=>/g;
                                    var regArrowArgs = StringUtil.getJsRegion(fnContent, 0, '(', ')');
                                    while (regArrowArgs != null) {
                                        
                                        // validar se é arrow function
                                        regexArrow.lastIndex = regArrowArgs.end()-1;

                                        var matchArrow = regexArrow.exec(fnContent);

                                        if (matchArrow && matchArrow.index == regArrowArgs.end()-1) {
                                            
                                            var arrowArgs = StringUtil.getJsCallArgs(fnContent, regArrowArgs.start(), '(', ')');

                                            for (var argName of arrowArgs) {
                                                regexArgName.lastIndex = 0;
                                                matchArgName = regexArgName.exec(argName);
            
                                                if (matchArgName) {
                                                    indexVarLocais.push(regArrowArgs.start());
                                                    variaveisLocais.push(matchArgName[0]);
                                                }
                                            }                                            
                                        }

                                        regArrowArgs = StringUtil.getJsRegion(fnContent, regArrowArgs.start()+1, '(', ')');                                     
                                    }

                                    // extrair argumentos de arrow functions de 1 argumento
                                    var regexArrowOne = /([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*=>/g;
                                    var matchArrowOne:RegExpExecArray|null = null;
                                    while ((matchArrowOne = regexArrowOne.exec(fnContent)) != null) {
                                        indexVarLocais.push(matchArrowOne.index);
                                        variaveisLocais.push(matchArrowOne[1]);
                                    }

                                    // extrair argumentos de functions locais
                                    var regexFnLocal = /function\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)?\s*\(/g;
                                    var matchFnLocal:RegExpExecArray|null = null;
                                    while ((matchFnLocal = regexFnLocal.exec(fnContent)) != null) {
                                        var argsFnLocal = StringUtil.getJsCallArgs(fnContent, matchFnLocal.index, '(', ')');

                                        for (var argName of argsFnLocal) {
                                            regexArgName.lastIndex = 0;
                                            matchArgName = regexArgName.exec(argName);
        
                                            if (matchArgName) {
                                                indexVarLocais.push(matchFnLocal.index);
                                                variaveisLocais.push(matchArgName[0]);
                                            }
                                        }
                                    }


                                    // avaliar todas as referencias
                                    var regexRefVar = /[\r\n\+\-\*/&|;\?:=\(,\[\{][\t ]*([a-zA-Z\$_][a-zA-Z0-9_\$]*)(\s*:)?/g;
                                    var matchRefVar:RegExpExecArray|null = null;
                                    while ((matchRefVar = regexRefVar.exec(fnContent)) != null) {
                                        
                                        if (fnStrSkipped.indexOf(matchRefVar.index) == -1) {
                                            continue;
                                        }

                                        if ((matchRefVar[0].startsWith(',') 
                                            || matchRefVar[0].startsWith('\r') 
                                            || matchRefVar[0].startsWith('\n')
                                            || matchRefVar[0].startsWith('{')) 
                                            && matchRefVar[0].endsWith(':')) {
                                            continue;
                                        }

                                        var varName = matchRefVar[1];
                                        var varIndex = matchRefVar.index + matchRefVar[0].indexOf(varName);

                                        if (excludedWords.indexOf(varName) > -1) {
                                            continue;
                                        }

                                        // tentar achar essa var local e depois global
                                        var found = false;

                                        for (var idx = 0; idx < variaveisLocais.length; idx++) {
                                            if (variaveisLocais[idx] == varName && indexVarLocais[idx] < varIndex) {
                                                found = true;
                                                break;
                                            }
                                        }

                                        for (var idx = 0; idx < variaveisGlobais.length; idx++) {
                                            if (variaveisGlobais[idx] == varName) {
                                                found = true;
                                                break;
                                            }
                                        }

                                        if (!found) {
                                            var region = new Region(varIndex, varIndex);
                                            region.move(bodyFnDef.start());
                                            region.move(regFnControllerIn.start());
                                            region.setLength(varName.length);

                                            var start = document.positionAt(region.start());
                                            var end = document.positionAt(region.end());
                                            var range = new vscode.Range(start, end);
                                            var message = 'referência a variável '+content.substring(region.start(), region.end())+' não definida!';
                                            var severity = vscode.DiagnosticSeverity.Warning;

                                            collection.push(new vscode.Diagnostic(range, message, severity));
                                        }
                                    }

                                    // regexFnSign.lastIndex = bodyFnDef.end();
                                }
                            }
                        }
                    }
                }
            }


            diagnosticColl.set(document.uri, collection);
        }
    }
}