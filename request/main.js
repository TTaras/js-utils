module.exports = (function() {
    var _self;

    var _Transport;

    var _fetchOptions = {
        method: 'GET',
        mode: 'cors',
        credentials: 'same-origin',
        redirect: 'follow',
        cache: 'default'
    };
    var _responseHooks = new Set();
    var _requestHooks = new Set();
    var _reqList = new Set();

    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    function _createFetchConstructor() {
        function _FetchConstructor(url, options, dataType) {
            var th = this;

            th.req = null;
            th.abortController = new AbortController();
            th.dataType = dataType || 'json';
            th.url = url;

            th.options = Object.assign({}, _fetchOptions, options, {
                signal: th.abortController.signal
            });
        }

        Object.assign(_FetchConstructor.prototype, {
            /**
             * Run ajax
             * @param {object} [params]
             *   @param {function} params.requestHook request local hook, receive ajax instance (th) as param
             *   @param {function} params.responseHook responce local hook, receive server response and ajax instance (th) as params
             * @return {Promise}
             */
            send: function(params) {
                var th = this;

                _reqList.add(th);

                // request hooks
                if (!th.isApplyRequestHooks) {
                    th.isApplyRequestHooks = true;

                    // local response hook
                    var requestHook = params && params.requestHook;
                    if (requestHook) {
                        requestHook(th);
                    }

                    // global response hook
                    if (_requestHooks.size) {
                        _requestHooks.forEach(function(hook) {
                            hook(th);
                        });
                    }
                }

                th.req = fetch(th.url, th.options)
                    .then(function(response) {
                        if (!response.ok) {
                            throw new _RequestError({
                                message: th.url + 'status code - ' + response.status + ', text - ' + response.statusText,
                                code: response.status,
                                response: response
                            });
                        }

                        switch (th.dataType) {
                            case 'json':
                                return response.json();
                            case 'arraybuffer':
                                return response.arrayBuffer();
                            case 'blob':
                                return response.blob();
                            case 'formData':
                                return response.formData();
                            case 'text':
                                return response.text();
                            default:
                                return response;
                        }
                    })
                    .then(function(response) {
                        // local response hook
                        var responseHook = params && params.responseHook;
                        if (responseHook) {
                            response = responseHook(response, th);
                        }

                        // global response hook
                        if (_responseHooks.size) {
                            _responseHooks.forEach(function(hook) {
                                response = hook(response, th);
                            });
                        }

                        return response;
                    })
                    .finally(function() {
                        _reqList.delete(th);
                    });

                return th.req;
            },
            abort: function() {
                this.abortController.abort();
            }
        });

        return _FetchConstructor;
    }

    // https://developer.mozilla.org/ru/docs/Web/API/XMLHttpRequest
    /*function _createXHRConstructor() {
        function _XHRConstructor(url, options, dataType) {
            var th = this;

            th.req = null;
            th.dataType = dataType || 'json';
            th.url = url;

            th.options = Object.assign({}, _fetchOptions, options);
        }

        Object.assign(_XHRConstructor.prototype, {
            /!**
             * Run ajax
             * @param {object} [params]
             *   @param {function} params.requestHook request local hook, receive ajax instance (th) as param
             *   @param {function} params.responseHook responce local hook, receive server response and ajax instance (th) as params
             * @return {Promise}
             *!/
            send: function(params) {
                var th = this;

                _reqList.add(th);

                // request hooks
                if (!th.isApplyRequestHooks) {
                    th.isApplyRequestHooks = true;

                    // local response hook
                    var requestHook = params && params.requestHook;
                    if (requestHook) {
                        requestHook(th);
                    }

                    // global response hook
                    if (_requestHooks.size) {
                        _requestHooks.forEach(function(hook) {
                            hook(th);
                        });
                    }
                }

                return new Promise(function(resolve, reject) {
                    th.req = new XMLHttpRequest();
                    th.req.open(th.options.method, th.url, true);

                    // daraType
                    switch (th.dataType) {
                        case 'json':
                            th.req.responseType = 'json';
                            break;
                        case 'arraybuffer':
                            th.req.responseType = 'arraybuffer';
                            break;
                        case 'blob':
                            th.req.responseType = 'blob';
                            break;
                        case 'text':
                            th.req.responseType = 'text';
                            break;
                    }

                    // headers
                    if (th.options.headers) {
                        for (var name in th.options.headers) {
                            th.req.setRequestHeader(name, th.options.headers[name]);
                        }
                    }

                    // credentials
                    th.req.withCredentials = th.options.credentials === 'include';

                    // send
                    if (th.options.body) {
                        th.req.send(th.options.body);
                    } else {
                        th.req.send();
                    }

                    // response
                    th.req.onload = function(e) {
                        _reqList.delete(th);

                        if (e.target.status && e.target.status < 300) {
                            var response;

                            if (th.dataType === 'raw') {
                                response = th.req;
                            } else {
                                 response = th.req.response;
                            }

                            // local response hook
                            var responseHook = params && params.responseHook;
                            if (responseHook) {
                                response = responseHook(response, th);
                            }

                            // global response hook
                            if (_responseHooks.size) {
                                _responseHooks.forEach(function(hook) {
                                    response = hook(response, th);
                                });
                            }

                            resolve(response);
                        } else {
                            reject(new _RequestError({
                                message: th.url + ', status code - ' + e.target.status + ', text - ' + e.target.statusText,
                                status: e.target.status,
                                response: e.target
                            }));
                        }
                    };

                    // network error + user abort
                    th.req.onerror = th.req.onabort = function(e) {
                        _reqList.delete(th);
                        reject(new _RequestError({
                            message: th.url + ', network error',
                            status: 0,
                            name: (e.type === 'abort' ? 'AbortError' : 'TypeError')
                        })));
                    };
                });
            },
            abort: function() {
                this.req.abort();
            }
        });

        return _XHRConstructor;
    }*/

    // Error constructor
    function _RequestError({message = null, code = 0, name = 'RequestError', response = null}) {
        this.name = name;
        this.code = code;
        this.message = 'Ошибка выполнения запроса' + (message ? ': ' + message : '');
        this.response = response;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, _RequestError);
        } else {
            this.stack = (new Error()).stack;
        }
    }
    _RequestError.prototype = Object.create(Error.prototype);
    _RequestError.prototype.constructor = _RequestError;

    //_Transport = typeof window.fetch === 'function' ? _createFetchConstructor() : _createXHRConstructor();
    _Transport = _createFetchConstructor();

    _self = {
        /**
         * Create ajax instance with "send" and "abort" methods
         * "send" - run ajax and return Promise (receive optional params.requestHook and params.responseHook)
         * "abort" - abort ajax
         * @param {string} url
         * @param {object} [options] (see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch)
         * @param {string} [dataType=json] response data type, json|arraybuffer|blob|formData|text|raw (see https://developer.mozilla.org/en-US/docs/Web/API/Body/body)
         * @return {object} ajax instance
         * @example
         *     RA.request.addRequestHook(function(instance) {
         *         instance.options.headers['my-header1'] = 'my value1';
         *     });
         *
         *     var req = RA.request.create('/ajax', {
         *         method: 'POST',
         *         body: JSON.stringify([1,2,3]),
         *         headers: {
         *             'Content-Type': 'application/json;charset=UTF-8'
         *         },
         *     }, 'json');
         *
         *     req.send({
         *         requestHook: function(instance) {
         *             instance.options.headers['my-header2'] = 'my value2';
         *         },
         *         responseHook: function(response, instance) {
         *             response.newParam = 'test';
         *             return response;
         *         }
         *     }).then(function(response) {
         *         console.log(response);
         *     })
         *
         */
        create: function(url, options, dataType) {
            return new _Transport(url, options, dataType);
        },
        /**
         * Set global ajax options
         * @param {object} options
         * @return {object}
         */
        setOptions: function(options) {
            _fetchOptions = Object.assign(_fetchOptions, options);
            return _fetchOptions;
        },
        /**
         * Add global request hook
         * @param {function} hook, receive param: ajax instance
         * @return {void}
         * @example
         *     RA.request.addRequestHook(function(instance) {
         *         instance.options.headers.myHeader = 'my value';
         *     });
         */
        addRequestHook: function(hook) {
            if (typeof hook === 'function') {
                _requestHooks.add(hook);
            }
        },
        /**
         * Set global request hooks
         * @see .addRequestHook method
         * @param {array|function} hooks
         * @return {void}
         */
        setRequestHooks: function(hooks) {
            if (typeof hooks === 'function') hooks = [hooks];
            if (!Array.isArray(hooks)) return;

            _requestHooks = [];
            hooks.forEach(function(hook) {
                if (typeof hook === 'function') {
                    _requestHooks.add(hook);
                }
            });
        },
        /**
         * Add global response hook
         * @param {function} hook, receive two params: responce and ajax instance
         * @return {void}
         * @example
         *     RA.request.addResponseHook(function(response, instance) {
         *         response.key1 = 'value';
         *         return response;
         *     });
         */
        addResponseHook: function(hook) {
            if (typeof hook === 'function') {
                _responseHooks.add(hook);
            }
        },
        /**
         * Set global response hooks
         * @see .addResponseHook method
         * @param {array|function} hooks
         * @return {void}
         */
        setResponseHooks: function(hooks) {
            if (typeof hooks === 'function') hooks = [hooks];
            if (!Array.isArray(hooks)) return;

            _responseHooks = [];
            hooks.forEach(function(hook) {
                if (typeof hook === 'function') {
                    _requestHooks.add(hook);
                }
            });
        },
        /**
         * Abort all ajax
         * @return {void}
         */
        abortAll: function() {
            _reqList.forEach(function(req) {
                req.abort();
            });

            _reqList.clear();
        },
        /**
         * Send data by beacon transport
         * @see https://developer.mozilla.org/ru/docs/Web/API/Navigator/sendBeacon#Browser_compatibility
         * @param {string} url
         * @param {*} data
         * @return {void}
         */
        sendBeacon: function(url, data) {
            if (!data) return;

            var navigator = window.navigator;
            var serializeData = JSON.stringify(data);
            if (!navigator.sendBeacon || !navigator.sendBeacon(url, serializeData)) {
                var t = new XMLHttpRequest();
                t.open('POST', url, false);
                t.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
                t.withCredentials = true;
                t.send(serializeData);
            }
        }
    };

    return _self;
})();