'use strict';
import * as vscode from 'vscode';
import fs from 'fs';
import StringUtil from './StringUtil';
import TreeVisitor from './TreeVisitor';
import WalkFileTree from './WalkFileTree';

export default class JsCompletionProvider implements vscode.CompletionItemProvider {
    
    private tagByName:Map<String,TagInfo>;
    private taskTags:CompletionTagListTask;

    public constructor(){
        this.taskTags = new CompletionTagListTask();
        this.tagByName = new Map();
    }

    public provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken, 
        context:vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionList<vscode.CompletionItem>> {

            this.taskTags.run(this.tagByName);

            var completionList = new vscode.CompletionList(new Array<vscode.CompletionItem>());
            var item = new vscode.CompletionItem('sk-dataset', vscode.CompletionItemKind.Text);
            
            completionList.items.push(item);
            completionList.isIncomplete = false;

            return completionList;
    }
}

class TagInfo {
    public constructor(
        public name:string,
        public attributes:Array<string>
    ) {}
}

class CompletionTagListTask {

    public run(tagByName:Map<String,TagInfo>):void {

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
            var directives:string[] = [];

            files.forEach(file => {
                var regexDirective = /\.directive\s*\(\s*['"]([^'"]+)['"]/g;
                var content = fs.readFileSync(file).toString('utf-8');
                var match = null;
                var args = null;

                while ((match = regexDirective.exec(content)) != null) {
                    args = StringUtil.getJsCallArgs(content, match.index);

                    if (args.length == 2) {
                        console.log(args[1]);
                    }
                }
            });

            
        }
    }
}



