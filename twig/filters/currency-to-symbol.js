module.exports = function(currencyNick) {
    const helpers = RA.helpers;
    const currencyToSymbol = helpers && helpers.currencyToSymbol;

    if (!currencyToSymbol) {
        return currencyNick;
    }

    return currencyToSymbol(currencyNick);
};