module.exports = function(url, args) {
    let query = '';
    let key;

    if (url && args && args.length) {
        for (let i = 0; i < args.length; i++) {
            key = args[i]._keys[0];
            query = key + '=' + args[i][key];
        }

        if (query !== '') {
            url += '?' + query;
        }
    }

    return url;
};