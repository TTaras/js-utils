const _getShortMonth = require('./short-month-rus');
const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

function _convert(number) {
    if (number < 10) {
        number = '0' + number;
    }

    return number;
}

module.exports = function(date, args) {
    const [separator = ',', isUseClientTimezone = false] = (args || []);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    const clearDate = date.getDate() + ' ' + _getShortMonth(date, [true]);
    const fullDate = date.getDate() + '.' + date.getMonth() + '.' + date.getFullYear();
    const time = _convert(date.getHours()) + ':' + _convert(date.getMinutes());

    const now = isUseClientTimezone ? new Date() : _getDateMskTimezone();
    const today = now.getDate() + '.' + now.getMonth() + '.' + now.getFullYear();
    const yesterday = new Date(now.valueOf() - 1000 * 60 * 60 * 24).getDate();
    const fullYesterday = yesterday + '.' + date.getMonth() + '.' + date.getFullYear();

    if (fullDate === today) {
        return time;
    } else if (fullDate === fullYesterday) {
        return 'Вчера, ' + time;
    } else {
        return clearDate + separator + ' ' + time;
    }
};