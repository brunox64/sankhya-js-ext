'use strict';
import * as vscode from 'vscode';
import fs from 'fs';

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
            var directives = new Array<string>();

            files.forEach(file => {
                var regexDirective = /\.directive\s*\(\s*['"]([^'"]+)['"]/g;
                var content = fs.readFileSync(file).toString('utf-8');
                var match = null;

                while ((match = regexDirective.exec(content)) != null) {
                    directives.push(match[1]);
                }
            });

            
        }
    }
}

interface FileVisitor {
    visit(file:string):void
}

class TreeVisitor implements FileVisitor {
    public files:Array<string> = [];

    public visit(file:string):void {
        if (file.substring(file.length-3,file.length) == '.js') {
            this.files.push(file);
        }
    }
}

class WalkFileTree {
    private startPath:string;
    private visitor:FileVisitor;

    public constructor(startPath:string, visitor:FileVisitor) {
        this.startPath = startPath;
        this.visitor = visitor;
    }

    public walkFilesTree():void {
        this.visitTree(this.startPath);
    }

    private visitTree(path:string):void {

        var children = fs.readdirSync(path);

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            if (child == '.' || child == '..') {
                continue;
            } else {
                child = path + '/' + child;

                var stat = fs.statSync(child);

                if (stat.isFile()) {
                    this.visitor.visit(child);
                } else if (stat.isDirectory()) {
                    this.visitTree(child);
                }
            }
        }
    }
}
