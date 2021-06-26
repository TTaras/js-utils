const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

module.exports = function(date, args) {
    const isUseClientTimezone = !!(args && args[0]);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    // Неделя в JavaScript начинается с воскресенья, так что результат будет числом от 0(вс) до 6(сб).
    const daysOfWeekShort = [
        'вс',
        'пн',
        'вт',
        'ср',
        'чт',
        'пт',
        'сб'
    ];

    const day = date.getDay();

    return (daysOfWeekShort[day] || '');
};