'use strict';
import * as vscode from 'vscode';
import CompletionTagListTask from './HtmlDirectivesScanner';
import JsStringSkipper from './JsStringSkipper';
import Region from './Region';
import StringSkipper from './StringSkipper';
import TagAttribute from './TagAttribute';
import TagInfo from './TagInfo';

export default class HtmlCompletionProvider implements vscode.CompletionItemProvider {
    
    public constructor(
        private tagByName:Map<string,TagInfo>
    ){}

    public provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken, 
        context:vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionList<vscode.CompletionItem>> {
            
            var self = this;

            return new Promise((resolve, reject) => {
                
                var completionList = new vscode.CompletionList(new Array<vscode.CompletionItem>());
                completionList.isIncomplete = false;

                if (context.triggerCharacter == '<') {
                    this.fillAllTags(completionList);
                } else {
                    
                    var content = document.lineAt(position.line).text.substring(0, position.character);
                    var regexTag = /<\s*([a-z][a-z0-9\-_]+)\b/ig;
                    var matchTag = regexTag.exec(content);
                    var tagLocalizada = false;

                    if (matchTag == null) {
                        for (var index = position.line - 1; index >= 0; index--) {
                            content = document.lineAt(index).text + content;
                            matchTag = regexTag.exec(content);

                            if (matchTag != null) {
                                tagLocalizada = true;
                                break;
                            }
                        }
                    } else {
                        tagLocalizada = true;
                    }

                    if (tagLocalizada) {
                        var match = null;
                        while ((match = regexTag.exec(content)) != null) {
                            matchTag = match;
                        }

                        var skipper = new JsStringSkipper();
                        var strSkipper = new StringSkipper(content, new Region(matchTag!.index, content.length));
                        var strSkipped = strSkipper.skip(skipper);

                        for (var index of strSkipped) {
                            if (content.charAt(index) == '>' || content.charAt(index) == '"') {
                                tagLocalizada = false;
                                break;
                            }
                        }
                    }
                    
                    if (tagLocalizada) {
                        var tagName = matchTag![1];
                        var tag = self.tagByName.get(tagName);

                        if (tag != null) {
                            tag.attributes.forEach(attr => {
                                var item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Enum);
                                item.documentation = attr.name+'="'+attr.value+'"';
                                completionList.items.push(item);
                            });
                        }
                    }
                }

                resolve(completionList);
            });
    }

    private fillAllTags(completionList:vscode.CompletionList):void {

        this.tagByName.forEach(tag => {
            var item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Property);
            
            var doc = 'Atributos:\n';
            for (var attr of tag.attributes) {
                doc += attr.name+'="'+attr.value+'"\n';
            }

            item.documentation = doc;

            completionList.items.push(item);
        });

    }

}




