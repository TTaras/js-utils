const _helpers = RA.helpers;
const _formatNumber = _helpers.formatNumber;

module.exports = function(number, args) {
    if (!_formatNumber) return number;

    let params = {};

    if (args) {
        if (args[0] !== undefined) params.precision = args[0];
        if (args[1] !== undefined) params.isFixedPrecision = args[1];
        if (args[2] !== undefined) params.decimal = args[2];
        if (args[3] !== undefined) params.thousands = args[3];
        if (args[4] !== undefined) params.nan = args[4];
        if (_helpers.isEmpty(params)) params = null;
    }

    return _formatNumber(number, params);
};