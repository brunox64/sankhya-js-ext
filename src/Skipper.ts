
export default interface Skipper {
    skip(source:string, index:number):boolean;
	nextIndex():number;
}