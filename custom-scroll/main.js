module.exports = (function($) {

    // plugin name
    const _PLUGIN_NAME = 'customScroll';
    let _helpers = RA.repo.helpers;

    // default setting
    let _settings = {
        css: {
            scrollable: 'js-scrollable',
            contentBlock: 'js-scrollable-content',
            track: 'custom-scroll',
            trackHold: 'custom-scroll_hold',
            bar: 'custom-scroll__trackbar'
        },

        createStructure: true,
        scrollableOffset: 35,
        autoHeight: false,
        widthResizable: true,
        heightResizable: false,

        onScroll: null
    };

    // constructor
    function CustomScroll(element, settings) {
        let self = this;
        self.element = element;

        // settings
        self.settings = _helpers.extend(true, {}, _settings, settings);
        self.track = null;
        self.bar = null;
        self.isHeld = false;
        self.params = {};
        self.startHeight = self.element.clientHeight || _helpers.toInt(window.getComputedStyle(self.element).height);

        self.init();
    }

    // plugin methods
    _helpers.extend(CustomScroll.prototype, {
        init: function() {
            let self = this;

            if (self.createStructure()) {

                // Устанавливаем габариты и позицию
                self.update();

                // set events

                // рассчет ширины контейнеров при изменений размера окна
                if (self.settings.widthResizable) {
                    RA.event.on(window, 'resize.width-' + _PLUGIN_NAME, self.updateWidth.bind(self));
                }

                // рассчет высоты контейнеров при изменений размера окна
                if (self.settings.heightResizable) {
                    RA.event.on(window, 'resize.height-' + _PLUGIN_NAME, self.update.bind(self));
                }

                // Отлавливаем прокрутку
                RA.event.on(self.scrollable, 'scroll.' + _PLUGIN_NAME, self.handleScroll.bind(self));

                // Отслеживаем нажатие на скроллбар
                RA.event.on(self.bar, 'mousedown.' + _PLUGIN_NAME, self.barMouseDown.bind(self));

                // Отслеживаем клики на контейнере
                RA.event.on(self.track, 'click.' + _PLUGIN_NAME, self.trackClick.bind(self));
            }
        },

        /**
         * Создаем html обвязку
         * @return {boolean}
         */
        createStructure: function() {
            let self = this;
            let cssSetting = self.settings.css;

            self.element.style.overflow = 'hidden';

            if (self.settings.createStructure) {
                self.contentBlock = document.createElement('div');
                self.contentBlock.setAttribute('class', cssSetting.contentBlock);

                self.scrollable = document.createElement('div');
                self.scrollable.setAttribute('class', cssSetting.scrollable);
                self.scrollable.appendChild(self.contentBlock);

                // скролл
                self.track = document.createElement('span');
                self.track.setAttribute('class', cssSetting.track);
                self.bar = document.createElement('span');
                self.bar.setAttribute('class', cssSetting.bar);
                self.track.appendChild(self.bar);

                //self.$element.wrapInner(self.$contentBlock).wrapInner(self.$scrollable);
                let childNodes = self.element.childNodes;
                if (childNodes.length) {
                    self.contentBlock.append(...childNodes);
                    self.element.append(self.scrollable);
                } else {
                    self.element.appendChild(self.scrollable);
                }

                self.element.appendChild(self.track);
            } else {
                self.track = self.element.querySelector('.' + cssSetting.track);
                self.bar = self.element.querySelector('.' + cssSetting.bar);
                self.contentBlock = self.element.querySelector('.' + cssSetting.contentBlock);
                self.scrollable = self.element.querySelector('.' + cssSetting.scrollable);
            }

            self.scrollable.style.height = '100%';
            self.scrollable.style.overflowY = 'scroll';

            return true;
        },

        /**
         * Отслеживает браузерную прокрутку интересующего блока
         * @return {void}
         */
        handleScroll: function() {
            let self = this;

            //clearTimeout(self.t);

            if (self.isHeld) {
                return;
            }

            let scrollTop = self.scrollable.scrollTop;

            self.bar.style.top = (0 | scrollTop * self.params.ratio) + 'px';

            let scrollValue = self.testTopScroll();

            if (self.settings.onScroll) {
                self.settings.onScroll(self, scrollValue);
            }

            /*if (e !== false) {
                 self.track.classlist.add(self.settings.visibleClassName);
                 self.t = setTimeout(function () {
                    self.track.removeClass(self.settings.visibleClassName);
                 }, 750);
             }*/
        },

        /**
         * Обрабатывает нажатие на скроллбар
         * @param {Event} e
         * @return {void}
         */
        barMouseDown: function(e) {
            let self = this;

            if (e && e.preventDefault) {
                e.preventDefault();
            }

            // Setting up a flag
            self.isHeld = true;

            self.track.classList.add(self.settings.css.trackHold);

            // Сохраняем отступы
            self.params.barStartPosition = self.bar.offsetTop;
            self.params.mousePointerOffset = (e && e.offsetY) || 0;
            self.params.mouseStartY = (e && e.pageY) || 0;

            // Listening events
            self.toggleEventsListeners(true);
        },

        /**
         * Навешивает или удаляет отслеживание событий курсора
         * в зависимости от состояния аргумента state
         * @param {boolean} state
         * @return {void}
         */
        toggleEventsListeners: function(state) {
            let self = this;
            let action = state ? 'on' : 'off';

            RA.event[action](document, 'mouseup', self.mouseUp.bind(self));
            RA.event[action](document, 'mousemove', self.mouseMove.bind(self));

            self.testTopScroll();
        },

        /**
         * Отслеживает событие mouseup и отменяет слежку за курсором
         * @return {void}
         */
        mouseUp: function() {
            let self = this;

            self.isHeld = false;
            self.track.classList.remove(self.settings.css.trackHold);

            // Not listening anymore
            self.toggleEventsListeners(false);
        },

        /**
         * Отслеживает перемещение курсора
         * @param {Event} e
         * @return {void}
         */
        mouseMove: function(e) {
            let self = this;
            let newBarPosition;

            if (!self.isHeld) {
                return;
            }

            newBarPosition = self.params.barStartPosition + (e.pageY - self.params.mouseStartY);

            self.scrollBarTo(newBarPosition);
        },

        /**
         * Перетягивает скроллбар на переданное значение
         * @param {number} value
         * @param {number} [animationSpeed]
         * @return {void}
         */
        scrollBarTo: function(value, animationSpeed) {
            let self = this;

            // Проверочки
            if (value < 0) {
                value = 0;
            }

            if (value > self.params.barMaxY) {
                value = self.params.barMaxY;
            }

            // Моментальная прокрутка
            if (!animationSpeed) {
                self.bar.style.top = value + 'px';
                self.scrollable.scrollTop = value / self.params.ratio;
                return;
            }

            // Прокрутка с анимацией
            let start = parseInt(self.bar.style.top, 10);
            let diff = value - start;

            _helpers.animate({
                duration: animationSpeed,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress) {
                    let now = start + diff * progress;
                    self.bar.style.top = now + 'px';
                    self.scrollable.scrollTop = now / self.params.ratio;
                }
            });
        },

        /**
         * Обрабатывает крокрутку по клику на скролл-треке
         * @param {Event} e
         * @return {void}
         */
        trackClick: function(e) {
            let self = this;

            let barHeight = self.bar.clientHeight,
                value;

            if (!e.target.classList.contains(self.settings.css.track)) {
                return;
            }

            value = e.offsetY - barHeight / 2;

            self.scrollBarTo(value, 300);
        },

        /**
         * Если мы проскролили до 70% - инициируем событие seventy
         * @return {number}
         */
        testTopScroll: function() {
            let self = this;

            let scrollable = self.scrollable;
            if (!scrollable) return 0;

            let scrollTop = scrollable.scrollTop || 0;
            let scrollHeight = scrollable.offsetHeight || self.track.offsetHeight || 0;
            let feedHeight = scrollable.scrollHeight || 0;
            let value = (scrollTop + scrollHeight) / feedHeight;

            if (value >= 0.7) {
                let e = new Event('seventy', {'bubbles': true, 'cancelable': false});
                self.element.dispatchEvent(e);
            }

            return value;
        },


        // API

        /**
         * Обрабатывает ресайз окна
         * @return {void}
         */
        updateWidth: function() {
            let self = this;

            if (!_helpers.isVisible(self.element)) {
                return;
            }

            // Скрываем встроенный скролл
            let w = self.element.offsetWidth;
            self.contentBlock.style.width = w + 'px';
            self.scrollable.style.width = (w + self.settings.scrollableOffset) + 'px';
        },

        /**
         * Обрабатывает ресайз контейнера при изменение содержимого
         * @return {void}
         */
        update: function() {
            let self = this;

            if (!_helpers.isVisible(self.element)) {
                return;
            }

            self.updateWidth();

            let contentBlockHeight = self.contentBlock.clientHeight;
            self.params.ratio = contentBlockHeight ? self.element.clientHeight / contentBlockHeight : 1;

            // без скрола / контент помещается
            if (self.params.ratio >= 1) {
                if (!self.settings.heightResizable && self.settings.autoHeight) {
                    self.element.style.height = 'auto';
                    self.element.style.maxHeight = 'auto';
                }
                self.track.style.display = 'none';

            // есть скролл
            } else {
                if (!self.settings.heightResizable && self.settings.autoHeight) {
                    self.element.style.height = self.startHeight + 'px';
                    self.element.style.maxHeight = 'none';
                }
                self.track.style.display = '';

                let trackHeight = self.track.clientHeight;
                let barHeight = 0 | trackHeight * self.params.ratio;
                self.params.barMaxY = trackHeight - barHeight;
                self.bar.style.height = barHeight + 'px';
                self.handleScroll();
            }
        },

        /**
         * Обрабатывает ресайз контейнера при изменение содержимого (алиас см. update)
         * @return {void}
         */
        handleResize: function() {
            return this.update();
        },

        /**
         * Палучить / Установить высоту контейнера
         * @return {number}
         */
        height: function(height) {
            let self = this;

            if (height === undefined) {
                return self.startHeight || 0;
            } else {
                self.startHeight = height;
                self.element.style.height = height + 'px';
                self.update();

                return height;
            }
        }
    });

    // register plugin
    if ($) {
        $.fn[_PLUGIN_NAME] = function() {
            let arg = arguments;
            return this.each(function() {
                // проверка на инициализацю объекта
                if (!$.data(this, 'plugin_' + _PLUGIN_NAME)) {
                    $.data(this, 'plugin_' + _PLUGIN_NAME, new CustomScroll(this, arg[0]));
                } else {
                    let obj = $.data(this, 'plugin_' + _PLUGIN_NAME);
                    // логика вызова метода
                    if (arg[0] && typeof arg[0] === 'string') {
                        if (obj[arg[0]]) {
                            obj[arg[0]].apply(obj, Array.prototype.slice.call(arg, 1));
                        } else {
                            throw 'Метод с именем ' + arg[0] + ' не существует для ' + _PLUGIN_NAME;
                        }
                    }
                }
            });
        };
    }

    return CustomScroll;
})(jQuery);