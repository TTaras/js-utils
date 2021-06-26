module.exports = function(params) {
    var self = this;

    var _tplPreloader = require('blocks/preloader/main.html');
    var _tplNoResultsBlock = require('blocks/search/notfind.html');

    var _helpers = RA.repo.helpers;

    var _name = 'load-item';
    var _isLoading = false;
    var _maxOverflow = false;

    var _$loadContainer;
    var _$scroll;
    var _$preloader;
    var _$noResultsBlock;
    var _$loadMoreLink;
    var _clientHeight = 0;
    var _posision = {
        bottom: 0,
        itemsCount: 0
    };

    var _params = {
        container: document.documentElement, // {DomNode|CSSSelector|jQuery} контейнер, в котором происходит подгрузка по доскроллу
        loadContainer: null, // {DomNode|CSSSelector|jQuery} контейнер для загрузки
        preloader: true, // {Boolean} показывать прелоадер
        preloaderPlace: 'insertAfter', // {String} положение вставки прелоадера (insertAfter|append)
        noResultsBlock: false, // {Boolean} показывать блок "Ничего не найдено" для пустых результатов
        loadByScroll: true, // {Boolean} подгрузка по доскроллу
        itemSelector: '', // {String} CSS селектор элемента в списке подгрузки
        buttonSelector: '',

        triggerUpdateName: RA.eventManager.EVENT_UPDATE_MAIN_CONTENT, // {String} имя триггера (отбрасываем триггер при изменении контента)

        // callbacks, 'this' rel to self; one param - data (full server responce) on done or error text message on fail
        onLoadDone: null,
        onLoadFail: null,
        onAppendDone: null,
        onAppendFail: null,

        url: '/filter/ajax', // {String} источник для загрузки
        limit: 12, // {Number} лимит элементов для подгрузки
        urlParams: {}, // {Object} дополнительные параметры запроса к источнику

        ret: {
            html: true, // {Boolean} формат результата данных; приходит отрендеренный html от источника, если false, то приходят данные(json) и рендерим сами на фронте (шаблон _params.tpl)
            attrName: 'html', // {String} название атрибута с данными в json/html ответе (прим: items|html), для json данных ответ может быть просто массивом
            attrTplName: 'items', // {String} название переменной в шаблоне для ret.html=false
            attrCount: 'count', // {String} название атрибута ответа с кол-вом возвращенных элементов для ret.html=true (не total !!!!!!!!!!!!!!!!!!!)
            attrMoreFlag: null // {String} название атрибута ответа с флагом продолжать подгрузку или нет (альтернатива attrCount)
        },

        noResultsTpl: null, // {Object|NULL} кастомный шаблон для блока "Ничего не найдено", должен быть метод .render()
        tpl: null, // {Object|NULL} шаблон для данных (ret.html=false), должен быть метод .render()
        distance: 560, // {Number} расстояние до нижней части _params.container при скролле для срабатывания подгрузки
        maxCount: 0 // {Number} ограничение общего кол-ва загруженных элементов
    };


    function _init() {
        if (!_params.container || !_params.loadContainer || (_params.loadByScroll && !_params.itemSelector)) {
            throw 'Error initialization load-items.';
        }

        if (!_params.ret.html) {
            if (!_params.tpl && !_params.tpl.render) {
                throw 'Error initialization load-items: not find template for items.';
            }
        }

        // Если банер не тригерит ничего, 50px доп. зазор
        var bottomDistance = _helpers.toInt(RA.config.get('layout.bottomBannerHeight'));
        if (!_params.distance || _params.distance < bottomDistance + 50) {
            _params.distance = bottomDistance;
        }

        // vars
        _params.container = $(_params.container).eq(0);
        _params.loadContainer = $(_params.loadContainer).eq(0);
        if (!_params.container.length || !_params.loadContainer.length) return;

        _$loadContainer = _params.loadContainer;

        if (_params.container[0] === document.documentElement) {
            _$scroll = $(window);
        } else {
            _$scroll = _params.container;
        }
        if (_params.preloader) {
            _$preloader = $(_tplPreloader.render({}));
        }
        if (_params.noResultsBlock) {
            _$noResultsBlock = _params.noResultsTpl && _params.noResultsTpl.render ? $(_params.noResultsTpl.render()) : $(_tplNoResultsBlock.render());
        }

        if (_params.loadByScroll) {
            // events
            $(window).on('resize.' + _name, ($.throttle ? $.throttle(300, _windowResizeHandler) : _windowResizeHandler));
            $(document).on('banner.' + _name, _windowResizeHandler);
            _$loadContainer.on('update', _updateContainerHandler);
            _bindScrollEvent(true);

            // inits
            _windowResizeHandler();
        } else if (_params.buttonSelector){
            _$loadMoreLink = $(_params.buttonSelector);
            _$loadMoreLink.on('click', function(){
                _posision.itemsCount = $(_params.itemSelector).length;
                _append();
            });
        }
    }

    // scroll

    function _windowResizeHandler() {
        // элемент может стать по ряду причин невидим
        // поэтому не сбрасываем ранее вычисленное значение
        var clientHeight = _params.container[0].clientHeight;
        if (clientHeight) _clientHeight = clientHeight;

        _$loadContainer.trigger('update');
    }

    function _scrollHandler() {
        var scroll = _$scroll.scrollTop();
        if (scroll + _clientHeight + _params.distance > _posision.bottom) {
            _append();
        }
    }

    function _updateContainerHandler() {
        _getContainerPosition();

        if (_posision.itemsCount === 0) {
            _bindScrollEvent(false);
        } else if (_params.maxCount && _posision.itemsCount >= _params.maxCount) {
            _bindScrollEvent(false);
            _maxOverflow = true;
        }
    }

    function _bindScrollEvent(on) {
        var th = _bindScrollEvent;

        if (on === undefined) {
            on = true;
        }
        on = !!on;

        if (on && !_maxOverflow) {
            if (!th.init) {
                _$scroll.on('scroll.' + _name, ($.throttle ? $.throttle(150, _scrollHandler) : _scrollHandler));
            }
        } else {
            _$scroll.off('scroll.' + _name);
        }

        th.init = on;
    }

    function _getContainerPosition() {
        var bottom = _$loadContainer && _$loadContainer[0] ? _$loadContainer[0].scrollHeight : 0;
        var itemsCount = $(_params.itemSelector, _$loadContainer).length;

        if (_params.container !== _params.loadContainer && _$loadContainer && _$loadContainer[0]) {
            bottom += _$loadContainer.offset().top;
        }

        _posision = {
            bottom: bottom,
            itemsCount: itemsCount
        };

        _isLoading = false;
    }

    function _resetContainerPosition() {
        _posision = {
            bottom: 0,
            itemsCount: 0
        };
        _maxOverflow = false;
    }

    function _append() {
        var _th = _append;
        if (_isLoading) return false;

        _isLoading = true;

        if (_$preloader) {
            if (_params.preloaderPlace === 'insertAfter') {
                _$preloader.insertAfter(_$loadContainer);
            } else {
                _$preloader.appendTo(_$loadContainer);
            }
        }

        _bindScrollEvent(false);

        var dfd = _getItemHtml();
        dfd.done(function(html, isEnd, count, data) {
            if (_$preloader) _$preloader.detach();

            if (count) {
                _th.scroll = _$scroll.scrollTop() || 0;
                _$loadContainer.append(html);
                _$scroll.scrollTop(_th.scroll);

                // bind scroll event
                if (!isEnd) {
                    if (_params.loadByScroll) {
                        setTimeout(function() {
                            _bindScrollEvent(true);
                            _$loadContainer.trigger('update');
                        }, 200);
                    }
                }
            }

            if (_params.buttonSelector){
                _isLoading = false;

                if (isEnd){
                    _$loadMoreLink.hide();
                    _$loadMoreLink.off('click');
                }
            }

            // done callback
            if (_params.onAppendDone) {
                _params.onAppendDone.call(self, data);
            }

        }).fail(function(errorText) {
            if (_$preloader) _$preloader.detach();
            if (_params.noResultsBlock) _$loadContainer.html('<div class="g-nofound">' + errorText + '</div>');
            if (_params.buttonSelector) _$loadMoreLink.hide();

            // fail callback
            if (_params.onAppendFail) {
                _params.onAppendFail.call(self, errorText);
            }
        });

        // RA global trigger
        if (_params.triggerUpdateName && RA.eventManager.isBind(_params.triggerUpdateName)) {
            dfd.always(function() {
                RA.eventManager.trigger(_params.triggerUpdateName);
            });
        }

        return dfd;
    }

    function _insert(urlParams, extParams) {
        _isLoading = true;

        _resetContainerPosition();
        _$loadContainer.empty();

        if (_$preloader) {
            _$loadContainer.append(_$preloader);
        }

        _bindScrollEvent(false);

        var dfd = _getItemHtml(urlParams);
        dfd.done(function(html, isEnd, count, data) {
            if (_$preloader) _$preloader.detach();

            // add extend params
            if (extParams) {
                if (extParams.htmlBefore) {
                    html = extParams.htmlBefore + html;
                }
                if (extParams.htmlAfter) {
                    html = html + extParams.htmlAfter;
                }
            }

            // insert result
            if (count) {
                _$loadContainer.html(html);

                // bind scroll event
                if (!isEnd) {
                    setTimeout(function() {
                        _bindScrollEvent(true);
                        _$loadContainer.trigger('update');
                    }, 200);
                }

            // no results
            } else if (_params.noResultsBlock) {
                _$loadContainer.html(_$noResultsBlock);
            }

            if (_params.buttonSelector){
                _isLoading = false;

                if (isEnd){
                    _$loadMoreLink.hide();
                    _$loadMoreLink.off('click');
                }
            }

            // done callback
            if (_params.onLoadDone) {
                _params.onLoadDone.call(self, data);
            }

        }).fail(function(errorText) {
            if (_$preloader) _$preloader.detach();
            _$loadContainer.html('<div class="g-nofound">' + errorText + '</div>');

            // fail callback
            if (_params.onLoadFail) {
                _params.onLoadFail.call(self, errorText);
            }
        });

        // RA global trigger
        if (_params.triggerUpdateName && RA.eventManager.isBind(_params.triggerUpdateName)) {
            dfd.always(function() {
                RA.eventManager.trigger(_params.triggerUpdateName);
            });
        }

        return dfd;
    }

    // get items data

    function _getItemHtml(urlParams) {
        var dfd = $.Deferred();
        var getDataFunction = _getItemData;

        if (getDataFunction.req) {
            getDataFunction.req.abort();
            getDataFunction.req = null;
        }

        getDataFunction(urlParams).done(function(data) {
            var html = '';
            var count = 0;
            var isEnd = true;

            if (data) {
                // is html
                if (_params.ret.html) {
                    if (data[_params.ret.attrName]) {
                        html = '' + data[_params.ret.attrName];

                        if (_params.ret.attrMoreFlag) {
                            count = _helpers.toInt(html !== '');
                            isEnd = !data[_params.ret.attrMoreFlag];
                        } else {
                            count = _helpers.toInt(data[_params.ret.attrCount]);
                            isEnd = count < _params.limit;
                        }
                    }

                // render json data by template
                } else {
                    var items = data[_params.ret.attrName] || data;
                    if (_helpers.isArray(items) && items.length) {
                        var obj = {};
                        obj[_params.ret.attrTplName] = items;
                        html = _params.tpl.render(obj);
                        count = items.length;
                        isEnd = count < _params.limit;
                    }
                }
            }

            dfd.resolve(html, isEnd, count, data);
        })
            .fail(function(xhr, textStatus) {
                if (textStatus === 'abort' || !xhr.status) return;
                dfd.reject('Ошибка выполнения запроса.');
            });

        return dfd;
    }

    function _getItemData(urlParams) {
        var th = _getItemData;

        // собираем запрос из фильтра
        var searchParams = _helpers.extend({}, _params.urlParams, urlParams, {
            offset: _posision.itemsCount,
            limit: _params.limit
        });

        th.req = $.ajax({
            url: _params.url,
            dataType: 'json',
            data: searchParams
        }).always(function() {
            th.req = null;
        });

        return th.req;
    }


    // API

    /**
     * Переопределение параментов запроса к источнику
     * @param {Object} params
     * @return {Void}
     */
    this.updateParams = function(params) {
        $.extend(true, _params, params);
    };

    /**
     * Переопределение кол-ва загруженных элементов
     * @param {Number} offset
     * @return {Void}
     */
    this.updateOffset = function(offset) {
        _posision.itemsCount = offset;
    };

    /**
     * Загрузить элементы из источника в контейнер
     * @param {Object} urlParams
     * @param {Object} extParams
     * @return {Promise}
     */
    this.load = function(urlParams, extParams) {
        if (urlParams) {
            _params.urlParams = urlParams;
        }
        return _insert({}, extParams);
    };

    /**
     * Получить html элементов из источника
     * @param {Object} urlParams
     * @return {String}
     */
    this.getItemsHtml = function(urlParams) {
        if (!_helpers.isEmpty(urlParams)) {
            _params.urlParams = urlParams;
        }
        return _getItemHtml();
    };

    /**
     * Остановить подгрузку по скроллу
     * @return {Void}
     */
    this.destroy = function() {
        $(window).off('.' + _name);
        $(document).off('.' + _name);
        _$loadContainer.off('update');

        _bindScrollEvent(false);
        _resetContainerPosition();

        _$loadContainer = null;
        _clientHeight = 0;
    };

    // set instance params
    $.extend(true, _params, params);
    _init();
};
