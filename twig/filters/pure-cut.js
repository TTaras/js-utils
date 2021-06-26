module.exports = function(text, args) {
    const len = Number(args && args[0]);
    let lastSpace;

    if (typeof text !== 'string') {
        text = text.toString();
    }

    if (!len || text.length <= len) {
        return text;
    }

    text = text.slice(0, len);
    lastSpace = text.lastIndexOf(' ');

    if (lastSpace > 0) {
        text = text.substr(0, lastSpace);
    }

    return text + '...';
};