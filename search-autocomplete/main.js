/**
 * Автокомплит для input (AC)
 * @date 10.11.2016
 * @requires jQuery, RA.repo.helpers
 *
 * @param {Object} params Параметры АС
 *   @param {Mixed} params.input  поле ввода (Selector|DomNode|Jquery)
 *   @param {Mixed} params.container контейнер АС (Selector|DomNode|Jquery)
 *   @param {Object} params.tpl шаблон для АС
 *   @param {String} params.tplItemSelector селектор элемента списка АС
 *   @param {String} [params.tplItemsField=items] переменная в шаблоне со списком элементов АС
 *   @param {Number} [params.len=3] минимальное кол-во знаков поля ввода для старта AC
 *   @param {Number} [params.delay=400] задержка ввода на срабатывание АС
 *   @param {String} params.url сервис
 *   @param {Object} [param.query] дополнительные параметры запроса
 *   @param {Object} [param.css] вспомогательные css классы АС
 *       @param {String} [params.onSelect.activeContainer=active] класс активного АС (открытие/закрытие)
 *       @param {String} [params.onSelect.activeContainerItem=active] класс активного элемента в списке АС
 *   @param {Boolean} [param.isResultHtml=false] html формат данных ответа сервиса (если false, то JSON)
 *   @param {Object} [param.resultFields] поля объекта в массиве ответа сервиса (JSON ответ); если null, то считаем, что массив состоит из значений (не объекты)
 *       @param {String} [param.resultFields.value=value] тут лежат значения для поля ввода
 *   @param {Function} [params.onLoadData] пользовательская ф-ия при получении данных с сервера, в качестве параметра ей передается ответ сервера; this ссылается на объект АС; функция должна вернуть массив данных (_data)
 *   @param {Function} [params.onClose] пользовательская ф-ия при закрытии AC; this ссылается на объект АС
 *   @param {Function} [params.onError] пользовательская ф-ия для обработки ошибок сервера, в качестве параметра ей передается текст ошибки
 *   @param {Function} [params.onSelect] пользовательская пользовательская ф-ия при выборе результата из АС; this в ней ссылается на объект АС; первый параметр DomNode поля ввода, второй - значение
 *
 *  public methods
 *
 *      setParams: function(params) Установить параметры
 *         @param {Object} params
 *         @return {Object} новые параметры
 *
 *     trigger: function(value) Установить значение поля ввода и вызвать автокомплит
 *         @param {String} value значение
 *         @return {Void}
 *
 *     close: function() Сбросить автокомплит
 *         @return {Void}
 *
 *
 *  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *  если ответ сервиса в html (param.isResultHtml), то
 *  должна быть определена params.onLoadData
 *  + она должна вернуть корректный массив данных для _data (как для JSON ответа)
 *  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *
 *
 *  @example JS
 *
 *  var Autocomp = require('repo/search-autocomplete');
 *  var ac = new Autocomp({
 *      input: $('.js-autocomp'),
 *      container: $('.js-autocomp-container'),
 *      tpl: require('/company/search/ac/main'),
 *      tplItemSelector: '.js-autocomp-item',
 *      url: '/search',
 *      query: {limit: 10}
 *  });
 *
 *
 *  @example HTML
 *
 *  <input type="text" class="js-autocomp">
 *  <div class="js-autocomp-container"></div>
 *
 */
module.exports = function(params) {
    /**
     * Параметры АС по умолчанию
     * @private
     * @type Object
     */
    var _params = {
        input: null,
        container: null,

        tpl: null,
        tplItemSelector: null,
        tplItemsField: 'items',

        len: 3,
        delay: 400,
        url: null,
        query: {},

        css: {
            activeContainer: 'active',
            activeContainerItem: 'active'
        },

        isResultHtml: false,
        resultFields: {
            value: 'value'
        },

        onLoadData: null,
        onClose: null,
        onError: null, // function (err)
        onSelect: null // function (input, data)
    };

    /**
     * Ссылка на экземпляр объекта AC
     * @private
     * @type Boolean
     */
    var self = this;

    /**
     * IE < 10
     * @private
     * @type Boolean
     */
    var _isIE9 = document.all && !window.atob;
    /**
     * Helpers functions
     * @private
     * @type Object
     */
    var _helpers = RA.repo.helpers;

    /**
     * Docunekt
     * @private
     * @type JQuery
     */
    var _$doc;
    /**
     * поле ввода
     * @private
     * @type JQuery
     */
    var _$input;
    /**
     * Ссылка на контейнер AC
     * @private
     * @type JQuery
     */
    var _$container;
    /**
     * Элементы списка AC
     * @private
     * @type JQuery
     */
    var _$items;

    /**
     * Содержание автокоплита
     * @private
     * @type Array
     */
    var _data = [];
    /**
     * Текущий активный элемент AC
     * @private
     * @type Number
     */
    var _indexActiveItemdata = -1;
    /**
     * Флаг активного AC
     * @private
     * @type Boolean
     */
    var _isActiveAC = false;
    /**
     * Request to backend
     * @private
     * @type Deffered|Null
     */
    var _reqData;
    /**
     * Dalay input
     * @private
     * @type Number|null
     */
    var _inputTimer;


    /**
     * Инициализация АС для элемента
     * @private
     * @return {Void}
     */
    function _init() {
        _$doc = $(document);
        _$input = $(_params.input).eq(0);
        _$container = $(_params.container).eq(0);

        if (!_$input.length
            || !_$container.length
            || !_params.url
            || (!_params.tpl && !_params.isResultHtml)
            || !_params.tpl.render
            || !_params.tplItemSelector) {
            return;
        }

        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // если ответ сервиса в html (_params.isResultHtml), то
        // должна быть определена _params.onLoadData
        // + она должна вернуть корректный массив данных для _data
        //
        if (_params.isResultHtml && !_params.onLoadData) {
            return;
        }

        if (_isIE9) {
            _$input
                .on('focus', function() {
                    var th = $(this);
                    th.data('before', th.val());
                })
                .on('paste cut drop keyup', function() {
                    var th = this;
                    var $th = $(th);
                    var val = th.value || '';
                    if ($th.data('before') !== val) {
                        $th.data('before', val);
                        if (_inputTimer) clearTimeout(_inputTimer);
                        _inputTimer = setTimeout(function() {
                            _inputChangeHandler.call(th);
                        }, _params.delay);
                    }
                });
        } else {
            _$input.on('input', function() {
                var th = this;
                if (_inputTimer) clearTimeout(_inputTimer);
                _inputTimer = setTimeout(function() {
                    _inputChangeHandler.call(th);
                }, _params.delay);
            });
        }
    }

    function _setEventAC() {
        _$input.on('keydown.ac', _inputKeydownHandler);
        _$container.on('click.ac', _params.tplItemSelector, _clickContainerItemHandler);
        _$doc.on('keydown.ac', _acKeydownHandler);
    }

    function _unsetEventAC() {
        _$input.off('.ac');
        _$container.off('.ac');
        _$doc.off('.ac');
    }

    function _inputChangeHandler() {
        var value = '' + _helpers.trim(this.value);

        if (value.length >= _params.len) {
            _getData(value)
                .done(function(data) {
                    _data = data || [];

                    // run user function
                    if (_params.onLoadData) {
                        _data = _params.onLoadData.call(self, _data);
                    }

                    // !!!!!!
                    if (_helpers.isArray(_data) && _data.length) {
                        _render((_params.isResultHtml ? data : _data));
                    } else {
                        _close();
                    }
                })
                .fail(_close);
        } else {
            _close();
        }
    }

    /**
     * Обработчик события "keydown" на _$input
     * @private
     * @param {Object} event объект события
     * @return {Boolean}
     */
    function _inputKeydownHandler(event) {
        var k = _helpers.toInt(event && (event.keyCode || event.which));

        // Close and exit for Esc
        if (k === 27) {
            _close();
        }

        return true;
    }

    /**
     * Обработчик события "keydown" на document при активном АС
     * @private
     * @param {Object} event объект события
     * @return {Void|Boolean}
     */
    function _acKeydownHandler(event) {
        if (!event) return true;
        event.preventDefault();

        var k = _helpers.toInt(event.keyCode || event.which),
            isUp = (k === 38 && _indexActiveItemdata > 0),
            isDown = (k === 40 && (_indexActiveItemdata < _data.length - 1));

        if (isUp || isDown) {
            _$items.eq(_indexActiveItemdata).removeClass(_params.css.activeContainerItem);
        }

        // up
        if (isUp) {
            // change index of active row
            _indexActiveItemdata--;

        // up or down
        } else if (isDown) {
            // change index of active row
            _indexActiveItemdata++;

        // Enter, Tab
        } else if (k === 13 || k === 9) {
            _selectResult(_indexActiveItemdata);
            return;
        }

        _$items.eq(_indexActiveItemdata).addClass(_params.css.activeContainerItem);
    }

    /**
     * Обработчик события "click" на АС
     * @private
     * @param {Object} event объект события
     * @return {Void}
     */
    function _clickContainerItemHandler(e) {
        if (e && e.preventDefault) e.preventDefault();

        _indexActiveItemdata = _helpers.toInt(this.getAttribute('data-index'));

        _selectResult(_indexActiveItemdata);
    }

    function _selectResult(index) {
        var value = _data && _data[index] && (_params.resultFields && _params.resultFields.value ? _data[index][_params.resultFields.value] : _data[index]);

        if (value) {
            _$input.val(value);
            _close();

            if (_params.onSelect) {
                _params.onSelect.call(self, _$input[0], value);
            }
        }
    }

    /**
     * Отправка запроса на сервер
     * @private
     * @param {String} value
     * @return {Defferd}
     */
    function _getData(value) {
        var data = {
            'search': value
        };

        // тормозим активный запрос
        if (_reqData && _reqData.abort) {
            _reqData.abort();
        }

        _$input.addClass('loading');
        _reqData = $.ajax({
            url: _params.url,
            data: (_helpers.extend(data, _params.query)),
            dataType: 'json'
        }).fail(function(xhr, textStatus) {
            if (xhr.statusText === 'abort' || xhr.status === 0) return;
            if (_params.onError) { // run user function
                _params.onError(xhr.status + ' ' + xhr.statusText + ' : ' + textStatus);
            }
        }).always(function() {
            _$input.removeClass('loading');
            _reqData = null;
        });

        return _reqData;
    }

    /**
     * Рисуем список АС
     * @private
     * @param {Array} data
     * @return {Void}
     */
    function _render(data) {
        if (_params.isResultHtml) {
            _$container.html(data);
        } else {
            var tplData = {};
            tplData[_params.tplItemsField] = data;

            var html = _params.tpl.render(tplData);
            _$container.html(html);
        }

        _$container.scrollTop(0);
        _initContainer();
    }

    /**
     * Инициализируем контейнер автокомплита
     * @private
     * @return {Void}
     */
    function _initContainer() {
        // сбрасываем текущий активный индекс результата
        _indexActiveItemdata = -1;

        // список элементов АС
        _$items = $(_params.tplItemSelector, _$container);

        // ставим события AC
        _setEventAC();

        // показываем AC
        _$container.addClass(_params.css.activeContainer);

        // AC активен
        _isActiveAC = true;
    }

    /**
     * Закрываем АС и очищаем его состояние
     * @private
     * @return {Void}
     */
    function _close() {
        // тормозим активный запрос
        if (_reqData && _reqData.abort) {
            _reqData.abort();
            _reqData = null;
        }

        // закрываем АС
        if (_isActiveAC) {
            // нах события AC
            _unsetEventAC();

            // зачистка данных
            _data = [];

            // сбрасываем текущий активный индекс результата
            _indexActiveItemdata = -1;

            // сбрасываем таймер ввода
            if (_inputTimer) {
                clearTimeout(_inputTimer);
                _inputTimer = null;
            }

            // закрываем AC
            _$container.removeClass(_params.css.activeContainer);

            // clear container
            _$container[0].innerHTML = '';

            // empty items
            _$items = null;

            // run user function
            if (_params.onClose) {
                _params.onClose.call(self);
            }

            // AC не активен
            _isActiveAC = false;
        }
    }


    // Public functions
    _helpers.extend(true, this, {
        /**
         * Устанавливаем параметры АС
         * @param {Object}
         * @return {Object}
         */
        setParams: function(params) {
            _helpers.extend(true, _params, params);
            return _params;
        },
        /**
         * Устанавливаем значение поля ввода и триггерим ввод
         * @param {String} value
         * @return {Void}
         */
        trigger: function(value) {
            var input = _$input &&_$input[0];
            if (input && !input.disabled) {
                input.valeu = value;
                _inputChangeHandler.call(input);
            }
        },
        /**
         * Закрыть АС
         * @return {Void}
         */
        close: _close
    });


    // constructor
    //
    _helpers.extend(true, _params, params || {});
    _init();
};