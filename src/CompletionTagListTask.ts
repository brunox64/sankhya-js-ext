import TagInfo from "./TagInfo";
import * as vscode from 'vscode';
import fs from 'fs';
import TreeVisitor from "./TreeVisitor";
import WalkFileTree from "./WalkFileTree";
import StringUtil from "./StringUtil";
import Region from "./Region";
import TagAttribute from "./TagAttribute";

export default class CompletionTagListTask {
    private tagByName!:Map<string,TagInfo>;

    public run(tagByName:Map<string,TagInfo>):void {
        this.tagByName = tagByName;

        var sankhyaJsFolder = null;

        if (vscode.workspace.workspaceFile) {
            sankhyaJsFolder = vscode.workspace.workspaceFile;
        } else if (vscode.workspace.workspaceFolders) {
            for (var folder of vscode.workspace.workspaceFolders) {
                var childFolder = folder.uri.with({path: folder.uri.path + '/sankhya-js' });
                var childPath = childFolder.path;

                if (fs.existsSync(childPath) && fs.statSync(childPath).isDirectory()) {
                    sankhyaJsFolder = childFolder;
                    break;
                }
            }
        }

        if (sankhyaJsFolder != null && fs.existsSync(sankhyaJsFolder.fsPath) && fs.statSync(sankhyaJsFolder.fsPath).isDirectory()) {
            var dirSankhyajs = sankhyaJsFolder.fsPath;
            var dirSrcComponents = dirSankhyajs + '/src';

            var visitor = new TreeVisitor();
            var walker = new WalkFileTree(dirSrcComponents, visitor);
            walker.walkFilesTree();

            var files = visitor.files;
            var self = this;

            var hnd = setInterval(() => {
                if (files.length > 0) {
                    var file = files.shift();
                    if (file != null) {
                        self.collectDirectives(file);
                    }
                } else {
                    clearInterval(hnd);
                }
            }, 10);
        }
    }

    private collectDirectives(file:string):void {
        var tagByName = this.tagByName;

        var regexDirective = /\.directive\s*\(\s*['"]([^'"]+)['"]/g;
        var content = fs.readFileSync(file).toString('utf-8');
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