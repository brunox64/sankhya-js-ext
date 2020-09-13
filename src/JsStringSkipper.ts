
import Skipper from './Skipper';
import StringUtil from './StringUtil';
import Region from './Region';

export default class JsStringSkipper implements Skipper {
    private reg!:Region|null;
	private part!:string;
	private next!:number;
	
	public constructor() {
		this.next = -1;
	}
	
	public skip(source:string, index:number):boolean {
		this.next = -1;
		
		this.part = source.charAt(index);
		
		if (this.part == '"' || this.part == '\'') {
			this.reg = StringUtil.getJsRegionString(source, index);
			
			if (this.reg != null) {
				this.next = this.reg.end();
				return true;
			}
		}
		
		return false;
	}
	
	public nextIndex():number {
		return this.next;
	}
}