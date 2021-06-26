/**
 * Utility class for managing dom nodes events.
 * @singleton
 * @example
 *   var events = require('/repo/events/main');
 *
 *   targer format description:
 *     '.selector1'                       // simpte css selector
 *     ['.selector1', '.selector2', ...]  // array of selectors
 *     domNode                            // dom elem or window
 *     [DomNode1, DomNode2, ...]          // array of dom elems
 *     NodesList                          // elems collection (querySelectorAll ..)
 *
 *   on()
 *     events.on(targer, 'click', fn);
 *     events.on(targer, 'click', fn, true);            // set captute phase
 *     events.on(targer, 'click', fn, false, {foo: 1}); // send addition data to handlers (use in e.data)
 *
 *   off()
 *     events.off(targer, 'click', fn);      // fn handler for click events
 *     events.off(targer, 'click');          // all handlers for click events
 *     events.off(targer, 'click.gallery');  // all handlers for click events in gallery namespace
 *     events.off(targer, '.gallery');       // all handlers for all events in gallery namespace
 *     events.off(targer);                   // all handlers for all events
 *     events.off();                         // all handlers for all events for all elems
 *
 *   delegate()
 *     events.delegate(container, target, 'click', fn);
 *
 *   trigger()
 *     events.trigger(target, 'click');
 *
 *   triggerHandlers()
 *     // only handlers, without dispatch event by elems
 *     // In the handlers event.data and event.target will bee null
 *     events.triggerHandlers(target, 'click');
 *
 *   clearInContainer()
 *     events.clearInContainer(container);
 *
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *   ВНИМАНИЕ!
 *   При использовании данной библиотеки надо быть внимательным при удалении
 *   элементов из DOM. Необходимо предварительно снимать события .off с элементов или использовать
 *   метод clearInContainer. В противном случае в памяти будут оставаться связанные объекты и при определенных
 *   обстоятельствах этом может стать проблемой (т.н. утечка памяти)
 *   Похожая "шляпа" также присутствует и в jquery, так что..
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */
module.exports = (function() {
    var _self;
    var _helpers = RA.repo.helpers;
    var _MODULE = 'repo::events';

    var _data = {};
    /*
    _data structure:
    var _data = {
        '232334234_232323': {
            'click': {
                'handlers': [
                    {
                        'name': 'click',
                        'type': 'click',
                        'fn': fn,
                        'originFn': cb,
                        'elem': elem,
                        'useCapture': false,
                        'data': {}
                    },
                    ...
                ],
                'ns1': {
                    'handlers': [
                        {
                            'name': 'click.ns1',
                            'type': 'click',
                            'fn': fn,
                            'originFn': cb,
                            'elem': elem,
                            'useCapture': false,
                            'data': {}
                        },
                    ],
                    'ns2': {
                        'handlers': [],
                        ...
                    }
                }
            }
        }
    };*/

    function _getElems(target, container) {
        var elems = [];

        if (target) {
            // Selector
            if (typeof target === 'string') {
                elems = Array.prototype.slice.call((container || document).querySelectorAll(target));

            // Node || window
            } else if (target.nodeName || target instanceof Window || (target.document && target.document.nodeName)) {
                elems = [target];

            // Array || NodeList
            } else if (typeof target.forEach === 'function') {
                target.forEach(function(item) {
                    elems = elems.concat(_getElems(item));
                });
            }
        }

        return elems;
    }

    function _getAndDeleteElemHandlers(treeHandlers, ns, fn) {
        var handlers = [];

        if (ns && ns.length) {
            ns.forEach(function(name) {
                if (treeHandlers[name]) {
                    treeHandlers = treeHandlers[name];
                }
            });
        }

        for (var prop in treeHandlers) {
            if (prop === 'handlers') {
                if (fn) {
                    treeHandlers[prop].forEach(function(handler, i) {
                        if (fn === handler.originFn) {
                            handlers.push(handler);
                            treeHandlers[prop].splice(i, 1);
                            if (!treeHandlers[prop].length) {
                                delete treeHandlers[prop];
                            }
                        }
                    });
                } else {
                    handlers = handlers.concat(treeHandlers[prop]);
                    delete treeHandlers[prop];
                }
            } else {
                handlers = handlers.concat(_getAndDeleteElemHandlers(treeHandlers[prop], null ,fn));
            }
        }

        return handlers;
    }

    function _triggerHandlers(treeHandlers, extraParams) {
        for (var prop in treeHandlers) {
            if (prop === 'handlers') {
                treeHandlers[prop].forEach(function(handler) {
                    var event;
                    if (typeof(window.CustomEvent) === 'function') {
                        event = new CustomEvent(handler.type, {detail: extraParams});
                    } else if (document.createEvent) { /* IE 9+ */
                        event = document.createEvent('Event');
                        event.detail = extraParams;
                        event.initEvent(handler.type, true, true);
                    }

                    handler.originFn.call(handler.elem, event);
                });
            } else {
                _triggerHandlers(treeHandlers[prop], extraParams);
            }
        }
    }

    function _fatalError(error) {
        throw new Error(_MODULE + ' - ' + error);
    }

    _self = {
        /**
         * Bind event
         * @param {*} target CSS selector | Node | NodeList | Array.selector | Array.Node
         * @param {string} name Event name, support namespacing
         * @param {function} cb Callback function
         * @param {boolean} [useCapture=false] indicating whether events of this type will be dispatched to the registered listener before being dispatched to any EventTarget beneath it in the DOM tree
         * @param {object} [data] Custom data to be send event (read from event.data)
         * @param {*} [delegateTarget] Container for delegate, css selector | Node | NodeList | Array.selector | Array.Node
         * @return {void}
         */
        on: function(target, name, cb, useCapture, data, delegateTarget) {
            if (!target || typeof name !== 'string' || typeof cb !== 'function') {
                _fatalError('on - wrong params');
            }

            useCapture = !!useCapture;

            var names = name.split('.');
            var type = names.shift();

            _getElems(delegateTarget || target).forEach(function(elem) {
                var id = elem.raEventId;
                var elemData = id && _data[id];
                var elemNsData;
                var handlersList;
                var handlerFn;
                var i;

                if (!elemData) {
                    id = Date.now() + '_' + _helpers.randomInt(10000, 99999);
                    elem.raEventId = id;
                    _data[id] = elemData = {};
                }

                if (!elemData[type]) {
                    elemData[type] = {handlers: []};
                }

                // create/update _data
                elemNsData = elemData[type];
                if (names.length) {
                    for (i = 0; i < names.length; i++) {
                        if (!elemNsData[names[i]]) elemNsData[names[i]] = {handlers: []};
                        elemNsData = elemNsData[names[i]];
                    }
                }

                // тут все обработчики элемента
                handlersList = elemNsData.handlers;

                // смотрим повторные навешивания
                for (i = 0; i < handlersList.length; i++) {
                    if (name === handlersList[i].name && cb === handlersList[i].originFn) {
                        return;
                    }
                }

                // inner handler for delegate event
                if (delegateTarget) {
                    handlerFn = function(e) {
                        e.data = data;
                        var elem = e.target;

                        var findTargets = _getElems(target, this);
                        if (!findTargets.length) return;

                        while (elem && elem !== this) {
                            if (_helpers.inArray(elem, findTargets)) {
                                cb.call(elem, e);
                            }
                            elem = elem.parentNode;
                        }
                    };

                // inner handler for direct event
                } else {
                    handlerFn = function(e) {
                        e.data = data;
                        cb.call(this, e);
                    };
                }

                // store event in _data
                handlersList.push({
                    name: name,
                    type: type,
                    fn: handlerFn,
                    originFn: cb,
                    elem: elem,
                    useCapture: useCapture,
                    data: data
                });

                elem.addEventListener(type, handlerFn, useCapture);
            });
        },

        /**
         * Unbind event
         * @param {*} [target] CSS selector / Node / NodeList / Array.selector / Array.Node
         * @param {string} [name] Event name, support namespacing
         * @param {function} [cb] Callback function
         * @return {void}
         */
        off: function(target, name, cb) {
            var handlerList = [];
            var type, ns;

            // получаем список обработчиков по условиям
            // и убираем их из хранилища
            if (target) {
                ns = name && name.split('.');
                type = ns && ns.shift();

                _getElems(target).forEach(function(elem) {
                    var id = elem.raEventId;
                    var data = id && _data[id];
                    if (data) {
                        for (var name in data) {
                            if (!type || name === type) {
                                handlerList = handlerList.concat(_getAndDeleteElemHandlers(data[name], ns, cb));
                                if (_helpers.isEmpty(data[name])) {
                                    delete data[name];
                                }
                            }
                        }
                        if (_helpers.isEmpty(data)) {
                            delete _data[id];
                        }
                    }
                });

            // вообще для всех зарегистрированных элементов все события
            } else {
                for (var id in _data) {
                    for (name in _data[id]) {
                        handlerList = handlerList.concat(_getAndDeleteElemHandlers(_data[id][name]));
                    }
                }
                _data = {};
            }

            // remove events
            handlerList.forEach(function(handler) {
                handler.elem.removeEventListener(handler.type, handler.fn);
            });
        },

        /**
         * Bind event by delegate
         * @param {*} container CSS selector | Node | NodeList | Array.selector | Array.Node
         * @param {*} target CSS selector | Node | NodeList | Array.selector | Array.Node
         * @param {string} name Event name, support namespacing
         * @param {function} cb Callback function
         * @param {boolean} [useCapture=false] indicating whether events of this type will be dispatched to the registered listener before being dispatched to any EventTarget beneath it in the DOM tree
         * @param {object} [data] Custom data to be send event (read from event.data)
         * @return {void}
         */
        delegate: function(container, target, name, cb, useCapture, data) {
            _self.on(target, name, cb, useCapture, data, container);
        },

        /**
         * Dispatch event
         * @param {*} target CSS selector | Node | NodeList | Array.selector | Array.Node
         * @param {string} type Event type
         * @param {*} [extraParams] Additional data to send event handler (read from event.detail)
         * @return {void}
         */
        trigger: function(target, type, extraParams) {
            if (!target || typeof type !== 'string') {
                _fatalError('trigger - wrong params');
            }

            _getElems(target).forEach(function(elem) {
                var event = new CustomEvent(type, {detail: extraParams});
                elem.dispatchEvent(event);
            });
        },

        /**
         * Dispatch event handler only
         * In the handlers event.data and event.target will bee null
         * @param {*} target CSS selector | Node | NodeList | Array.selector | Array.Node
         * @param {string} type Event type
         * @param {*} extraParams Additional data to send event handler (read from event.detail)
         * @return {void}
         */
        triggerHandlers: function(target, type, extraParams) {
            if (!target || typeof type !== 'string') {
                _fatalError('triggetHadler - wrong params');
            }

            _getElems(target).forEach(function(elem) {
                var id = elem.raEventId;
                var elemTypeData = id && _data[id] && _data[id][type];

                if (!elemTypeData) return;

                _triggerHandlers(elemTypeData, extraParams);
            });
        },

        /**
         * Unbind all events for all elements in thecontainer
         * @param {*} containers CSS selector | Node | NodeList | Array.selector | Array.Node
         * @return {void}
         */
        clearInContainer: function(containers) {
            if (!containers) containers = document.body;

            _getElems(containers).forEach(function(container) {
                if (container instanceof Window || (container.document && container.document.nodeName)) {
                    container = document.body;
                }

                if (container.querySelectorAll) {
                    container.querySelectorAll('*').forEach(function(elem) {
                        var elemData = elem.raEventId && _data[elem.raEventId];
                        if (elemData) {
                            var handlerList = [];
                            for (var type in elemData) {
                                handlerList = handlerList.concat(_getAndDeleteElemHandlers(elemData[type]));

                                // clear elem type data
                                if (_helpers.isEmpty(elemData[type])) {
                                    delete elemData[type];
                                }
                            }

                            // remove events
                            handlerList.forEach(function(handler) {
                                handler.elem.removeEventListener(handler.type, handler.fn);
                            });

                            // clear elem data
                            if (_helpers.isEmpty(elemData)) {
                                delete _data[elem.raEventId];
                            }
                        }
                    });
                }
            });
        }
    };

    return _self;
})();