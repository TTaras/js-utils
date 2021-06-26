module.exports = (function() {
    var _self;

    _self = {
        checkEmpty: function(inputs) {
            if (!inputs) return;

            var empty = [];
            for (var i = 0, len = inputs.length; i < len; i++) {
                if ((inputs[i].hasAttribute('required')) && inputs[i].value.trim() === '') {
                    empty.push(inputs[i]);
                }
            }

            return empty;
        },

        setError: function(text, block, append) {
            if (!block) return;

            var isClose = typeof text !== 'string';

            if (isClose) {
                block.innerHTML = '';
                block.style.display = 'none';

            } else {
                if (append) {
                    block.innerHTML = block.innerHTML + text + '</br>';
                } else {
                    block.innerHTML = text;
                }
                block.style.display = 'block';
            }
        },

        formAvailability: function(form, enabled) {
            enabled = !!enabled;
            _self.disabled(form, enabled);
            form.isBlock = !enabled;
        },

        disabled: function(form, bInvert) {
            var i = 0;
            var oElem;

            if (form) {
                bInvert = !!bInvert;
                while (oElem = form.elements[i++]) { // eslint-disable-line
                    if (oElem.type === 'hidden' || (bInvert && oElem.dataset.disabled)) continue;
                    oElem.disabled = !bInvert;
                    oElem.classList.toggle('disabled', !bInvert);
                }
            }

            return form;
        },

        serialize: function(form) {
            var postData = {};

            if (form) {
                var formElements = form.elements;
                for (var i=0; i < formElements.length; i++) {
                    if (formElements[i].type !== 'submit') {
                        postData[formElements[i].name] = formElements[i].value;
                    }
                }
            }

            return postData;
        }
    };

    return _self;
})();