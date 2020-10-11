
import Skipper from './Skipper';
import StringUtil from './StringUtil';
import Region from './Region';

export default class JsStringSkipper implements Skipper {
    private next!:number;
	
	public constructor() {
		this.next = -1;
	}
	
	public skip(source:string, index:number):boolean {
		this.next = -1;
		
		var part:string = source.charAt(index);
		
		if (part == '"' || part == "'" || part == '`' || part == '/') {
			var reg:Region|null = StringUtil.getJsRegionString(source, index);
			
			if (reg != null && reg.start() == index) {
				this.next = reg.end();
				return true;
			}
		}
		
		return false;
	}
	
	public nextIndex():number {
		return this.next;
	}
}