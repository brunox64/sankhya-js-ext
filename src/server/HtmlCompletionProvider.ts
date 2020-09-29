'use strict';

import { CompletionItem, CompletionItemKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import JsStringSkipper from '../util/JsStringSkipper';
import Region from '../util/Region';
import StringSkipper from '../util/StringSkipper';
import TagInfo from '../model/TagInfo';

export default class HtmlCompletionProvider  {
    
    public constructor(
        private tagByName:Map<string,TagInfo>
    ){}

    public provideCompletionItems(document: TextDocument, textDocPos: TextDocumentPositionParams): CompletionItem[] {
        
        var position:Position = textDocPos.position;
        var lines:string[] = document.getText().split(/\r?\n/g);
        var triggerCharacter = lines[position.line].substring(position.character-1, position.character);

        var completionList:CompletionItem[] = [];
        
        if (triggerCharacter == '<') {
            this.fillAllTags(completionList);
        } else {
            
            var content = lines[position.line].substring(0, position.character);
            var regexTag = /<\s*([a-z][a-z0-9\-_]+)\b/ig;
            var matchTag = regexTag.exec(content);
            var tagLocalizada = false;

            if (matchTag == null) {
                // buscando de traz pra frente linha a linha a ocorrência da tag
                for (var index = position.line - 1; index >= 0; index--) {
                    content = lines[index] + content;
                    regexTag.lastIndex = 0;
                    matchTag = regexTag.exec(content);

                    if (matchTag != null) {
                        tagLocalizada = true;
                        break;
                    }
                }
            } else {
                tagLocalizada = true;// abertura de tag na mesma linha do cursor
            }

            if (tagLocalizada) {
                // posicionar na última ocorrência
                var match = null;
                while ((match = regexTag.exec(content)) != null) {
                    matchTag = match;
                }

                var skipper = new JsStringSkipper();
                var strSkipper = new StringSkipper(content, new Region(matchTag!.index, content.length));
                var strSkipped = strSkipper.skip(skipper);

                // verificar se partes da tag estão incompletas
                for (var index of strSkipped) {
                    // se há um sinal > é por que não estão posicionado na mesma tag que o regex capturou
                    // se o skipper não conseguiu pular aspas duplas é por que estão desbalanceadas
                    if (content.charAt(index) == '>' || content.charAt(index) == '"') {
                        tagLocalizada = false;
                        break;
                    }
                }
            }
            
            if (tagLocalizada) {
                var tagName = matchTag![1];
                var tag = this.tagByName.get(tagName);

                if (tag != null) {
                    tag.attributes.forEach(attr => {
                        completionList.push({ label: attr.name, kind: CompletionItemKind.Enum, documentation: attr.name+'="'+attr.value+'"' });
                    });
                }
            }
        }
        
        return completionList;
    }

    private fillAllTags(completionList:CompletionItem[]):void {

        this.tagByName.forEach(tag => {
            
            var doc = 'Atributos:\n';
            for (var attr of tag.attributes) {
                doc += attr.name+'="'+attr.value+'"\n';
            }

            completionList.push({ label: tag.name, kind: CompletionItemKind.Property, documentation: doc });
        });

    }

}




