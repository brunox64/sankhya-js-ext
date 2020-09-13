'use strict';
import * as vscode from 'vscode';
import CompletionTagListTask from './CompletionTagListTask';
import TagInfo from './TagInfo';

export default class JsCompletionProvider implements vscode.CompletionItemProvider {
    
    private tagByName:Map<string,TagInfo>;
    private taskTags:CompletionTagListTask;
    private started:boolean = false;

    public constructor(){
        this.taskTags = new CompletionTagListTask();
        this.tagByName = new Map();
    }

    public provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken, 
        context:vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionList<vscode.CompletionItem>> {
            
            var self = this;

            if (!this.started) {
                this.started = true;
                self.taskTags.run(self.tagByName);
            }

            var completionList = new vscode.CompletionList(new Array<vscode.CompletionItem>());

            this.tagByName.forEach(tag => {
                var item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Property);
                
                var doc = 'Atributos:\n';
                for (var attr of tag.attributes) {
                    doc += attr.name+'="'+attr.value+'"\n';
                }

                item.documentation = doc;

                completionList.items.push(item);
            });

            completionList.isIncomplete = false;

            return completionList;
    }
}




