
import JsArraySkipper from './JsArraySkipper';
import JsCallSkipper from './JsCallSkipper';
import JsCommentSkipper from './JsCommentSkipper';
import JsStringSkipper from './JsStringSkipper';
import StringSkipper from './StringSkipper';
import Region from './Region';
import RegionNav from './RegionNav';
import Skipper from './Skipper';
import SkipperChain from './SkipperChain';
import JsObjectSkipper from './JsObjectSkipper';

export default class StringUtil {

	public static camelToHtml(str:string):string {
		var html = '';
		var part = null;
		for (var index = 0; index < str.length; index++) {
			part = str.charAt(index);

			if (part.toUpperCase() == part) {
				html += '-';
			}

			html += part.toLowerCase();
		}

		return html;
	}

    public static format(str:string, args:Array<any>):string {
    
        if (str == null || str.length == 0 || args == null || args.length == 0) {
            return str;
        }
    
        var arg = null;
        var index = 0;
    
        while (true) {
    
            if (args.length == 0) {
                break;
            }
    
            arg = args.shift();
            index = str.indexOf('%s', index);
    
            if (index == -1) {
                break;
            }
    
            if (arg == null) {
                arg = 'null';
            }

            arg = String(arg);
    
            if (index+2 < str.length) {
                str = str.substring(0, index) + arg + str.substring(index+2);
            } else {
                str = str.substring(0, index) + arg;
            }

            index = index + arg.length;
        }
    
        return str;
    }

	public static strEquals(strA:string, beginA:number, endA:number, strB:string, beginB:number, endB:number):boolean {
        
        if (endA - beginA == endB - beginB) {
			var size = endA - beginA;
			
			if (size < 0) {
				throw new Error(StringUtil.format("beginA:%s, endA:%s, beginB:%s, endB:%s", [beginA, endA, beginB, endB]));
			} else if (size == 0) {
				return true;
			} else {
				for (var index = 0; index < size; index++) {
					if (strA.charAt(beginA) != strB.charAt(beginB)) {
						return false;
					}
					
					beginA++;
					beginB++;
				}
				
				return true;
			}
		}
		
		return false;
	}
	
	public static strIndexOf(str:string, find:string, fromIndex:number):number {
		if (fromIndex < 0 || fromIndex >= str.length) {
			throw new Error("index:" + fromIndex);
		}
		
		if (str.length == 0 || find.length == 0) {
			return -1;
		}
		
		var navStr = RegionNav.newRegionNavByContent(str);
		var regStr = Region.newRegionByContent(find);
		
		navStr.setRegionToMove(regStr);
		regStr.moveTo(fromIndex);
		
		while (navStr.hasRegion()) {
			
			if (StringUtil.strEquals(str, regStr.start(), regStr.end(), find, 0, find.length)) {
				return regStr.start();
			}
			
			regStr.move(1);
		}
		
		return -1;
	}
    
    public static getJsRegionString(source:string, index:number):Region|null {
        
        var skipper = new JsCommentSkipper();
		
		var start = -1;
		
		var delim = '"';
		var delim1 = '"';
		var delim2 = '\'';
		
		var escape = '\\';
		var part;
		
		for (; index < source.length; index++) {
			part = source.charAt(index);
			
			if (start == -1 && part != delim1 && part != delim2) {
				if (skipper.skip(source, index)) {
					index = skipper.nextIndex();
					index--;
					continue;
				}
			}
			
			if (start > -1 && part == escape) {
				index++;
				continue;
			}
			
			if (part == delim1 || part == delim2) {
				if (start == -1) {
					start = index;
					delim = part;
				} else if (part == delim) {
					return new Region(start, index + 1);
				}
			}
		}

		return null;
	}
	
	public static getJsRegion(source:string, index:number, open:string, close:string, skipper?:Skipper): Region|null {
		if (open == close) {
			throw new Error("open e close não podem ser iguais");
		}
		
		if (open == '\'' || close == '\'') {
			throw new Error("open ou close não pode ser aspas simples");
		}
		
		if (open == '"' || close == '"') {
			throw new Error("open ou close não pode ser aspas duplas");
		}

		if (open.length > 1 || close.length > 1) {
			throw new Error("open ou close não pode ser maior que 1");
		}

		var skipperChain = new SkipperChain();
		skipperChain.addSkipper(new JsCommentSkipper());
		skipperChain.addSkipper(new JsStringSkipper());

		if (skipper != null) {
			skipperChain.addSkipper(skipper);
		}

		skipper = skipperChain;
		
		var count = 0;
		var start = -1;
		var part;
		
		for (; index < source.length; index++) {
			part = source.charAt(index);
			
			if (skipper.skip(source, index)) {
				index = skipper.nextIndex();
				index--;
				continue;
			}
			
			if (part == open || part == close) {
				if (part == open) {
					if (start == -1) start = index;
					count++;
				} else if (start > -1) {
					count--;
					
					if (count == 0) return new Region(start, index + 1);
				}
			}
		}

		return null;
	}

	public static getJsCallArgs(source:string, index:number, open:string, close:string):string[] {
		var args = new Array<string>();
		var reg = StringUtil.getJsRegion(source, index, open, close);

		if (reg == null) {
			return args;
		}

		var regEx = reg;
		var regIn = new Region(regEx.start(), regEx.end());
		regIn.add(-1);

		var skipper = new SkipperChain();
		skipper.addSkipper(new JsCommentSkipper());
		skipper.addSkipper(new JsStringSkipper());
		skipper.addSkipper(new JsArraySkipper());
		skipper.addSkipper(new JsCallSkipper());
		skipper.addSkipper(new JsObjectSkipper());

		var strSkipper = new StringSkipper(source, regIn);
		var strSkipped = strSkipper.skip(skipper);
		var mapVirgula = new Array<number>();

		for (var idx of strSkipped) {
			if (source.charAt(idx) == ',') {
				mapVirgula.push(idx);
			}
		}

		mapVirgula.push(regIn.end());

		var start = regIn.start();
		var end = -1;
		for (var idx of mapVirgula) {
			end = idx;
			args.push(source.substring(start, end));
			start = end+1;
		}

		return args;
	}
}