import Skipper from "./Skipper";
import StringUtil from "./StringUtil";

export default class JsCommentSkipper implements Skipper {
    private comentLine = "//";
	private comentStart = "/*";
	private comentEnd = "*/";
	private lineEnd = "\n";
	
	private part!:string;
	private next!:number;
	
	public constructor() {
		this.next = -1;
	}
	
	public skip(source:string, index:number):boolean {
		this.next = -1;
		
		this.part = source.charAt(index);
		
		if (this.part == '/' 
				&& index + this.comentStart.length <= source.length 
				&& StringUtil.strEquals(source, index, index + this.comentStart.length, this.comentStart, 0, this.comentStart.length)) {
			
			var end = StringUtil.strIndexOf(source, this.comentEnd, index + this.comentStart.length);
			
			if (end > -1) {
				this.next = end + this.comentEnd.length;
				return true;
			}
		} else if (this.part == '/' 
				&& index + this.comentLine.length <= source.length 
				&& StringUtil.strEquals(source, index, index + this.comentLine.length, this.comentLine, 0, this.comentLine.length)) {
			
			var end = StringUtil.strIndexOf(source, this.lineEnd, index + this.comentLine.length);
			
			if (end > -1) {
				this.next = end; // o caractere de nova linha não faz parte do comentário, por isso está sem o -1
				return true;
			}
		}
		
		return false;
	}
	
	public nextIndex():number {
		return this.next;
	}
}