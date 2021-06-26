const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

function _convert(number) {
    if (number < 10) {
        number = '0' + number;
    }

    return number;
}

module.exports = function(date, args) {
    const [isHideToday = false, isUseClientTimezone = false] = (args || []);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    const fullDate = _convert(date.getDate()) + '.' + _convert(date.getMonth() + 1) + '.' + date.getFullYear();
    const time = _convert(date.getHours()) + ':' + _convert(date.getMinutes());

    const now = isUseClientTimezone ? new Date() : _getDateMskTimezone();
    const today = _convert(now.getDate()) + '.' + _convert(now.getMonth() + 1) + '.' + now.getFullYear();
    const yesterday = new Date(now.valueOf() - 1000 * 60 * 60 * 24).getDate();
    const fullYesterday = yesterday + '.' + (date.getMonth() + 1) + '.' + date.getFullYear();

    if (fullDate === today) {
        if (isHideToday) {
            return 'Сегодня, ' + time;
        } else {
            return time;
        }
    } else if (fullDate === fullYesterday) {
        return 'Вчера, ' + time;
    } else {
        return fullDate + ' ' + time;
    }
};