const _getDateMskTimezone = RA.helpers.getDateMskTimezone;

module.exports = function(date, args) {
    const [isAccusative = false, isUseClientTimezone = false] = (args || []);

    if (!date) return '';
    if (!date.getTime) date = new Date(date);
    if (isNaN(date.getTime())) return '';

    if (!isUseClientTimezone) {
        date = _getDateMskTimezone(date);
    }

    const month = date.getMonth();

    if (!isAccusative) {
        const russianMonths = [
            'январь',
            'февраль',
            'март',
            'апрель',
            'май',
            'июнь',
            'июль',
            'август',
            'сентябрь',
            'октябрь',
            'ноябрь',
            'декабрь'
        ];
        return (russianMonths[month] || '');

    } else {
        const russianMonthsAaccusative = [
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
        return (russianMonthsAaccusative[month] || '');
    }
};