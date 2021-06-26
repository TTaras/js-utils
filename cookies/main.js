/**
 * Utility class for managing and interacting with cookies.
 * @singleton
 * @example
 *   var cookies = require('/repo/cookies/main');
 *   console.log(cookies.get('my_coockie'));
 *   cookies.del('cSV');
 *   cookies.set('my_coockie', '123', {expires: Date.now() + 60000});
 */
module.exports = (function() {
    var _self;

    _self = {
        /**
         * Получить все куки документа или куку по имени
         * @public
         * @param {String} [name] имя получаемой куки
         * @return {Object|String|Undefined} Текущие куки документа | кука по имени | кука по имени не существует
         */
        get: function(name) {
            var oCookies = {}, // возвращаемая коллекция кук
                sName, // имя куки
                sValue, // значение куки
                nBegining = 0,
                nMiddle,
                nEnd,
                oDocCook = document.cookie,
                nDocCookCount = oDocCook.length;

            while (nBegining < nDocCookCount) {

                // найти "="
                nMiddle = oDocCook.indexOf('=', nBegining);

                // найти ";"
                nEnd = oDocCook.indexOf(';', nBegining);

                // если нет ";", то это последнее поле cookie
                if (nEnd === -1)
                    nEnd = nDocCookCount;

                // если поле cookie не имеет значения
                if ((nMiddle > nEnd) || (nMiddle === -1)) {
                    sName = oDocCook.substring(nBegining, nEnd);
                    sValue = '';

                // извлечь значение поля
                } else {
                    sName = oDocCook.substring(nBegining, nMiddle);
                    sValue = oDocCook.substring(nMiddle + 1, nEnd);
                }

                // добавить в массив
                oCookies[decodeURIComponent(sName)] = decodeURIComponent(sValue);

                // пропуск до начала следущего поля
                nBegining = nEnd + 2;
            }

            return (name ? oCookies[name] : oCookies);
        },

        /**
         * Create a cookie with the specified name and value. Additional settings
         * for the cookie may be optionally specified (for example: expiration,
         * access restriction, SSL).
         * Обратите внимание: когда мы обновляем или удаляем куки, нам следует использовать только такие же настройки пути и домена, как при установки куки.
         * @public
         * @param {String} name The name of the cookie to set.
         * @param {*} value The value to set for the cookie.
         * @param {Object} [options]
         *   @param {*} [options.expires] may bee String | Numer(by days) | Date
         *   @param {String} [options.path]
         *   @param {String} [options.domain]
         * @return {void}
         */
        set: function(name, value, options) {
            if (!name) return;

            options = options || {};
            var expires = options.expires;

            if (typeof expires === 'number') {
                var d = new Date();
                d.setTime(d.getTime() + expires * 864e+5);
                expires = d;
            }

            if (expires instanceof Date) {
                options.expires = expires.toUTCString();
            }

            var updatedCookie = encodeURIComponent(name) + '=' + encodeURIComponent(value);

            for (var propName in options) {
                updatedCookie += '; ' + propName;
                var propValue = options[propName];

                if (propValue !== true) {
                    updatedCookie += '=' + propValue;
                }
            }

            document.cookie = updatedCookie;
        },

        /**
         * Удалить куку по имени
         * Обратите внимание: когда мы обновляем или удаляем куки, нам следует использовать только такие же настройки пути и домена, как при установки куки.
         * @public
         * @param {String} name
         * @param {Object} [options] see "set" method
         * @return {void}
         */
        del: function(name, options) {
            if (!options) options = {};
            options['max-age'] = -1;

            _self.set(name, '', options);
        },

        /**
         * Check a cookie enable
         * @public
         * @return {boolean}
         */
        getIsEnable: function() {
            var res = window.navigator.cookieEnabled;

            if (res === undefined) {
                res = !!(document.cookie || ((document.cookie='ce=1') && document.cookie));
            }

            return res;
        }
    };

    // временная хрень для отказа от соответствующих плагинов
    if (window.$ && !window.$.cookie) {
        window.$.cookie = function(key, value, options) {
            return _self[(arguments.length > 1 ? 'set' : 'get')](key, value, options);
        };
    }

    return _self
})();