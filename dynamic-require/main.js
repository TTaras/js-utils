/**
 * Helpers functions
 * @private
 * @type Object
 */
const _helpers = RA.repo.helpers;

/**
 * Список функций, ожидающих выполнения
 * @private
 * @type Array.Array
 */
const _aFunctionsOnLoad = [];

/**
 * Список загружаемых скриптов и стилей
 * @private
 * @type Array.String
 */
const _aPending = [];

/**
 * Список загруженных ресурсов
 * @private
 * @type Object
 */
const _oLoaded = {};

/**
 * Получить путь до загружаемого файла
 * и если все загружено запуск выполнения ожидающих функций из _aFunctionsOnLoad
 * @private
 * @param {String} [isFromCommon] брать из коммона
 * @return {String} путь
 */
function _getPath(isFromCommon) {
    const th = _getPath;
    const confGet = RA.config.get;

    return isFromCommon
        ? (th.urlCommon || (th.urlCommon = confGet('urls.common_static') || '/'))
        : (th.url || (th.url = confGet('urls.static') || '/'));
}

/**
 * Проверка загрузки из _aPending
 * и если все загружено(с ошибками тоже) запуск выполнения ожидающих функций из _aFunctionsOnLoad
 * @private
 * @return {void}
 */
function _ready() {
    // check all scripts and styles in reuire is loaded
    if (_aPending.length) return;

    // If there are functions in _aFunctionsOnLoad, to execute
    if (!_aFunctionsOnLoad.length) return;

    // run functions in _aFunctionsOnLoad
    let fns;
    while (fns = _aFunctionsOnLoad.shift()) { // eslint-disable-line

        // замыкаем аргументы для отдельного потока
        let f = function(fn, th) {
            return function() {
                fn.call(th);
            };
        }(fns[0], fns[1]);

        // выполняем в отдельном потоке, чтобы работали вложенные вызовы
        setTimeout(f, 0);
    }
}

/**
 *  Динамическая загрузка модулей
 *
 *  var loader = require('/repo/dynamic-require');
 *
 *  loader.require('fn.cookies');
 *  loader.requireCSS('fn.popup');
 *  loader.require('fn.popup', true);
 *  loader.ready(function() {
 *    alert('ready');
 *  });
 *
 *  loader.loadJS('fn.script');
 *  loader.loadCSS('fn.style');
 */
const _self = {
    /**
     * Динамическая загрузка JS модуля по неймспейсу
     * @param {String} sName имя модуля (fn.popup)
     * @param {*} [path] путь до статики или Boolean загрузка из коммона
     * @return {void}
     */
    require: function(sName, path) {
        let sPath;

        if (_helpers.is('string', path)) {
            sPath = path;
        } else {
            sPath = _getPath(path);
        }

        const sKey = sPath + sName + '/js';

        // allready begin load
        if (_aPending.includes(sKey)) return;

        // allready loaded or in the global scope
        if (_oLoaded[sKey] || window[sName]) {
            _ready();
            return;
        }

        // allready in namespace
        const aPath = sName.split('.');
        let i, obj;
        for (i = 0, obj = RA; i < aPath.length; i++) {
            obj = obj[aPath[i]];
            if (!obj) break;
        }
        if (obj) {
            _ready();
            return;
        }

        const oObject = _self.loadJS(sName, sPath);
        if (oObject) {
            _aPending.push(sKey);

            oObject.onload = oObject.onerror = function() {
                _helpers.removeFromArray(sKey, _aPending);
                _oLoaded[sKey] = true;
                _ready();
            };
        }
    },
    /**
     * Динамическая загрузка CSS style по неймспейсу
     * @param {String} sName имя модуля (fn.popup)
     * @param {*} [path] путь до статики или Boolean загрузка из коммона
     * @return {void}
     */
    requireCSS: function(sName, path) {
        let sPath;

        if (_helpers.is('string', path)) {
            sPath = path;
        } else {
            sPath = _getPath(path);
        }

        const sKey = sPath + sName + '/css';

        // allready begin load
        if (_aPending.includes(sKey)) return;

        // allready loaded
        if (_oLoaded[sKey]) {
            _ready();
            return;
        }

        const oObject = _self.loadCSS(sName, sPath);
        if (oObject) {
            _aPending.push(sKey);

            oObject.onload = oObject.onerror = function() {
                _helpers.removeFromArray(sKey, _aPending);
                _oLoaded[sKey] = true;
                _ready();
            };
        }
    },
    /**
     * Callback при успешной динамической загрузки всех объявленных модулей и стилей
     * @param {Function} fn функция
     * @param {Object} [context=window] контекст выполнения функции
     * @return {void}
     */
    ready: function(fn, context) {
        if (!context) context = window;

        if (typeof fn !== 'function' || typeof context !== 'object') {
            throw new Error('RA.repo.dynamic: wrong parameters for ready function');
        }

        _aFunctionsOnLoad.push([fn, context]);
        _ready();
    },
    /**
     * Загружаем в head скрипт по неймспейсу
     * @param {String} sName Имя файла ("fn.msg")
     * @param {String} [sStaticPath] путь до статики
     * @return {Object|null} ссылка на созданный элемент (script) DomNode
     */
    loadJS: function(sName, sStaticPath) {
        const th = _self.loadJS;

        if (!sName) return null;
        if (!th.cache) th.cache = [];

        // get file path
        const aPath = sName.split('.');
        let sPath = '/', i = 0;
        while (aPath[i + 1]) {
            sPath += aPath[i++] + '/';
        }
        sPath = (sStaticPath ? sStaticPath : _getPath()) + 'scripts/build' + sPath + '_' + aPath[aPath.length - 1] + '.js';

        // exist in internal cache
        if (th.cache[sPath]) {
            return th.cache[sPath];
        }

        // load script
        const oScript = document.createElement('script');
        oScript.src = sPath;
        document.getElementsByTagName('head')[0].appendChild(oScript);

        // store in cache
        th.cache[sPath] = oScript;

        return oScript;
    },
    /**
     * Загружаем в head стили по неймспейсу
     * @param {String} sName Имя файла ("fn.styleImg")
     * @param {String} [sStaticPath] путь до статики
     * @return {Object|null} ссылка на созданный элемент (style) DomNode
     */
    loadCSS: function(sName, sStaticPath) {
        const th = _self.loadCSS;

        if (!sName) return null;
        if (!th.cache) th.cache = [];

        // get path
        const aPath = sName.split('.');
        let sPath = '/', i = 0;
        while (aPath[i + 1]) {
            sPath += aPath[i++] + '/';
        }
        sPath = (sStaticPath ? sStaticPath : _getPath()) + 'styles/build' + sPath + '_' + aPath[aPath.length - 1] + '.css';

        // exist in internal cache
        if (th.cache[sPath]) {
            return th.cache[sPath];
        }

        // load style
        const oStyle = document.createElement('link');
        oStyle.type = 'text/css';
        oStyle.rel = 'stylesheet';
        oStyle.href = sPath;
        document.getElementsByTagName('head')[0].appendChild(oStyle);

        // store in cache
        th.cache[sPath] = oStyle;

        return oStyle;
    }
};

module.exports = _self;