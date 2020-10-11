import Skipper from "./Skipper";
import StringUtil from "./StringUtil";

export default class JsObjectSkipper implements Skipper {
    private next:number =-1;

    public skip(source:string, index:number):boolean {
        this.next = -1;

        var part = source.charAt(index);
        var reg = null;

        if (part == '{') {
			reg = StringUtil.getJsRegion(source, index, '{', '}');
			
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