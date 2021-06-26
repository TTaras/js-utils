const _pluralize = require('repo/pluralize/main');

// ['символ', 'символа', 'символов']
module.exports = function(count, args) {
    return _pluralize(count, args);
};