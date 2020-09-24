import Region from "./Region";
import Skipper from "./Skipper";

export default class StringSkipper {
    public constructor(
        private source:string,
        private region:Region
    ){}

    public skip(skipper:Skipper):number[] {
        var map = new Array<number>();
        var start = this.region.start();
        var end = this.region.end();

        for (; start < end && start < this.source.length; start++) {

            if (skipper.skip(this.source, start)) {
                start = skipper.nextIndex();
                start--;
                continue;
            }

            map.push(start);
        }

        return map;
    }
}