const _helpers = RA.helpers;
const _digitCapacity = _helpers.digitCapacity;

module.exports = function(number, args) {
    if (!_digitCapacity) return number;

    let params = {};

    if (args) {
        if (args[0] !== undefined) params.precision = args[0];
        if (args[1] !== undefined) params.abbr = args[1];
        if (args[2] !== undefined) params.decimal = args[2];
        if (_helpers.isEmpty(params)) params = null;
    }

    return _digitCapacity(number, params);
};