module.exports = function(url, args) {
    if (!url) return '';
    if (!args || !args.length) return url;

    const [paramName, paramValue] = args;

    if (paramName && paramValue) {
        if (url.includes('?')) {
            url += `&${paramName}=${paramValue}`;
        } else {
            url += `?${paramName}=${paramValue}`;
        }
    }

    return url;
};