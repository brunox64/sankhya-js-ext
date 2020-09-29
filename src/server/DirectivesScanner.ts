import TagInfo from "../model/TagInfo";
import fs from 'fs';
import TreeVisitor from "../util/TreeVisitor";
import WalkFileTree from "../util/WalkFileTree";
import StringUtil from "../util/StringUtil";
import Region from "../util/Region";
import TagAttribute from "../model/TagAttribute";
import SkipperChain from "../util/SkipperChain";
import StringSkipper from "../util/StringSkipper";
import MethodInfo from "../model/MethodInfo";
import ServiceInfo from "../model/ServiceInfo";
import JsCommentSkipper from "../util/JsCommentSkipper";
import JsStringSkipper from "../util/JsStringSkipper";

export default class DirectivesScanner {
    public tagByName:Map<string,TagInfo> = new Map();
    public serviceByName:Map<string,ServiceInfo> = new Map();

    public clear():void {
        this.tagByName.clear();
        this.serviceByName.clear();
    }
    
    public scanFolder(folder:string):void {
        this.walkFilesTree(folder);
    }

    public scanFile(file:string):void {
        if (file.endsWith('.js')) {
            this.collectDirectives(file);
        }
    }

    public onWillDeleteFile(files: string[]) {
        var scanner = new DirectivesScanner();

        for (var file of files) {
            scanner.scanFile(file);
        }

        var self = this;

        scanner.tagByName.forEach((value, key) => {
            self.tagByName.delete(key);
        });

        scanner.serviceByName.forEach((value, key) => {
            self.serviceByName.delete(key);
        });
    }

    private walkFilesTree(folder:string) {

        var visitor = new TreeVisitor();
        var walker = new WalkFileTree(folder, visitor);
        walker.walkFilesTree();

        var files = visitor.files;
        var self = this;

        for (var file of files) {
            self.collectDirectives(file);
        }
    }

    private collectDirectives(file:string):void {
        var content = fs.readFileSync(file).toString('utf-8');

        this.collectHtmlTags(content);
        this.collectServices(content);
    }

    private collectServices(content:string) {
        var serviceByName = this.serviceByName;
        
        var regexService = /\.\s*service\s*\(\s*['"]([^'"]+)['"]/g;
        var matchService:RegExpExecArray|null = null;

        var skipper = new SkipperChain();
        skipper.addSkipper(new JsCommentSkipper());
        skipper.addSkipper(new JsStringSkipper());
        
        while (matchService = regexService.exec(content)) {
            if (matchService) {
                var serviceName:string = matchService[1];
                var regService = StringUtil.getJsRegion(content, matchService.index, '(', ')');
                if (regService) {
                    var regArray = StringUtil.getJsRegion(content, regService.start(), '[', ']');
                    if (regArray) {
                        var regFnService = StringUtil.getJsRegion(content, regArray.start(), '{', '}');
                        if (regFnService) {
                            var regFnServiceIn = new Region(regFnService.start(), regFnService.end());
                            var fnBody = content.substring(regFnServiceIn.start(), regFnServiceIn.end());

                            var strSkipper = new StringSkipper(fnBody, new Region(0, fnBody.length));
                            var strSkipped = strSkipper.skip(skipper);

                            var allFunctions:RegExpExecArray[] = [];
                            var allExpFunctions:RegExpExecArray[] = [];

                            var regexFunction = /function\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*\(/g;
                            var regexExpFunction = /self\s*\.\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)\s*=\s*([a-zA-Z\$_][a-zA-Z0-9_\$]*)[ \t]*[;\r\n]/g;

                            var matchFunction:RegExpExecArray|null = null;
                            var matchExpFunction:RegExpExecArray|null = null;

                            while (matchFunction = regexFunction.exec(fnBody)) {
                                allFunctions.push(matchFunction);
                            }

                            while (matchExpFunction = regexExpFunction.exec(fnBody)) {
                                var pularFn = false;
                                for (var index = matchExpFunction.index; index < matchExpFunction.index + matchExpFunction[0].length; index++) {
                                    if (strSkipped.indexOf(index) == -1) {
                                        pularFn = true;
                                        break;
                                    }
                                }

                                if (!pularFn) {
                                    allExpFunctions.push(matchExpFunction);
                                }
                            }

                            var methods:MethodInfo[] = [];

                            var nameLeft:string;
                            var nameLeftExp:string;
                            var nameRight:string;
                            for (var i = 0; i < allExpFunctions.length; i++) {
                                matchExpFunction = allExpFunctions[i];
                                nameLeft = matchExpFunction[1];
                                nameLeftExp = matchExpFunction[2];

                                for (var j = 0; j < allFunctions.length; j++) {
                                    matchFunction = allFunctions[j];
                                    nameRight = matchFunction[1];

                                    if (nameLeftExp == nameRight) {
                                        var doc = "";
                                        var regFnArgs = StringUtil.getJsRegion(fnBody, matchFunction.index, '(', ')');
                                        if (regFnArgs) {
                                            doc = fnBody.substring(matchFunction.index, regFnArgs.end());
                                        }

                                        methods.push(new MethodInfo(nameLeft, doc));
                                        break;
                                    }
                                }
                            }

                            serviceByName.set(serviceName, new ServiceInfo(serviceName, methods));
                        }
                    }
                }
            }
        }
    }

    private collectHtmlTags(content:string) {
        var tagByName = this.tagByName;

        var regexDirective = /\.\s*directive\s*\(\s*['"]([^'"]+)['"]/g;
        var match = null;
        var args = null;

        while ((match = regexDirective.exec(content)) != null) {
            args = StringUtil.getJsCallArgs(content, match.index, '(', ')');

            if (args.length == 2) {
                var argName = args[0];
                var argArray = args[1];

                var indexFn = argArray.indexOf('function');
                var indexAr = argArray.indexOf('[');

                if (indexAr > -1 && indexFn > -1 && indexAr < indexFn) {
                    args = StringUtil.getJsCallArgs(argArray, 0, '[', ']');

                    if (args.length > 0) {
                        var argDirDef = args[args.length-1];
                        var scopes:number[] = [];
                        var regexScope = /\bscope\s*:\s*\{/g;
                        var matchScope = null;

                        while ((matchScope = regexScope.exec(argDirDef)) != null) {
                            scopes.push(matchScope.index);
                        }

                        if (scopes.length == 1) {
                            args = StringUtil.getJsCallArgs(argDirDef, scopes[0], '{', '}');

                            if (args.length > 0) {
                                
                                var regName = StringUtil.getJsRegionString(argName, 0) || Region.newRegionByContent(argName);
                                regName.add(-1);
                                
                                var tagName = StringUtil.camelToHtml( argName.substring(regName.start(), regName.end()) );

                                var attributes:TagAttribute[] = [];
                                var tagInfo = new TagInfo(tagName, attributes);

                                args.forEach(arg => {
                                    var regValue = StringUtil.getJsRegionString(arg, 0);
                                    var regexName = /([a-z][a-z0-9_\-\$]+)\s*:/ig;
                                    var matchName = regexName.exec(arg);

                                    if (matchName != null && regValue != null) {
                                        regValue.add(-1);
                                        var attrValue = arg.substring(regValue.start(), regValue.end());
                                        var attrName = matchName[1];
                                        var regexOpts = /^[@=&?<]+/g;
                                        var matchOpts = regexOpts.exec(attrValue);

                                        if (matchOpts != null) {
                                            if (matchOpts[0] != attrValue && matchOpts[0].length < attrValue.length) {
                                                attrName = attrValue.substring(matchOpts[0].length);
                                                attrValue = matchOpts[0];
                                            }
                                        }

                                        attrName = StringUtil.camelToHtml(attrName);

                                        attributes.push(new TagAttribute(attrName, attrValue));
                                    }
                                });

                                tagByName.set(tagInfo.name, tagInfo);
                            }
                        }
                    }
                }
            }
        }
    }
}