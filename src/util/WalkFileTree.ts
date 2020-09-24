import FileVisitor from "./FileVisitor";
import fs from 'fs';

export default class WalkFileTree {
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