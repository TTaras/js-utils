/* eslint camelcase: 'off' */
module.exports = (function() {
    //
    // в коммоне храним все основные фильтры
    // при необходимости, подключаем в проектах
    //
    // также проекты могут определвть "свои" кастомные фильтры
    //
    // тут подключаем только суперглобальные фильтры
    // которые доступны во всех проектах комби-машины
    //
    return {
        appendArgs: require('./append-args'),
        number_format_ra: require('./format-number'),
        digit_capacity: require('./digit-capacity'),
        picResize: require('./pic-resize'),
        pluralize: require('./pluralize'),
        pureCut: require('./pure-cut'),
        date_online: require('./date-online'),
        currency_to_symbol: require('./currency-to-symbol'),
        date_format: require('./date-format'),

        // это костыль и его бы вырезать
        // надо разбираться с php-ками
        body_filter: require('./body-filter')
    };
})();