
export default class Region {
    private _start:number = 0;
	private _end:number = 0;
	
	public constructor(start:number, end:number) {
		this.reset(start, end);
	}
	
	public static newRegionByLength(len:number):Region {
        return new Region(0, len);
    }
    
    public static newRegionByContent(content:string):Region {
        return new Region(0, content.length);
	}
	
	public reset(start:number, end:number):void {
		if (start < 0) {
			throw new Error("start index:" + start);
		}
		
		if (end < 0) {
			throw new Error("end index:" + end);
		}
		
		var len = end - start;
		
		if (len < 0) {
			throw new Error("Region { start = " + start + ", end = " + end + " }");
		}
		
		this._start = start;
		this._end = end;
	}
	
	public add(len:number):void {
		var start = this._start;
		var end = this._end;
		
		start -= len;
		end += len;
		
		len = end - start;
		
		if (start < 0) {
			throw new Error("start index:" + start);
		} else if (len < 0) {
			throw new Error("start index:"+start+", end index:"+end);
		}
		
		this._start = start;
		this._end = end;
	}
	
	public move(len:number):void {
		if (this._start + len < 0) {
			throw new Error("index:" + (this._start + len));
		}
		
		this._start += len;
		this._end += len;
	}
	
	public moveTo(index:number):void {
		if (index < 0) {
			throw new Error("index:" + index);
		}
		
		var len = this._end - this._start;
		
		this._start = index;
		this._end = this._start + len;
	}
	
	public getLength():number {
		return this._end - this._start;
	}
	
	public setLength(len:number):void {
		if (len < 0) {
			throw new Error("length:" + len);
		}
		
		this._end = this._start + len;
	}
	
	public start():number {
		return this._start;
	}
	public end():number {
		return this._end;
	}
	
	public toString():string {
		return "Region { start = " + this._start + ", end = " + this._end + " }";
	}
}