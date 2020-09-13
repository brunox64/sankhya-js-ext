
import Region from './Region';

export default class RegionNav {
    private regionNav:Region;
	private region!:Region;
	
	public constructor(begin:number, end:number) {
        this.regionNav = new Region(begin, end);
	}
	
	public static newRegionNavByRegion(region:Region):RegionNav {
        return new RegionNav(region.start(), region.end());
	}
	
	public static newRegionNavByContent(content:string):RegionNav {
		return new RegionNav(0, content.length);
	}
	
	public setRegionToMove(region:Region):void {
		this.region = region;
	}
	
	public hasRegion():boolean {
		
		var lenReg = this.region.getLength();
		var lenNav = this.regionNav.getLength();
		
		if (lenReg == 0 || lenNav == 0) {
			return false;
		}
		
		return this.region.end() <= this.regionNav.end();
	}
	
	public next():void {
		this.region.move(this.region.getLength());
	}
}