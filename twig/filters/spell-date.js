const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

module.exports = function(date, args) {
    const [isHideYear = true, isMonthShort = false, isWeekday = false, isAccusative = false, isUseClientTimezone = false] = (args || []);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    const yearNow = (isUseClientTimezone ? new Date() : _getDateMskTimezone()).getFullYear();
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dayOfWeek = date.getDay();

    // Неделя в JavaScript начинается с воскресенья, так что результат будет числом от 0(воскресенье) до 6(суббота).
    const daysOfWeek = [
        'воскресенье',
        'понедельник',
        'вторник',
        'среда',
        'четверг',
        'пятница',
        'суббота'
    ];

    const daysOfWeekisAccusative = [
        'воскресенье',
        'понедельник',
        'вторник',
        'среду',
        'четверг',
        'пятницу',
        'субботу'
    ];

    const russianMonths = [
        'января',
        'февраля',
        'марта',
        'апреля',
        'мая',
        'июня',
        'июля',
        'августа',
        'сентября',
        'октября',
        'ноября',
        'декабря'
    ];


    let output = day + ' ' + (!isMonthShort ? russianMonths[month] : russianMonths[month].substring(0, 3));

    if (!isHideYear || yearNow !== year) {
        output += ' ' + year;
    }

    if (isWeekday) {
        if (isAccusative) {
            output = daysOfWeekisAccusative[dayOfWeek] + ', ' + output;
        } else {
            output = daysOfWeek[dayOfWeek] + ', ' + output;
        }
    }

    return output;
};