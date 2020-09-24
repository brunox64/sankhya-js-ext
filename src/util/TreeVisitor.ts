import FileVisitor from "./FileVisitor";

export default class TreeVisitor implements FileVisitor {
    public files:Array<string> = [];

    public visit(file:string):void {
        if (file.endsWith('.js')) {
            this.files.push(file);
        }
    }
}