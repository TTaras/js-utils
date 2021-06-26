const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

module.exports = function(date, args) {
    const isUseClientTimezone = !!(args && args[0]);

    if (!date) return '';
    if (date === 'now') {
        date = new Date();
    } else if (!date.getTime) {
        date = new Date(date);
    }
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    const month = date.getMonth();
    const russianMonths = [
        'янв',
        'фев',
        'мар',
        'апр',
        'май',
        'июн',
        'июл',
        'авг',
        'сен',
        'окт',
        'ноя',
        'дек'
    ];

    return (russianMonths[month] || '');
};