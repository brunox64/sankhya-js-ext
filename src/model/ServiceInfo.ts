import MethodInfo from "../util/MethodInfo";

export default class ServiceInfo {
    constructor(
        public name:string,
        public methods:MethodInfo[]
    ){}
}
