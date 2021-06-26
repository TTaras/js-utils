/**
 * RA config util
 * Save data in tempaltes or scripts and get it anywhere
 *
 * config.set( 'some.path.with.dot.notation', myWhateverData );
 * config.get();  // entire config object
 * config.get('some.path.with.dot.notation');
 */
module.exports = (function() {
    var _settings = {};

    function _walk(obj, path, value) {
        path = ('' + path).split('.');

        for (var i = 0; i < path.length; i++) {

            // set
            if (arguments.length === 3) {
                if (i + 1 === path.length) {
                    obj[path[i]] = value;
                } else if (obj[path[i]] === undefined) {
                    obj[path[i]] = {};
                }

            // get
            } else {
                if (obj[path[i]] === undefined) {
                    return undefined;
                }

            }

            obj = obj[path[i]];
        }

        return obj;
    }

    return {
        set: function(key, value) {
            return _walk(_settings, key, value);
        },
        get: function(prop) {
            if (!prop) {
                return _settings;
            }

            return _walk(_settings, prop);
        }
    };
})();