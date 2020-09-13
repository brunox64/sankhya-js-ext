import FileVisitor from "./FileVisitor";

export default class TreeVisitor implements FileVisitor {
    public files:Array<string> = [];

    public visit(file:string):void {
        if (file.substring(file.length-3,file.length) == '.js') {
            this.files.push(file);
        }
    }
}