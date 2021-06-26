const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

function _convert(number) {
    if (number < 10) {
        number = '0' + number;
    }

    return number;
}

module.exports = function(date, args) {
    const isUseClientTimezone = !!(args && args[0]);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    /**
     * https://jira.rbc.ru/browse/TASK-9916
     * Корректровка перевода времени в России
     * 27.03.2011 - 25.10.2014 было постоянно летнее время +4
     */
    /*var startWinterTime = new Date(Date.UTC(2011, 2, 27, 0, 0, 0)).getTime();
    var endWinterTime = new Date(Date.UTC(2014, 9, 26, 0, 0, 0)).getTime();
    var currentTimestamp = date.getTime();

    if (currentTimestamp > startWinterTime && currentTimestamp < endWinterTime) {
        date = new Date(currentTimestamp + 1000 * 60 * 60);
    }*/

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    const month = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const clearDate = _convert(date.getDate()) + '.' + month[date.getMonth()];
    const fullDate = _convert(date.getDate()) + '.' + date.getMonth() + '.' + date.getFullYear();
    const time = _convert(date.getHours()) + ':' + _convert(date.getMinutes());

    const now = isUseClientTimezone ? new Date() : _getDateMskTimezone();
    const today = _convert(now.getDate()) + '.' + now.getMonth() + '.' + now.getFullYear();
    const yesterday = new Date(now.valueOf() - 1000 * 60 * 60 * 24).getDate();
    const fullYesterday = yesterday + '.' + date.getMonth() + '.' + date.getFullYear();

    if (fullDate === today) {
        return time;
    } else if (fullDate === fullYesterday) {
        return 'Вчера ' + time;
    } else {
        return clearDate + ' ' + time;
    }
};