module.exports = (function() {
    var _self;
    var _MODULE_NAME = 'PRO :: repo/storage';

    var _helpers = RA.repo.helpers;
    var _authManager = RA.authManager;
    var _localStorage = RA.localStorage;

    var _URL = RA.config.get('pro.apiUrl') + '/v1/user/storage/pro';
    var _STORAGE_KEY = 'storage';

    var _data = {};
    var _readyPromise;


    function _init() {
        _readyPromise = new Promise(function(resolve) {
            _loadData()
                .then(function(data) {
                    if (data) {
                        _helpers.extend(_data, data);
                    }
                })
                .catch(function() {
                    _error('Произоша ошибка при получении данных пользователя.', true);
                })
                .finally(function() {
                    resolve(_data);
                });
        });
    }

    function _loadData() {
        // при отключенных куках вообще ничего не храним
        if (!_helpers.isCookieEnable()) {
            return Promise.reject();
        }

        // для анонимов используем локальное хранилище
        if (!_authManager.getIsLogined()) {
            var data;

            try {
                data = JSON.parse(_localStorage.getItem(_STORAGE_KEY));

                // данные старше 30 дней -> очищаем
                if ((Date.now() - data.ts) / (1000*60*60*24) > 30) {
                    _localStorage.removeItem(_STORAGE_KEY);
                    data = null;
                }

            } catch (e) {
                _localStorage.removeItem(_STORAGE_KEY);
                data = null;
            }

            return Promise.resolve(data);
        }

        // для авторизованных используем сервис
        var req = RA.repo.request.create(_URL, {credentials: 'include'}, 'json');
        return req.send().catch(function(error) {
            _error(error.message);
            throw error;
        });
    }

    function _setData(key, value) {
        //var promise = $.Deferred();

        if (!_helpers.is('string', key)) {
            _error('invalid type for key');
            return Promise.reject();
        }

        _data[key] = value;
        _data.ts = Date.now();

        if (!_helpers.isCookieEnable()) {
            _error('can\'t store user data: cookie is not available');
            return Promise.reject();
        }

        if (!_authManager.getIsLogined()) {
            if (_localStorage) {
                _localStorage.setItem(_STORAGE_KEY, JSON.stringify(_data));
                return Promise.resolve();
            } else {
                _error('browser local storage is not available');
                return Promise.reject();
            }
        }

        // try sendBeacon
        var navigator = window.navigator;
        var serializeData = JSON.stringify(value);
        if (navigator.sendBeacon && navigator.sendBeacon(_URL + '/' + key, serializeData)) {
            return Promise.resolve();
        }

        // if not works sendBeacon
        var req = RA.repo.request.create(_URL, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'text/plain;charset=UTF-8'
            },
            body: serializeData
        }, 'text');

        return req.send().catch(function(error) {
            _error(error.message);
            throw error;
        });
    }

    function _error(error, isShow) {
        var errorObj = {
            error: (isShow ? error : _MODULE_NAME + ' :: ' + error),
            show: !!isShow
        };

        RA.errorHandler.send(errorObj);
    }

    _self = {
        /**
         * Run cb function on ready storage
         * @param {function} cb
         * @return {promise}
         */
        ready: function(cb) {
            return _readyPromise.then(cb);
        },
        /**
         * Get data from storage
         * @param {string} [key]
         * @return {*}
         */
        get: function(key) {
            return key ? _data[key] : _data;
        },
        /**
         * Save data to storage
         * @param {string} key
         * @param {*} value
         * @return {promise}
         */
        set: function(key, value) {
            return _readyPromise.then(function() {
                return _setData(key, value);
            });
        }
    };

    _init();

    return _self;
})();