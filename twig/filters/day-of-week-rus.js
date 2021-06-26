const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

module.exports = function(date, args) {
    const isUseClientTimezone = !!(args && args[0]);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

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

    const day = date.getDay();

    return (daysOfWeek[day] || '');
};