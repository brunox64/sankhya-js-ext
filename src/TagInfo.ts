import TagAttribute from "./TagAttribute";

export default class TagInfo {
    public constructor(
        public name:string,
        public attributes:Array<TagAttribute>
    ) {}
}