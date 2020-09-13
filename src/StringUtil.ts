
import JsCommentSkipper from './JsCommentSkipper';
import Region from './Region';
import RegionNav from './RegionNav';

export default class StringUtil {

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
        
        var skiper = new JsCommentSkipper();
		
		var start = -1;
		
		var delim = '"';
		var delim1 = '"';
		var delim2 = '\'';
		
		var escape = '\\';
		var part;
		
		for (; index < source.length; index++) {
			part = source.charAt(index);
			
			if (start == -1 && part != delim1 && part != delim2) {
				if (skiper.skip(source, index)) {
					index = skiper.nextIndex();
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
}