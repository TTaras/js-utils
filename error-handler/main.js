module.exports = (function() {
    let _self;

    function _logging(obj) {
        console.error(obj); // eslint-disable-line
    }

    function _show(message) {
        var dynamic = RA.repo.dynamic;
        dynamic.require('fn.raNotifications', true);
        dynamic.requireCSS('fn.ra-notifications', true);
        dynamic.ready(function() {
            RA.fn.raNotifications.show({
                type: 'error',
                closeTimer: 5,
                title: message
            });
        });
    }

    function _getErrorMessage(errorObject) {
        let message;

        message = errorObject && errorObject.message;

        return message;
    }

    _self = {
        /**
         * Display/logging error
         * @param {string|object} errorData
         *   @param {boolean} [errorData.logging=true]
         *   @param {boolean} [errorData.show=true]
         *   @param {string|object} errorData.error
         * @return {void}
         */
        send: function(errorData) {
            if (typeof errorData === 'string') {
                _logging(errorData);
                _show(errorData);

            } else if (typeof errorData === 'object') {
                let message;
                let {logging = true, show = true, error} = errorData;

                if (typeof error === 'string') {
                    message = error;
                } else if (typeof error === 'object') {
                    message = _getErrorMessage(error);
                }

                if (message) {
                    if (logging) _logging(error);
                    if (show) _show(message);
                } else {
                    throw 'PRO :: repo/errorHandler :: invalid params';
                }

            } else {
                throw 'PRO :: repo/errorHandler :: invalid params';
            }
        }
    };

    return _self;
})();