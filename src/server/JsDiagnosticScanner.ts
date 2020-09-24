
import JsCommentSkipper from '../util/JsCommentSkipper';
import JsStringSkipper from '../util/JsStringSkipper';
import Region from '../util/Region';
import SkipperChain from '../util/SkipperChain';
import StringSkipper from '../util/StringSkipper';
import StringUtil from '../util/StringUtil';
import { Diagnostic, DiagnosticSeverity, Range, Location, DiagnosticRelatedInformation, TextDocuments, Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import Skipper from '../util/Skipper';
import DirectivesScanner from './DirectivesScanner';
import fs from 'fs';
import JsCallSkipper from '../util/JsCallSkipper';
import JsArraySkipper from '../util/JsArraySkipper';
import JsObjectSkipper from '../util/JsObjectSkipper';

export default class JsDiagnosticScanner {
    private directivesScanner:DirectivesScanner;

    public constructor(directivesScanner:DirectivesScanner){
        this.directivesScanner = directivesScanner;
    }

    private documents!: TextDocuments<TextDocument>;
    private document!:TextDocument;
    private content!:string;
    private collection!:Map<string,Diagnostic[]>;
    private regFnControllerIn!:Region;
    private controller!:string;
    private skipper!:Skipper;
    private strSkipped!:number[];
    private regFnArray!:Region[];
    private regArray!:Region|null;
    private maSelfDef!:RegExpExecArray[];
    private maSelfRef!:RegExpExecArray[];
    private maVarGlobais!:RegExpExecArray[];

    public scan(document:TextDocument, documents: TextDocuments<TextDocument>, connection:Connection):void {
        this.documents = documents;
        this.document = document;
        this.collection = new Map();

        if (document.languageId == 'javascript' && document.uri.endsWith('.js')) {
            this.collection.set(document.uri, new Array<Diagnostic>());
            this.analizeJsController();
            this.validarHtmlBinds();
        } else if (document.languageId == 'html' && document.uri.endsWith('.html')) {
            this.validarHtmlBinds();
        }

        this.collection.forEach((coll, uri) => {
            connection.sendDiagnostics({ uri: uri, diagnostics: coll }); 
        });
    }

    private analizeJsController():void {
        var document = this.document;
        var content = this.content = document.getText();
            
        var regexController = /\)\s*\.\s*controller\s*\(/g;
        var matchController = regexController.exec(content);
        
        if (matchController) {
            var regController = StringUtil.getJsRegion(content, matchController.index, '(', ')');

            if (regController) {
                var regArray = this.regArray = StringUtil.getJsRegion(content, regController.start(), '[', ']');

                if (regArray) {
                    var regFnController = StringUtil.getJsRegion(content, regArray.start(), '{', '}');

                    if (regFnController) {
                        
                        var regFnControllerIn = this.regFnControllerIn = new Region(regFnController.start(), regFnController.end());
                        regFnControllerIn.add(-1);
                        this.controller = content.substring(regFnControllerIn.start(), regFnControllerIn.end());

                        this.extractAllFunctions();
                        this.createStrSkipped();
                        this.extractAllRefDefVars();
                        this.scanInvalidRefsSelfScope();
                        this.scanInvalidRefs();
                        this.validarVariaveisDuplicadas();
                    }
                }
            }
        }
    }

    private createStrSkipped():void {
        var controller = this.controller;

        var skipper = new SkipperChain();
        skipper.addSkipper(new JsCommentSkipper());
        skipper.addSkipper(new JsStringSkipper());

        var strSkipper = new StringSkipper(controller, new Region(0, controller.length));
        var strSkipped = strSkipper.skip(skipper);

        this.skipper = skipper;
        this.strSkipped = strSkipped;
    }

    private scanInvalidRefs():void {
        var document = this.document;
        var collection = this.collection.get(document.uri)!;
        var content = this.content;
        var regArray = this.regArray;
        var regFnArray = this.regFnArray;
        var strSkipped = this.strSkipped;
        var skipper = this.skipper;
        var regFnControllerIn = this.regFnControllerIn;
        var controller = this.controller;

        var excludedWords:string[] = [
            'if','else','case','switch','true','false','while','for','in','of','instanceof','type','var','let','const','break','continue',
            'throw','function','new','undefined','null','return','async','await','delete','this','isNaN',
            'Date','Array','Object','String','Number','Boolean','JSON','setInterval','setTimeout','window','document',
            'parseInt','parseFloat','$','jQuery','angular','default','Error','Promise','console','RegExp','Math','XMLHttpRequest'
        ];

        // verificar se alguma variável dentro da function não está definida
        var variaveisGlobais:string[] = [];

        var regexArgName = /[a-zA-Z\$_][a-zA-Z0-9_\$]*/g;
        var regexVar = /(var|const|let|function)\s+([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
        var matchArgName:RegExpExecArray|null = null;
        var matchVar:RegExpExecArray|null = null;

        var argsFnController = StringUtil.getJsCallArgs(content, regArray!.start(), '(', ')');
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

        var mVarGlobais:RegExpExecArray[] = this.maVarGlobais = [];

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
                mVarGlobais.push(matchVar);
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
                var regexArrow = /\)\s*=>/g;
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
                var regexRefVar = /[^a-zA-Z0-9\$_\.]\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*[^a-zA-Z0-9\$_]/g;
                var matchRefVar:RegExpExecArray|null = null;
                while ((matchRefVar = regexRefVar.exec(fnContent)) != null) {
                    
                    var pularRefVar = false;
                    for (var idx = matchRefVar.index; idx < matchRefVar.index + matchRefVar[0].length; idx++) {
                        if (fnStrSkipped.indexOf(idx) == -1) {
                            pularRefVar = true;

                            idx++;
                            regexRefVar.lastIndex = idx;
                            while (regexRefVar.lastIndex < fnContent.length && fnStrSkipped.indexOf(regexRefVar.lastIndex) == -1) {
                                regexRefVar.lastIndex++;
                            }

                            break;
                        }
                    }
                    if (pularRefVar) {
                        continue;
                    }

                    var isValidRef = true;

                    if ((matchRefVar[0].startsWith(',') 
                        || matchRefVar[0].startsWith('\r') 
                        || matchRefVar[0].startsWith('\n')
                        || matchRefVar[0].startsWith('{')) 
                        && matchRefVar[0].endsWith(':')) {
                            isValidRef = false;
                    }

                    var varName = matchRefVar[1];
                    var varIndex = matchRefVar.index + matchRefVar[0].indexOf(varName);

                    if (isValidRef && excludedWords.indexOf(varName) > -1) {
                        isValidRef = false;
                    }

                    if (isValidRef) {
                        // tentar achar essa var local e depois global
                        var found = false;

                        for (var idx = 0; idx < variaveisLocais.length; idx++) {
                            if (variaveisLocais[idx] == varName && indexVarLocais[idx] <= varIndex) {
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
                            var range = {start, end};
                            var message = 'referência a variável '+content.substring(region.start(), region.end())+' não definida!';
                            var severity = DiagnosticSeverity.Warning;

                            var relatedInformation:DiagnosticRelatedInformation[] = [ 
                                { 
                                    location: { 
                                        uri: document.uri, 
                                        range: range 
                                    }, 
                                    message: message
                                } 
                            ];
                            
                            collection.push({range,message,severity,relatedInformation});
                        }
                    }
                    
                    regexRefVar.lastIndex = matchRefVar.index + matchRefVar[0].length - 1;
                }

                // regexFnSign.lastIndex = bodyFnDef.end();
            }
        }
    }

    private scanInvalidRefsSelfScope():void {
        var document:TextDocument = this.document;
        var collection = this.collection.get(document.uri)!;
        var content:string = this.content;
        var regFnControllerIn:Region = this.regFnControllerIn;
        var maSelfDef:RegExpExecArray[] = this.maSelfDef;
        var maSelfRef:RegExpExecArray[] = this.maSelfRef;

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
                var range = {start, end};
                var message = 'referência a propriedade '+content.substring(region.start(), region.end())+' não definida!';
                var severity = DiagnosticSeverity.Warning;

                var relatedInformation:DiagnosticRelatedInformation[] = [ 
                    { 
                        location: { 
                            uri: document.uri, 
                            range: range 
                        }, 
                        message: message
                    } 
                ];

                collection.push({range,message,severity,relatedInformation});
            }
        }
    }

    private extractAllRefDefVars():void {
        var controller = this.controller;
        var strSkipped = this.strSkipped;
        var regFnArray = this.regFnArray;

        var maSelfDef:RegExpExecArray[] = this.maSelfDef = [];
        var maSelfRef:RegExpExecArray[] = this.maSelfRef = [];
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
    }

    private extractAllFunctions():void {
        var controller = this.controller;

        var regFnArray:Region[] = [];
        var regFnDef:Region|null = StringUtil.getJsRegion(controller, 0, '{', '}');

        while (regFnDef != null) {
            regFnArray.push(regFnDef);
            regFnDef = StringUtil.getJsRegion(controller, regFnDef.end(), '{', '}');
        }

        this.regFnArray = regFnArray;
    }

    private validarVariaveisDuplicadas() {
        var document = this.document;
        var collection = this.collection.get(document.uri)!;
        var content = this.content;
        var regFnControllerIn = this.regFnControllerIn;
        var controller = this.controller;
        var maSelfDef = this.maSelfDef;
        var maVarGlobais = this.maVarGlobais;

        var mProperties:RegExpExecArray[] = [];
        var regexFinalProp = / *[=\r\n;]/g;
        var mAllVariables:RegExpExecArray[] = [];

        mAllVariables = mAllVariables.concat(maSelfDef, maVarGlobais);
        
        for (var matchDef of mAllVariables) {
            
            if (matchDef[1] == 'function') {
                continue;
            }

            var index = matchDef.index + matchDef[0].length;
            regexFinalProp.lastIndex = index;
            var matchFinalProp = regexFinalProp.exec(controller);

            if (matchFinalProp != null && matchFinalProp.index == index) {
                mProperties.push(matchDef);
            }
        }

        for (var matchDef of mProperties) {
            var propName = matchDef[2];
            var duplicada = false;

            var matchDefOther:RegExpExecArray|null = null;
            var propNameOther:string|null = null;

            for (var item of mProperties) {
                matchDefOther = item;
                propNameOther = matchDefOther[2];

                if (matchDef != matchDefOther) {
                    if (propNameOther == propName) {
                        duplicada = true;
                        break;
                    }
                }
            }

            if (duplicada) {
                var varName = propName;
                var varIndex = matchDef.index + matchDef[0].indexOf(varName);

                var region = new Region(varIndex, varIndex);
                region.move(regFnControllerIn.start());
                region.setLength(varName.length);

                var start = document.positionAt(region.start());
                var end = document.positionAt(region.end());
                var range = {start, end};
                var message = 'propriedade '+content.substring(region.start(), region.end())+' duplicada!';
                var severity = DiagnosticSeverity.Warning;

                var varNameOther = propNameOther;
                var varIndexOther = matchDefOther!.index + matchDefOther![0].indexOf(varNameOther!);

                var regionOther = new Region(varIndexOther, varIndexOther);
                regionOther.move(regFnControllerIn.start());
                regionOther.setLength(varNameOther!.length);

                var startOther = document.positionAt(regionOther.start());
                var endOther = document.positionAt(regionOther.end());
                var rangeOther = {start: startOther, end: endOther};
                var messageOther = 'declaração '+content.substring(regionOther.start(), regionOther.end())+' conflitante!';

                var relatedInformation:DiagnosticRelatedInformation[] = [ 
                    { 
                        location: { 
                            uri: document.uri, 
                            range: rangeOther 
                        }, 
                        message: messageOther
                    } 
                ];

                collection.push({range,message,severity,relatedInformation});
            }
        }
    }

    private validarHtmlBinds() {
        var documents = this.documents;
        var document = this.document;

        if (document.uri.endsWith(".controller.js") || document.uri.endsWith(".tpl.html")) {
            var docHtml:TextDocument|undefined;
            var contentJs:string|undefined;

            if (document.languageId == 'javascript' && document.uri.endsWith('.js')) {
                contentJs = this.document.getText();
                docHtml = documents.get(document.uri.replace(/\.controller\.js$/g,'.tpl.html'));
            } else {
                docHtml = this.document;

                var pathFileJs = new URL(docHtml.uri.replace(/\.tpl\.html$/g, '.controller.js')).pathname;

                if (fs.existsSync(pathFileJs) && fs.statSync(pathFileJs).isFile()) {
                    contentJs = fs.readFileSync(pathFileJs).toString('utf-8');
                }
            }

            if (contentJs && docHtml) {

                var collection:Diagnostic[]|undefined = this.collection.get(docHtml.uri);

                if (!collection) {
                    collection = [];
                    this.collection.set(docHtml.uri, collection);
                }

                var contentHtml = docHtml.getText();

                var variaveisController:string[] = [];
                var variaveisScope:string[] = [];

                var regexVarController = /self\.([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*[\r\n;=]/g;
                var regexVarScope = /\$scope\.([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*[\r\n;=]/g;
                var matchVarController:RegExpExecArray|null = null;
                var matchVarScope:RegExpExecArray|null = null;

                while (matchVarController = regexVarController.exec(contentJs)) {
                    variaveisController.push(matchVarController[1]);
                }
                while (matchVarScope = regexVarScope.exec(contentJs)) {
                    variaveisScope.push(matchVarScope[1]);
                }

                var standAloneDirectives:string[] = [
                    'ng-bind','ng-if','ng-show','ng-change','ng-checked','ng-class','ng-click','ng-dblclick','ng-disabled',
                    'ng-focus','ng-hide','ng-keydown','ng-keypress','ng-keyup','ng-model','ng-mousedown','ng-mouseenter',
                    'ng-mouseleave','ng-mousemove','ng-mouseup','ng-repeat','ng-src','ng-style','ng-value','sk-value','sk-on-click'
                ];

                var excludedWords:string[] = [
                    'if','else','case','switch','true','false','while','for','in','of','instanceof','type','var','let','const','break','continue',
                    'throw','function','new','undefined','null','return','async','await','delete','this','isNaN',
                    'Date','Array','Object','String','Number','Boolean','JSON','setInterval','setTimeout','window','document',
                    'parseInt','parseFloat','$','jQuery','angular','default','Error','Promise','console','RegExp','Math','XMLHttpRequest'
                ];

                var regexTagDef = /<\s*([a-zA-Z_\-]+)([^/>]+)>/g;
                var matchTagDef:RegExpExecArray|null = null;
                while (matchTagDef = regexTagDef.exec(contentHtml)) {
                    var tagName = matchTagDef[1];
                    var tagBody = matchTagDef[0];
                    var tagInfo = this.directivesScanner.tagByName.get(tagName);

                    var regexAttr = /([a-zA-Z_\-]+)\s*=\s*"/g;
                    var matchAttr:RegExpExecArray|null = null;
                    while (matchAttr = regexAttr.exec(tagBody)) {
                        var attrName = matchAttr[1];
                        var attrRegValue = StringUtil.getJsRegionString(tagBody, matchAttr.index);
                        
                        var attrInfo = tagInfo ? tagInfo.attributes.find(m => m.name == attrName) : undefined;
                        var attrNgInfo = !attrInfo ? standAloneDirectives.find(m => m == attrName) : undefined;

                        if (!( (attrNgInfo || (attrInfo && (attrInfo.value.indexOf('=') > -1 || attrInfo.value.indexOf('&') > -1))) && attrRegValue) ) {
                            continue;
                        }

                        attrRegValue.add(-1);

                        var skipper = new SkipperChain();
                        skipper.addSkipper(new JsCommentSkipper());
                        skipper.addSkipper(new JsStringSkipper());
                        skipper.addSkipper(new JsCallSkipper());
                        skipper.addSkipper(new JsArraySkipper());
                        skipper.addSkipper(new JsObjectSkipper());

                        var attrValue = tagBody.substring(attrRegValue.start(), attrRegValue.end());
                        var strSkipper = new StringSkipper(attrValue, new Region(0, attrValue.length));
                        var strSkipped = strSkipper.skip(skipper);

                        if (attrName == 'ng-repeat') {
                            var regexNgRepeat = /([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s+in\s+/g;
                            var matchNgRepeat:RegExpExecArray|null = regexNgRepeat.exec(attrValue);
                            if (matchNgRepeat) {
                                var varName = matchNgRepeat[1];
                                if (variaveisScope.indexOf(varName) == -1) {
                                    variaveisScope.push(varName);
                                }
                            }
                        }

                        var regexRefVar = /\.?(ctrl\.)?([a-zA-Z\$_][a-zA-Z0-9_\$]*)/g;
                        var matchRefVar:RegExpExecArray|null = null;
                        while (matchRefVar = regexRefVar.exec(attrValue)) {

                            if (matchRefVar[0].startsWith('.') || strSkipped.indexOf(matchRefVar.index) == -1) {
                                continue;
                            }

                            var ctrlName = matchRefVar[1];
                            var varName = matchRefVar[2];
                            var found = true;

                            if (excludedWords.indexOf(varName) == -1) {
                                if (ctrlName) {
                                    if (variaveisController.indexOf(varName) == -1) {
                                        found = false;
                                    }
                                } else {
                                    if (variaveisScope.indexOf(varName) == -1) {
                                        found = false;
                                    }
                                }
                            }

                            if (!found) {
                                var varIndex = matchRefVar.index + matchRefVar[0].indexOf(varName);

                                var region = new Region(varIndex, varIndex);
                                region.move(attrRegValue.start());
                                region.move(matchTagDef.index);
                                region.setLength(varName.length);

                                var start = docHtml.positionAt(region.start());
                                var end = docHtml.positionAt(region.end());
                                var range = {start, end};
                                var message = 'referência a propriedade '+contentHtml.substring(region.start(), region.end())+' não definida!';
                                var severity = DiagnosticSeverity.Warning;

                                collection.push({range,message,severity});
                            }
                        }
                    }
                }
            }
        }
    }
}