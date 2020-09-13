
import Skipper from './Skipper';

export default class SkipperChain implements Skipper {
    private skippers:Array<Skipper> = [];
    private next:number = -1;

    public addSkipper(skipper:Skipper):void {
        this.skippers.push(skipper);
    }

    public skip(source:string, index:number):boolean {
        
        for (var skipper of this.skippers) {
			if (skipper.skip(source, index)) {
				this.next = skipper.nextIndex();
				return true;
			}
		}
		
		return false;
    }

    public nextIndex():number {
        return this.next;
    }
}