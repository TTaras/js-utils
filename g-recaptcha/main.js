module.exports = (function() {
    var _helpers = RA.repo.helpers;

    /**
     * Activate Google reCaptcha
     * @constructor
     * @see https://developers.google.com/recaptcha/docs/invisible#render_param
     * @param {String|Object} container The HTML element to render the reCAPTCHA widget. Specify either the ID of the container (string) or the
     * @param {Object|String} [params] Params or sitekey
     *   @param {String} sitekey Your sitekey.
     *   @param {Function} [params.callback] The name of your callback function, executed when the user submits a successful response. The g-recaptcha-response token is passed to your callback.
     *   @param {Function} [params.error-callback]  The name of your callback function, executed when reCAPTCHA encounters an error (usually network connectivity) and cannot continue until connectivity is restored. If you specify a function here, you are responsible for informing the user that they should retry.
     *   @param {Function} [params.expired-callback] The name of your callback function, executed when the reCAPTCHA response expires and the user needs to re-verify.
     *   @param {String} [params.badge=bottomright] Reposition the reCAPTCHA badge. 'inline' lets you position it with CSS. (bottomleft|bottomright|inline)
     *   @param {String} [params.size] (invisible) Used to create an invisible widget bound to a div and programmatically executed.
     *   @param {Boolean} [params.isolated=false] For plugin owners to not interfere with existing reCAPTCHA installations on a page. If true, this reCAPTCHA instance will be part of a separate ID space.
     * @param {Boolean} [inherit=true] Use existing data-* attributes on the element if the coorsponding parameter is not specified. The values in parameter will take precedence over the attributes.
     */
    function Constructor(container, params, inherit) {
        var self = this;

        self.container = _helpers.is('string', container) ? document.getElementById(container) : container;
        self.inherit = !!inherit;
        self.widget = null;
        self.params = {};

        if (_helpers.isPlainObject(params)) {
            self.params = _helpers.extend(self.params, params);
        } else if (_helpers.is('string', params)) {
            self.params = _helpers.extend(self.params, {
                sitekey: params
            });
        }

        if (!self.container || !self.container.nodeName || !self.params.sitekey) {
            self.onError('Undefined required parameters');
            return;
        }

        if (window.grecaptcha && _helpers.is('function', window.grecaptcha.render)) {
            self.render();
        } else {
            window.onloadReCaptchaCallback = self.render.bind(self);

            var sc = document.createElement('script');
            sc.async = true;
            sc.src = 'https://www.google.com/recaptcha/api.js?onload=onloadReCaptchaCallback&render=explicit';

            var s = document.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(sc, s);
            sc.onerror = function() {
                self.onError('Can\'t load recaptcha api');
            };
        }
    }

    _helpers.extend(Constructor.prototype, {
        render: function() {
            // Renders the container as a reCAPTCHA widget and returns the ID of the newly created widget.

            var self = this;
            var grecaptcha = window.grecaptcha;

            if (self.widget !== null) return self.widget;

            if (grecaptcha) {
                self.widget = grecaptcha.render(self.container, self.params, self.inherit);
            } else {
                self.onError('undefined grecaptcha api');
            }

            return self.widget;
        },
        reset: function() {
            // Resets the reCAPTCHA widget.

            var grecaptcha = window.grecaptcha;
            var widget = this.widget;

            if (grecaptcha && widget !== null) {
                grecaptcha.reset(widget);
            }
        },
        getResponse: function() {
            // Gets the response for the reCAPTCHA widget.

            var grecaptcha = window.grecaptcha;
            var widget = this.widget;
            var key;

            if (grecaptcha && widget !== null) {
                key = grecaptcha.getResponse(widget);
            }

            return key;
        },
        execute: function() {
            // Programmatically invoke the reCAPTCHA check. Used if the invisible reCAPTCHA is on a div instead of a button.

            var grecaptcha = window.grecaptcha;
            var widget = this.widget;

            if (grecaptcha && widget !== null) {
                grecaptcha.execute(widget);
            }
        },
        onError: function(text) {
            var self = this;
            var errorCallback = this.params['error-callback'];

            if (typeof errorCallback === 'function') {
                errorCallback.call(self, text);
            } else {
                throw text;
            }
        }

    });

    return Constructor;
})();