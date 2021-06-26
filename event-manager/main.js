module.exports = (function() {
    let _oHandlerData = {};
    let _listEvents = new Set();

    let self = {
        EVENT_UPDATE_MAIN_CONTENT: 'layoutUpdateMainContent',
        EVENT_SLIDE_CHANGE: 'changeSlide',
        EVENT_VIEWPORT_CHANGE: 'changeViewport',
        EVENT_DEVICE_CHANGE: 'device.change',
        //---- CHECKAD
        EVENT_LOGINFO: 'loginfo_detected', // блокировка баннеров
        EVENT_LOGINFO_NOTIFY: 'loginfo_notify', // блокировка баннеров - постфактум оповещение для приложение RA
        //---- BANNER
        EVENT_BANNER: 'banner', // показ/схлопывание баннера
        EVENT_BANNER_INITED: 'bannerInited', // произошла инициализация баннеров на странице
        EVENT_BANNER_FLOAT_TARGETING: 'bannerSetFloatTargeting', // установить локальный таргеринг

        /**
         * Add application listener
         * @public
         * @param {String} sEvent Event name (support namespacing)
         * @param {Function} fHandler A function to execute each time the event is triggered
         * @param {Object} [oDataEvent] A map of data that will be passed to the event handler
         * @return {void}
         */
        on: function(sEvent, fHandler, oDataEvent) {
            if (!sEvent || !sEvent.split || !fHandler) return;
            let isExist = false;

            let oCurrLevel = _oHandlerData;
            for (let sName of sEvent.split('.')) {
                if (!oCurrLevel[sName]) oCurrLevel[sName] = {};
                oCurrLevel = oCurrLevel[sName];
            }


            if (!oCurrLevel.aHandler) {
                oCurrLevel.aHandler = [];
            } else {
                for (let oHandler of oCurrLevel.aHandler) {
                    if (oHandler.name === sEvent && oHandler.handler === fHandler) {
                        isExist = true;
                        break;
                    }
                }
            }

            if (!isExist) {
                oCurrLevel.aHandler.push({name: sEvent, data: oDataEvent, handler: fHandler});
                _listEvents.add(sEvent);
            }
        },

        /**
         * Remove application listener
         * @public
         * @param {String} [sEvent] Event name (support namespacing)
         * @param {Function} [fHandler]
         * @return {void}
         */
        off: function(sEvent, fHandler) {
            if (!sEvent) {
                _oHandlerData = {};
                _listEvents.clear();
                return;
            }

            if (!sEvent.split) return;

            let aName = sEvent.split('.');
            let oCurrLevel = _oHandlerData;
            let oParentLevel;

            if (!oCurrLevel[aName[0]]) return;

            for (let sName of aName) {
                if (oCurrLevel[sName]) {
                    oParentLevel = oCurrLevel;
                    oCurrLevel = oCurrLevel[sName];
                }
            }

            if (fHandler) {
                let aHandler = oCurrLevel.aHandler
                let j = 0;
                let oHandler;

                if (aHandler) {
                    // eslint-disable-next-line
                    while (oHandler = aHandler[j++]) {
                        if (oHandler.handler === fHandler) {
                            aHandler.splice((j - 1), 1);
                        }
                    }
                    if (!aHandler.length) {
                        _listEvents.delete(sEvent);
                    }
                }
            } else {
                delete(oParentLevel[(aName.pop())]);
                _listEvents.delete(sEvent);
            }
        },

        /**
         * Trigger application listener
         * @public
         * @param {String} sEvent Event name (support namespacing)
         * @param {Object} [oParam] An object of additional parameters to pass along to the event handler
         * @return {void}
         */
        trigger: function(sEvent, oParam) {
            if (!sEvent || !self.isBind(sEvent)) return;

            let f = function(sEventName, oHandlerTree) {
                if (!sEventName || !oHandlerTree) return;

                let e = {type: sEventName};
                let aHandler = oHandlerTree.aHandler;

                if (aHandler) {
                    for (let oHandler of aHandler) {
                        if (oHandler.handler) {
                            e.data = oHandler.data || null;
                            if (oHandler.handler.call(window.RA, e, oParam) === false) {
                                return;
                            }
                        }
                    }
                }

                for (let name in oHandlerTree) {
                    if (name === 'aHandler') continue;
                    f(sEventName, oHandlerTree[name]);
                }
            };

            let aName = sEvent.split('.');
            let oCurrLevel = _oHandlerData;

            if (oCurrLevel[aName[0]]) {
                for (let sName of aName) {
                    if (oCurrLevel[sName]) {
                        oCurrLevel = oCurrLevel[sName];
                    }
                }

                f(aName[0], RA.repo.helpers.cloneObject(oCurrLevel));
            }
        },

        /**
         * Get application events
         * @public
         * @return {Object}
         */
        getList: function() {
            return _oHandlerData;
        },

        /**
         * Check exist listener
         * @public
         * @param {String} name
         * @return {Object}
         */
        isBind: function(name) {
            return _listEvents.has(name);
        }
    };

    return self;
})();