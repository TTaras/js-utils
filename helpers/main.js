const _self = {};

const _sUa = navigator.userAgent.toLowerCase();
const _class2type = {};
const _toString = _class2type.toString;
const _hasOwn = _class2type.hasOwnProperty;
const _fnToString = _hasOwn.toString;
const _ObjectFunctionString = _fnToString.call(Object);

//

/**
 * Get variable type
 * @param {*} val
 * @return {string}
 * @example
 *  var type = getType([1,2,3]); // Array
 *  also detect: boolean, string, object, date, number, function, regexp, symbol, error, null, undefined, html{XXX}element
 */
_self.getType = function(val) {
    return Object.prototype.toString.call(val).slice(8, -1).toLocaleLowerCase();
};

/**
 * Chack variable type
 * @param {string} type
 * @param {*} obj
 * @return {boolean}
 * @example
 *  if (is('array', [1,2,3])) {
 *      alert('Array');
 *  }
 *  also detect: boolean, string, object, date, number, function, regexp, symbol, error, null, undefined, html{XXX}element
 */
_self.is = function(type, obj) {
    const objType = _self.getType(obj);

    if (type === 'number' && objType === 'number') {
        return !isNaN(obj);
    } else {
        return objType === type;
    }
};

/**
 * Determine whether the argument is an array.
 * @param {*} obj Object to test whether or not it is an array.
 * @return {boolean}
 */
_self.isArray = function(obj) {
    return Array.isArray ? Array.isArray(obj) : _self.is('array', obj);
};

/**
 * Determine whether the argument is an object.
 * @param {*} obj Object to test whether or not it is an object.
 * @return {boolean}
 */
_self.isObject = function(obj) {
    return _self.is('object', obj);
};

/**
 * Determine whether the argument is an plain object.
 * @param {*} obj Object to test
 * @return {boolean}
 */
_self.isPlainObject = function(obj) {
    let proto;
    let Ctor;

    // Detect obvious negatives
    // Use toString instead of _self.getType to catch host objects
    if (!obj || _toString.call(obj) !== '[object Object]') {
        return false;
    }

    proto = Object.getPrototypeOf(obj);

    // Objects with no prototype (e.g., `Object.create(null)`) are plain
    if (!proto) {
        return true;
    }

    // Objects with prototype are plain iff they were constructed by a global Object function
    Ctor = _hasOwn.call(proto, 'constructor') && proto.constructor;
    return typeof Ctor === 'function' && _fnToString.call(Ctor) === _ObjectFunctionString;
};

/**
 * Determine whether a variable is empty
 * @param {*} mixedVar
 * @return {boolean}
 */
_self.isEmpty = function(mixedVar) {
    if (!mixedVar) return true;

    switch (typeof mixedVar) {
        case 'string':
            mixedVar = _self.trim(mixedVar);
            if (!mixedVar || mixedVar === '0') return true;
            break;
        case 'object':
            if (_self.isArray(mixedVar)) {
                if (!mixedVar.length) return true;
            } else {
                for (let key in mixedVar) {
                    if (_hasOwn.call(mixedVar, key)) return false;
                }
                return true;
            }
            break;
    }

    return false;
};

/**
 * Check target is visible
 * @param {Element} target
 * @return {boolean}
 */
_self.isVisible = function(target) {
    // check target is visible
    // if (!target || target.offsetParent === null) return false; // быстрый вариант, но не работает в старых IE и для position=fixed

    if (target instanceof Window || (target.document && target.document.nodeName)) return true;

    let nodeType = target.nodeType;
    if (!nodeType) return false;

    if (nodeType === 1) {
        // jQuery вариант
        return !!(target && (target.offsetWidth || target.offsetHeight || target.getClientRects().length));
    } else {
        return true;
    }
}

/**
 * Detect touch devices
 * @return {boolean}
 */
_self.isTouch = function() {
    // https://stackoverflow.com/questions/56324813/how-to-detect-touch-device-in-2019
    // http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
    return matchMedia('(hover: none), (pointer: coarse)').matches;
};

/**
 * Detect mobile device
 * @param {boolean} [isByUserAgentOnly = true] detect by userAgent only (from nginx)
 * @return {boolean}
 */
_self.isMobile = function(isByUserAgentOnly = true) {
    if (isByUserAgentOnly) {
        return !!RA.config.get('device.isMobile');
    }

    let th = this.isMobile;

    if (th.ret === undefined) {
        // flag from nginx by userAgent
        th.ret = !!RA.config.get('device.isMobile');

        // IPadOS default userAgent is as desktop Mac
        // Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15
        if (!th.ret) {
            th.ret = (_sUa.includes('macintosh') || _sUa.includes('applewebkit')) && _self.isTouch();
        }
    }

    return th.ret;
};

/**
 * Detect mobile app
 * @return {boolean}
 */
_self.isApp = function() {
    return !!RA.config.get('device.isApp');
}

/**
 * Check a cookie enable
 * @return {boolean}
 */
_self.isCookieEnable = function() {
    let res = window.navigator.cookieEnabled;

    if (res === undefined) {
        res = !!(document.cookie || ((document.cookie='ce=1') && document.cookie));
    }

    return res;
};

//

/**
 * Create a serialized representation of an plain object
 * suitable for use in a URL query string or Ajax request.
 * @param {object} a plain object to serialize.
 * @return {string}
 */
_self.params = (function() {
    const _fn = {
        rbracket: /\[\]$/,
        buildParams: function(prefix, obj, add) {
            let name;

            if (Array.isArray(obj)) {
                // Serialize array item.
                obj.forEach(function(v, i) {
                    if (_fn.rbracket.test(prefix)) {
                        // Treat each array item as a scalar.
                        add(prefix, v);
                    } else {
                        // Item is non-scalar (array or object), encode its numeric index.
                        _fn.buildParams(
                            prefix + '[' + (typeof v === 'object' && v !== null ? i : '') + ']',
                            v,
                            add
                        );
                    }
                });
            } else if (_self.is('object', obj)) {
                // Serialize object item.
                for (name in obj) {
                    _fn.buildParams(prefix + '[' + name + ']', obj[name], add);
                }
            } else {
                // Serialize scalar item.
                add(prefix, obj);
            }
        }
    };

    return function(a) {
        let prefix;
        let s = [];

        function add(key, valueOrFunction) {
            // If value is a function, invoke it and use its return value
            const value = _self.is('function', valueOrFunction) ? valueOrFunction() : valueOrFunction;
            s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value === null ? '' : value);
        }

        for (prefix in a) {
            _fn.buildParams(prefix, a[prefix], add);
        }

        // Return the resulting serialization
        return s.join('&');
    }
})();

/**
 * Merge the contents of two or more objects together into the first object.
 * @param {boolean} [bDeep] If true, the merge becomes recursive (aka. deep copy).
 * @param {Object} oTarget The object to extend. It will receive the new properties.
 * @param {Object} oSource1 An object containing additional properties to merge in.
 * @param {Object} [oSourceN] Additional objects containing properties to merge in.
 * @return {Object}
 */
_self.extend = function() {
    let options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if (typeof target === 'boolean') {
        deep = target;

        // Skip the boolean and the target
        target = arguments[i] || {};
        i++;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== 'object' && typeof target !== 'function') {
        target = {};
    }

    // Extend App itself if only one argument is passed
    if (i === length) {
        target = this;
        i--;
    }

    for (; i < length; i++) {

        // Only deal with non-null/undefined values
        if ((options = arguments[i]) !== null) {

            // Extend the base object
            for (name in options) {
                copy = options[name];

                // Prevent Object.prototype pollution
                // Prevent never-ending loop
                if (name === '__proto__' || target === copy) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if (deep && copy && (_self.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
                    src = target[name];

                    // Ensure proper type for the source value
                    if (copyIsArray && !Array.isArray(src)) {
                        clone = [];
                    } else if (!copyIsArray && !_self.isPlainObject(src)) {
                        clone = {};
                    } else {
                        clone = src;
                    }
                    copyIsArray = false;

                    // Never move original objects, clone them
                    target[name] = _self.extend(deep, clone, copy);

                    // Don't bring in undefined values
                } else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};

//

/**
 * Parse URL string to object
 * @param {string} sStr URL строка для парсинга
 * @param {string} [sParamsSeparate=&] разделитель параметров
 * @return {Object}
 * @example
 *  App.parseSstr('first=foo&second=bar');
 *  { first: 'foo', second: 'bar' }
 *
 *  App.parseStr('str_a=Jack+and+Jill+didn%27t+see+the+well.');
 *  { str_a: "Jack and Jill didn't see the well." }
 */
_self.parseStr = function(sStr, sParamsSeparate = '&') {
    const ret = {};

    for (let sub of sStr.split(sParamsSeparate)) {
        const list = sub.split('=');
        if (list.length > 1) {
            ret[unescape(list[0])] = decodeURIComponent(list[1]);
        }
    }

    return ret;
};

/**
 * Parse query string
 * @return {Object}
 */
_self.parseQueryString = function() {
    const queryString = location.search;
    let ret = {};

    if (queryString) {
        ret = _self.parseStr((queryString).substr(1));
    }

    return ret;
};

/**
 * Генератор случайного числа в диапазоне
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
_self.randomInt = function(min, max) {
    let rand = min + Math.random() * (max + 1 - min);
    rand = Math.floor(rand);

    return rand;
};

/**
 * Java’s String.hashCode() method implemented in Javascript
 * @param {string} str
 * @return {number}
 */
_self.hashCode = function(str) {
    let hash = 0, char;

    if (typeof str !== 'string' || str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return hash;
};

/**
 * Full trim text string
 * @param {string} str
 * @return {string}
 */
_self.trim = function(str) {
    if (!str) return '';

    if (String.prototype.trim) {
        return str.toString().trim();
    } else {
        if (!this.trim.patternTrim) {
            this.trim.patternTrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
        }
        return (str + '').replace(this.trim.patternTrim, '');
    }
};

/**
 * HTML encode для текста
 * @param {string} sText
 * @return {string}
 */
_self.htmlEncode = function(sText) {
    const oEntities = {
        '+38': '&amp;',
        '+34': '&quot;',
        '+39': '&#039;',
        '+60': '&lt;',
        '+62': '&gt;',
        '+160': '&nbsp;'
    };

    sText = String(sText);

    for (let s in oEntities) {
        sText = sText.split(String.fromCharCode(+s)).join(oEntities[s]);
    }

    return sText;
};

/**
 * Convert currency nick to thml symbol
 * @param {string} currencyNick
 * @returns {string}
 */
_self.currencyToSymbol = function(currencyNick) {
    const map = {
        'RUB': '&#8381;',
        'RUR': '&#8381;',
        'EUR': '&#8364;',
        'USD': '$',
        'CHF': '₣',
        'GBp': '£',
        'JPY': '¥',
        'GBP': '£'
    };

    return map[currencyNick] || currencyNick;
};

/**
 * Create element from html string
 * Inner inline js and css don't work !!!!!!!!!!!!!!
 * @param {string} html
 * @param {boolean} [isMultiple=false]
 * @returns {NodeListOf<ChildNode>|ChildNode|null}
 */
_self.htmlToElement = function(html, isMultiple = false) {
    if (typeof html !== 'string') {
        return null;
    }

    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();

    return isMultiple ? tpl.content.childNodes : tpl.content.firstChild;

};

/**
 * Get preloader element
 * @param {string} [html]
 * @returns {NodeListOf<ChildNode>|ChildNode|null}
 */
_self.getPreloader = function(html) {
    if (typeof html !== 'string') {
        html = RA.repo.preloader.render();
    }

    return _self.htmlToElement(html);
};

//

/**
 * Parse to int
 * true convert to 1
 * if result isNan, then convert to 0
 * @param {*} xAny
 * @param {boolean} [bAbs] абсолютное значение
 * @return {number}
 */
_self.toInt = function(xAny, bAbs) {
    if (xAny === true) {
        return 1;
    }

    const nToret = parseInt(xAny, 10);

    return isNaN(nToret) ? 0 : (bAbs ? Math.abs(nToret) : nToret);
};

/**
 * Parse to float
 * true convert to 1
 * if result isNan, then convert to 0
 * @param {*} xAny
 * @param {boolean} [bAbs] абсолютное значение
 * @return {number}
 */
_self.toFloat = function(xAny, bAbs) {
    if (xAny === true) {
        return 1;
    }

    const nToret = parseFloat(xAny);

    return isNaN(nToret) ? 0 : (bAbs ? Math.abs(nToret) : nToret);
};

/**
 * Implementation of toFixed() that treats floats more like decimals
 * Fixes binary rounding issues (eg. (0.615).toFixed(2) === "0.61") that present
 * problems for accounting- and finance-related software.
 * @param {number} number
 * @param {number} precision
 * @return {string}
 */
_self.toFixed = function(number, precision) {
    precision = _self.toInt(precision, true);
    const power = Math.pow(10, precision);

    // Multiply up by precision, round accurately, then divide and use native toFixed():
    return (Math.round(number * power) / power).toFixed(precision);
};

/**
 * Formating number use specified precision, thousands separator and decimal separator
 * @param {*} number
 * @param {Object} [params]
 *   @param {string} [params.thousands = ' '] разделитель тысяч
 *   @param {string} [params.decimal = ','] разделитель дробной части
 *   @param {number|null} [params.precision = null] точность после запятой
 *   @param {boolean} [params.isFixedPrecision = false] фиксированное кол-во знаков после запятой (добивается нулями)
 *   @param {number} [params.grouping = 3] группировка по кол-ву знаков
 *   @param {string} [params.nan = '&mdash;'] результат для NaN
 * @return {string}
 */
_self.formatNumber = function(number, params) {
    let _params = {
        thousands: ' ',
        decimal: ',',
        precision: null,
        isFixedPrecision: false,
        grouping: 3,
        nan: '&mdash;'
    };

    number = parseFloat(number);
    if (isNaN(number)) return _params.nan;

    if (params) {
        _self.extend(_params, params);
    }

    let negative = number < 0 ? '-' : '';
    let base = ''; // целая часть
    let rest = ''; // дробная часть вместе с разделителем
    let restNumber;
    let mod;

    number = Math.abs(number);

    if (_params.precision === null) {
        base = String(parseInt(number, 10));
        restNumber = String(number).split('.')[1];
        if (restNumber) {
            rest = _params.decimal + restNumber;
        }
    } else if (_params.precision === 0) {
        base = String(Math.round(number));
    } else {
        if (_params.isFixedPrecision) { // фиксированное кол-во знаков после запятой (добивается нулями)
            number = _self.toFixed(number, _params.precision);
        } else {
            const power = Math.pow(10, _params.precision);
            number = Math.round(number * power) / power;
        }

        const numberPaths = String(number).split('.');

        base = numberPaths[0];
        restNumber = numberPaths[1];

        if (restNumber) {
            rest = _params.decimal + restNumber;
        }
    }

    mod = base.length > _params.grouping ? base.length % _params.grouping : 0;

    return negative + (mod ? base.substr(0, mod) + _params.thousands : '')
        + base.substr(mod).replace(/(\d{3})(?=\d)/g, "$1" + _params.thousands)
        + rest;
};

/**
 * Formating number use specified precision, thousands separator and decimal separator
 * @param {number} number
 * @param {Object} [params]
 *   @param {string} [params.decimal = ',']
 *   @param {number} [params.precision = 2]
 *   @param {Array} [params.abbr = ['', 'тыс.', 'млн', 'млрд', 'трлн']]
 * @return {string}
 */
_self.digitCapacity = function(number, params) {
    let _params = {
        decimal: ',',
        precision: 2,
        abbr: ['', 'тыс.', 'млн', 'млрд', 'трлн']
    };

    if (params) {
        _self.extend(_params, params);
    }

    const abs = Math.abs(number || 0);
    let abbr;

    // trillion
    if (abs >= Math.pow(10, 12)) {
        abbr = _params.abbr[4];
        number = number / Math.pow(10, 12);
        // billion
    } else if (abs < Math.pow(10, 12) && abs >= Math.pow(10, 9)) {
        abbr = _params.abbr[3];
        number = number / Math.pow(10, 9);
        // million
    } else if (abs < Math.pow(10, 9) && abs >= Math.pow(10, 6)) {
        abbr = _params.abbr[2];
        number = number / Math.pow(10, 6);
        // thousand
    } else if (abs < Math.pow(10, 6) && abs >= Math.pow(10, 3)) {
        abbr = _params.abbr[1];
        number = number / Math.pow(10, 3);
        //hundred
    } else if (abs < Math.pow(10, 3)) {
        abbr = _params.abbr[0];
    }

    let n = 1;
    for (let i = 0; i < _params.precision; i++) {
        n *= 10;
    }
    number = '' + Math.round(number * n) / n;

    if (_params.decimal !== '.') {
        number = number.replace('.', _params.decimal);
    }

    return number + (abbr ? ' ' + abbr : '');
};

//

/**
 * Create deep copy of array or object
 * @param {*} input
 * @param {boolean} [isDeep=true]
 * @return {*}
 */
_self.cloneObject = function(input, isDeep = true) {
    let output, index, size;

    if (Array.isArray(input)) {
        if (isDeep) {
            output = [];
            size = input.length;
            for (index = 0; index < size; ++index) {
                output[index] = this.cloneObject(input[index]);
            }
        } else {
            if (Array.from) { // all, except IE
                output = Array.from(input);
            } else {
                output = input.slice();
            }
        }

    } else if (this.isPlainObject(input)) {
        output = {};

        if (isDeep) {
            for (index in input) {
                if (!_hasOwn.call(input, index)) continue;
                output[index] = this.cloneObject(input[index]);
            }
        } else {
            if (Object.assign) { // all, except IE
                Object.assign(output, input);
            } else {
                for (index in input) {
                    if (!_hasOwn.call(input, index)) continue;
                    output[index] = input[index];
                }
            }
        }
    } else {
        output = input;
    }

    return output;
};

/**
 * Get the size of an object
 * @param {Array|Object} input
 * @return {number}
 */
_self.getSizeObject = function(input) {
    let size = 0;

    if (Array.isArray(input)) {
        size = input.length;
    } else if (this.isPlainObject(input)) {
        for (let index in input) {
            if (_hasOwn.call(input, index)) size++;
        }
    }

    return size;
};

//

/**
 * Get delta client timezone offset with Mockow timezone offset
 * @return {number}
 */
_self.getDeltaClientMskTimezone = function() {
    const localOffset = -(new Date()).getTimezoneOffset() * 60; // sec
    return 10800 - localOffset; // toMskOffset in sec
};

/**
 * Get date in Moskow timezone
 * @param {*} [date]
 * @return {Date}
 */
_self.getDateMskTimezone = function(date) {
    const toMskOffset = _self.getDeltaClientMskTimezone(); // sec
    let ts; // sec

    if (date && date.getTime) {
        if (toMskOffset === 0) return date;
        ts = date.getTime() / 1000;
    } else {
        switch (typeof date) {
            // timestamp in seconds
            case 'number':
                ts = date;
                break;

            // parse string to date
            case 'string':
                date = new Date(date);
                if (date.getTime) {
                    if (toMskOffset === 0) return date;
                    ts = date.getTime() / 1000;
                } else {
                    if (toMskOffset === 0) return new Date();
                    ts = Date.now() / 1000;
                }
                break;

            // other fucking types
            default:
                ts = Date.now() / 1000;
        }
    }

    return new Date((ts + toMskOffset) * 1000);
};

//

/**
 * Search for a specified value within an array and return its index (or -1 if not found)
 * @param {*} value The value to search for.
 * @param {Array} aArray An array through which to search.
 * @param {number} [nFromIndex=0] The index of the array at which to begin the search. The default is 0, which will search the whole array.
 * @param {boolean} [bRetBool=true] Set return value type.
 * @return {number|boolean}
 */
_self.inArray = function(value, aArray, nFromIndex, bRetBool) {
    if (bRetBool === undefined) {
        if (nFromIndex === undefined) {
            bRetBool = true;
            nFromIndex = 0;
        } else {
            if (typeof nFromIndex === 'number') {
                bRetBool = true;
            } else {
                bRetBool = !!nFromIndex;
                nFromIndex = 0;
            }
        }
    }

    const nIndex = aArray.indexOf(value, nFromIndex);
    return (bRetBool ? nIndex > -1 : nIndex);
};

/**
 * Merge the contents of two arrays together into the first array
 * @param {Array} aFirst The first array-like object to merge, the elements of second added.
 * @param {Array} aSecond The second array-like object to merge into the first, unaltered.
 * @param {boolean} [bUnique=false] duplicates removed
 * @return {Array}
 */
_self.arrayMerge = function(aFirst, aSecond, bUnique) {
    let ret = [];

    if (this.isArray(aFirst) && this.isArray(aSecond)) {
        ret = aFirst.concat(aSecond);
        if (bUnique) {
            ret = this.arrayUnique(ret);
        }
    }

    return ret;
};

/**
 * Get array with unique values
 * @param {Array} array
 * @return {Array}
 */
_self.arrayUnique = function(array) {
    if (this.isArray(array)) {
        let obj = {};
        for (let el of array) {
            obj[el] = true;
        }

        return Object.keys(obj);
    }

    return [];
};

/**
 * Remove element from  array
 * @param {*} value
 * @param {Array} aArray
 * @return {Array}
 */
_self.removeFromArray = function(value, aArray) {
    let ret = [];

    if (this.isArray(aArray)) {
        const nIndex = this.inArray(value, aArray, 0, false);
        if (nIndex > -1) {
            aArray.splice(nIndex, 1);
        }
        ret = aArray;
    }

    return ret;
};

//

/**
 * Перезагрузка текущей страницы
 * @param {string} [sUrl]
 * @return {void}
 */
_self.reloadPage = function(sUrl) {
    if (sUrl && typeof sUrl === 'string') {
        location.replace(sUrl);
    } else {
        location.reload();
    }
};

/**
 * Перезагрузка текущей страницы с помощь добавления в запрос get параметра _rnd
 * ЗАЧЕМ: при использовании location.reload(), если на странице был POST, то он будет повторен
 * @return {void}
 */
_self.reloadPageByRND = function() {
    const param = _self.parseQueryString();
    const l = location;

    param._rnd = String(Date.now()).substr(7);
    _self.reloadPage(l.protocol + '//' + l.host + l.pathname + '?' + _self.param(param) + l.hash);
};

//

/**
 * Заблокировать документ от скролла
 * @param {Object} [params]
 *   @param {boolean} [params.isStoreScroll=true] запомнить положение скролла
 *   @param {boolean} [params.isResetScroll=false] эта штука принудительно кидает скролл body в 0 (для сафари это ставится по дефолту стилями, там без этого вообще не работает)
 * @return {void}
 */
_self.lockScrollBody = function(params) {
    const th = _self.lockScrollBody;

    let {isStoreScroll = true, isResetScroll = false} = params || {};

    if (th.counter === undefined) {
        th.counter = 0;
        th.offset = 0;
    }

    if (isResetScroll) {
        document.body.classList.add('g-lockscroll_reset');
    }

    if (th.counter++ > 0) return;

    if (isStoreScroll) {
        th.offset = window.pageYOffset;
    }

    for (let target of [document.documentElement, document.body]) {
        target.classList.add('g-lockscroll');
    }
};

/**
 * Разблоктровать скролл документа
 * @return {void}
 */
_self.unlockScrollBody = function() {
    const th = _self.lockScrollBody;

    if (th.counter > 0) {
        th.counter--;
        if (th.counter > 0) return;
    }

    for (let target of [document.documentElement, document.body]) {
        target.classList.remove('g-lockscroll');
    }

    document.body.classList.remove('g-lockscroll_reset');

    if (th.offset) {
        window.scrollTo(0, th.offset);
        th.offset = 0;
    }
};

/**
 * Разблоктровать скролл документа
 * @return {void}
 */
_self.forceUnlockScrollBody = function() {
    const th = _self.lockScrollBody;
    if (!th.init) return;

    th.counter = 1;
    _self.unlockScrollBody();
};

/**
 * Сделать скролл указанному элементу
 * @param {Object} target
 * @param {Object} options
 *   @param {number} [options.left]
 *   @param {number} [options.top]
 *   @param {string} [options.behavior] smooth|auto
 * @return {void}
 */
_self.setScroll = function(target, options) {
    // options - https://developer.mozilla.org/ru/docs/Web/API/ScrollToOptions
    // window scrollTo - https://developer.mozilla.org/ru/docs/Web/API/Window/scrollTo
    // elem scrollTo - https://developer.mozilla.org/ru/docs/Web/API/Element/scrollTo
    // elem scrollTop - https://developer.mozilla.org/ru/docs/Web/API/Element/scrollTop

    if (!target || !_self.isPlainObject(options) || _self.isEmpty(options) || !(target.scrollTop || target.scrollTo)) {
        throw new Error('helpers::setScroll - invalid params');
    }

    if (options.left !== undefined) options.left = _self.toInt(options.left, true);
    if (options.top !== undefined) options.top = _self.toInt(options.top, true);

    const isSupportParamsInScroll = !document.all && !('ActiveXObject' in window) && _sUa.indexOf('edge') === -1 && !(_sUa.indexOf('safari') > -1 && _sUa.indexOf('chrome') === -1);

    // all modern brawsers
    if (target.scrollTo && isSupportParamsInScroll) {
        target.scrollTo(options);
        return;
    }

    const isSmooth = options.behavior === 'smooth';
    const isWindow = _self.getType(target) === 'window';
    let x = isWindow ? target.pageXOffset : target.scrollLeft;
    let y = isWindow ? target.pageYOffset : target.scrollTop;

    if (isSmooth) {
        (function(pos) {
            var offsetY = pos.top && (pos.top < y ? -75 : 75);
            var offsetX = pos.left && (pos.left < x ? -75 : 75);

            var int = setInterval(function() {
                if (offsetX) x += offsetX;
                if (offsetY) y += offsetY;

                var isReadyX = !offsetX || (offsetX > 0 && x >= pos.left) || (offsetX < 0 && x <= pos.left);
                var isReadyY = !offsetY || (offsetY > 0 && y >= pos.top) || (offsetY < 0 && y <= pos.top);

                if (isReadyX) x = pos.left;
                if (isReadyY) y = pos.top;

                if (target.scrollTo) {
                    target.scrollTo(x, y);
                } else {
                    target.scrollLeft = x;
                    target.scrollTop = y;
                }

                if (isReadyX && isReadyY) {
                    clearInterval(int);
                }
            }, 10);
        })(options);
    } else {
        if (target.scrollTo) {
            target.scrollTo(
                options.left === undefined ? x : options.left,
                options.top === undefined ? y : options.top
            );
        } else {
            if (options.left) target.scrollLeft = options.left;
            if (options.top) target.scrollTop = options.top;
        }

    }
};

/**
 * Scroll window to node
 * @param {Object} node
 * @param {string} [behavior=smooth]
 * @return {void}
 */
_self.scrollToNode = function(node, behavior) {
    if (!node || !node.nodeName) {
        throw new Error('helpers::scrollWindowToNode - invalid node');
    }

    if (!node.isConnected) return;

    if (behavior === undefined) behavior = 'smooth';

    const layout = RA.config.get('layout');
    const headerHeight = RA.config.get('device.type') === 'smartphone' ? (layout.toplineHeight || 45) : (layout.headerHeight || 60);
    const offsetTop = window.pageYOffset + node.getBoundingClientRect().top - headerHeight;

    _self.setScroll(window, {top: offsetTop, behavior: behavior});
};

//

/**
 * Простая анимация
 * @param {Function} timing Функция расчёта времени
 * @param {Function} draw функция отрисовки анимации
 * @param {number} duration общая продолжительность анимации в миллисекундах.
 * @see https://learn.javascript.ru/js-animation
 * @return {void}
 */
_self.animate = function({timing, draw, duration}) {
    /*
    duration
    Продолжительность анимации. Например, 1000.
    -----------
    timing(timeFraction)
    Функция расчёта времени, как CSS-свойство transition-timing-function, которая будет вычислять прогресс анимации
    (как ось y у кривой Безье) в зависимости от прошедшего времени (0 в начале, 1 в конце).
    Например, линейная функция значит, что анимация идёт с одной и той же скоростью:
        function linear(timeFraction) {
            return timeFraction;
        }
    ------
    draw(progress)
    Функция отрисовки, которая получает аргументом значение прогресса анимации и отрисовывает его. Значение progress=0
    означает, что анимация находится в начале, и значение progress=1 – в конце.
    Эта та функция, которая на самом деле и рисует анимацию.
        function draw(progress) {
          train.style.left = progress + 'px';
        }
    */

    let start = performance.now();

    requestAnimationFrame(function animate(time) {
        // timeFraction изменяется от 0 до 1
        let timeFraction = (time - start) / duration;
        if (timeFraction > 1) timeFraction = 1;

        // вычисление текущего состояния анимации
        let progress = timing(timeFraction);

        draw(progress); // отрисовать её

        if (timeFraction < 1) {
            requestAnimationFrame(animate);
        }
    });
}

/**
 * Вывести в консоль
 * @param {*} data
 * @param {string} [title='RBC']
 * @param {('log'|'warn'|'error'|'table')} [viewMode='log']
 * @param {Object} [labelStyles]
 * @return {void}
 */
_self.consoleWrite = function({data, title = 'RBC', viewMode = 'log', labelStyles} = {}) {
    if (data === void(0)) return;

    const defaultLabelStyles = {
        'color': '#fff',
        'background-color': '#11bb88',
        'padding': '3px 5px',
    };

    labelStyles = Object.assign({}, defaultLabelStyles, labelStyles);

    let style = '';
    for (let [key, value] of Object.entries(labelStyles)) {
        style += key + ':' + value + ';';
    }

    switch (viewMode) {
        case 'table':
            console.groupCollapsed('%c%s', style, title, 'log object:'); // eslint-disable-line
            console.table(data); // eslint-disable-line
            console.groupEnd(); // eslint-disable-line
            break;
        case 'error':
            console.error('%c%s', style, title, data); // eslint-disable-line
            break;
        case 'warn':
            console.warn('%c%s', style, title, data); // eslint-disable-line
            break;
        default:
            console.log('%c%s', style, title, data); // eslint-disable-line
    }
}

/**
 * Тормозилка
 * Возвращает обёртку, передающую вызов f не чаще, чем раз в ms миллисекунд
 * У этой функции должно быть важное существенное отличие от debounce: если игнорируемый вызов оказался последним,
 * т.е. после него до окончания задержки ничего нет – то он выполнится.
 * @url https://learn.javascript.ru/task/throttle
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
_self.throttle = function(fn, ms) {
    let isThrottled = false;
    let savedArgs;
    let savedThis;

    function wrapper() {
        if (isThrottled) {
            savedArgs = arguments;
            savedThis = this;
            return;
        }

        fn.apply(this, arguments);
        isThrottled = true;

        setTimeout(function() {
            isThrottled = false;
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = savedThis = null;
            }
        }, (ms || 100));
    }

    return wrapper;
};
if (window.$ && !window.$.throttle) {
    // временная хрень для отказа от соответствующих плагинов
    window.$.throttle = function(ms, fn) {
        return _self.throttle(fn, ms);
    }
}

/**
 * Вызов не чаще чем в N миллисекунд
 * Возвращает обёртку, которая откладывает вызов f на ms миллисекунд.
 * «Лишние» вызовы перезаписывают предыдущие отложенные задания. Все аргументы и контекст – передаются.
 * @url http://qnimate.com/javascript-limit-function-call-rate/
 * @param {Function} fn
 * @param {number} ms
 * @param {boolean} [immediate = false]
 * @returns {Function}
 */
_self.debounce = function(fn, ms, immediate) {
    let timeout;

    return function() {
        const context = this;
        const args = arguments;

        const later = function() {
            timeout = null;
            if (!immediate) fn.apply(context, args);
        };

        const callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, ms);
        if (callNow) fn.apply(context, args);
    };
};
if (window.$ && !window.$.debounce) {
    // временная хрень для отказа от соответствующих плагинов
    window.$.debounce = function(ms, fn) {
        return _self.debounce(fn, ms);
    }
}


module.exports = _self;