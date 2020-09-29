import MethodInfo from "./MethodInfo";

export default class ServiceInfo {
    public constructor(
        public name:string,
        public methods:MethodInfo[]
    ){}
}