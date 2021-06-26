const _getShortMonth = require('./short-month-rus');
const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

function _convert(number) {
    if (number < 10) {
        number = '0' + number;
    }

    return number;
}

module.exports = function(date, args) {
    const [todayFlag = true, isUseClientTimezone = false] = (args || []);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    const clearDate = _convert(date.getDate()) + ' ' + _getShortMonth(date, [true]);
    const fullDate = date.getDate() + '.' + date.getMonth() + '.' + date.getFullYear();
    const time = _convert(date.getHours()) + ':' + _convert(date.getMinutes());

    const now = new Date();
    const today = now.getDate() + '.' + now.getMonth() + '.' + now.getFullYear();

    if (fullDate === today && todayFlag) {
        return time;
    } else if (date.getFullYear() !== now.getFullYear()) {
        return clearDate + ' ' + date.getFullYear() + ', ' + time;
    } else {
        return clearDate + ', ' + time;
    }
};