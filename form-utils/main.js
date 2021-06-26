/**
 * @date 14.12.2016
 * @require jQuery, RA.repo.helpers
 */
module.exports = (function() {
    var _self;
    var _helpers = RA.repo.helpers;

    _self = {
        /**
         * Encode a set of form elements as an object of names and values.
         * Serialize form to object.
         * The successful argument controls whether or not the field element must be 'successful'
         * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
         * The default value of the successful argument is true.  If this value is false the value(s)
         * for each element is returned.
         * @public
         * @param {String|jQuery|Object} form This is jQuery or DOM Node
         * @param {Boolean} [bSuccessful=true]
         * @return {Object}
         */
        serializeObject: function(form, bSuccessful) {
            form = (typeof form === 'string' ? form = document.getElementById(form) : form.jquery ? form = form[0] : form);

            if (form) {
                var oData = {},
                    aData = [],
                    i = 0,
                    val,
                    oElem;
                while (oElem = form.elements[i++]) { // eslint-disable-line
                    val = _self.fieldValue(oElem, bSuccessful);
                    if (val && val.constructor === Array) {
                        for (var j = 0, nMax = val.length; i < nMax; j++)
                            aData.push({
                                name: oElem.name,
                                value: val[j]
                            });
                    } else if (val !== null && typeof val !== undefined) {
                        aData.push({
                            name: oElem.name,
                            value: val
                        });
                    }
                }
            }

            // все что было выше тоже самое, что и
            // .serializeArray() для формы
            // теперь новое, создаем на основе этого объект
            if (aData.length) {
                for (i = 0, nMax = aData.length; i < nMax; i++) {
                    if (oData[aData[i].name]) {
                        if (oData[aData[i].name].constructor === Array) {
                            oData[aData[i].name].push(aData[i].value);
                        } else {
                            oData[aData[i].name] = [oData[aData[i].name], aData[i].value];
                        }
                    } else {
                        oData[aData[i].name] = aData[i].value;
                    }
                }
            }

            return oData;
        },
        /**
         * Returns the value of the field element.
         * The successful argument controls whether or not the field element must be 'successful'
         * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
         * The default value of the successful argument is true.  If this value is false the value(s)
         * for each element is returned.
         * @param {Object} el
         * @param {Boolean} [bSuccessful=true]
         * @return {Array|String|null}
         */
        fieldValue: function(el, bSuccessful) {
            var sName = el.name,
                sType = el.type,
                sTag = el.tagName.toLowerCase();

            if (bSuccessful === undefined) bSuccessful = true;

            if (bSuccessful && (!sName || el.disabled || sType === 'reset' || sType === 'button' || sType === 'fieldset' || (sType === 'checkbox' || sType === 'radio') && !el.checked || (sType === 'submit' || sType === 'image') && el.form || sTag === 'select' && el.selectedIndex === -1))
                return null;

            if (sTag === 'select') {
                var nIndex = el.selectedIndex;
                if (nIndex < 0) return null;

                var aVal = [],
                    sVal,
                    oOps = el.options,
                    oOp;

                var bOne = (sType === 'select-one');
                var nMax = (bOne ? nIndex + 1 : oOps.length);

                for (var i = (bOne ? nIndex : 0); i < nMax; i++) {
                    oOp = oOps[i];
                    if (oOp.selected) {
                        sVal = oOp.value;
                        if (!sVal) // exkingtt.20121tra pain for IE...
                            sVal = (oOp.attributes && oOp.attributes.value && !(oOp.attributes.value.specified)) ? oOp.text : oOp.value;
                        if (bOne)
                            return sVal;
                        aVal.push(sVal);
                    }
                }

                return aVal;
            }

            return el.value;
        },
        /**
         * Clear fields
         * @param {String|Array.Object|jQuery|Object}
         * @returt jQuery
         */
        clearFields: function(el) {
            var jElem = (typeof el === 'string' ? $('#' + el) : $(el)),
                oElem,
                i = 0;

            while (oElem = jElem[i++]) { // eslint-disable-line
                var sType = oElem.type,
                    sTag = oElem.tagName.toLowerCase();

                if (sType === 'checkbox' || sType === 'radio')
                    oElem.checked = false;
                else if (sTag === 'select')
                    oElem.selectedIndex = -1;
                else
                    oElem.value = '';
            }
        },
        /**
         * Clears the form data.
         * @param {String|Object|jQuery} form
         * @return {Void}
         */
        clearForm: function(form) {
            var jForm = (typeof form === 'string' ? $('#' + form) : $(form));
            _self.clearFields($('input,select,textarea', jForm));
        },
        /**
         * Disabled fields
         * @param {String|Object|Array.Object|jQuery} elem
         * @param {Boolean} [bInvert]
         * @return {jQuery}
         */
        disabledFields: function(elem, bInvert) {
            var jElem = (typeof elem === 'string' ? $('#' + elem) : $(elem)),
                oElem,
                i = 0;

            bInvert = !!bInvert;
            while (oElem = jElem[i++]) { // eslint-disable-line
                if (bInvert) {
                    oElem.removeAttribute('data-disabled'); // mark as enabled
                } else {
                    oElem.setAttribute('data-disabled', 'true');
                }
                oElem.disabled = !bInvert;
                $(oElem).toggleClass('disabled', !bInvert);
            }

            return jElem;
        },
        /**
         * Enabled fields
         * @param {String|Object|Array.Object|jQuery} elem
         * @return {jQuery}
         */
        enabledFields: function(elem) {
            return _self.disabledFields(elem, true);
        },
        /**
         * Disabled form
         * @public
         * @param {jQuery|Object|String} oForm This is jQuery, DOM Node or form ID
         * @param {Boolean} [bInvert=false] true - enabled form, false - disabled form
         * @return {jQuery|Object}
         */
        disabled: function(form, bInvert) {
            var i = 0,
                oElem;

            form = (form.jquery ? form = form[0] : (typeof form === 'string' ? document.getElementById(form) : form));

            if (form) {
                bInvert = !!bInvert;
                while (oElem = form.elements[i++]) { // eslint-disable-line
                    if (oElem.type !== 'hidden') {
                        // enabled
                        if (bInvert && (oElem.hasAttribute && oElem.hasAttribute('data-disabled') || oElem['data-disabled'])) continue;
                        oElem.disabled = !bInvert;
                        $(oElem).toggleClass('disabled', !bInvert);
                    }
                }
            }

            return form;
        },
        /**
         * Enabled form
         * @public
         * @param {jQuery|Object|String} oForm This is jQuery, DOM Node or form ID
         * @return {jQuery|Object}
         */
        enabled: function(form) {
            return (_self.disabled(form, true));
        },
        /**
         * Get form fields by param
         * @public
         * @param {jQuery|DomNode|Array.String|Array.Object|String} elem список элементов формы
         * @param {String} [sPrefix] префикс ID-ков/имен полей
         * @param {String} [sDelim = ","] разделитель ID-ков/имен полей (если они переданы строкой)
         * @param {Boolean} [bByName=false] по именам полей
         * @param {jQuery|Object} [form] форма/контейнер/коллекция для поиска
         * @param {Boolean} [bByValue] по значению полей
         * @return {jQuery}
         */
        getField: function(elem, sPrefix, sDelim, bByName, form, bByValue) {
            if (elem === undefined) return jQuery();

            (typeof elem === 'number') && (elem = elem + ''); // eslint-disable-line

            if (typeof elem === 'string') {
                sDelim = sDelim || ',';
                elem = elem.split(sDelim);
            } else if (elem.nodeName) {
                elem = [elem];
            }

            if (elem && elem.constructor === Array) {
                var nLen = elem.length,
                    oElem,
                    aElem = [],
                    i = 0,
                    j = 0;

                sPrefix = sPrefix || '';

                if (bByValue) {
                    var jContainer = $(form || document),
                        jAll = jContainer.find('input, select, textarea');

                    // возможно form - это не контейнер, а jQuery объект искомых элементов (например коллекция radio)
                    if (!jAll.length)
                        jAll = jContainer;
                }

                if (form && form.jquery)
                    form = form[0];
                for (i; i < nLen; i++) {
                    if (bByValue) {
                        j = 0;
                        while (oElem = jAll[j++]) { // eslint-disable-line
                            if (oElem.value === elem[i])
                                aElem.push(oElem);
                        }
                    } else {
                        (typeof elem[i] === 'number') && (elem[i] = elem[i] + ''); // eslint-disable-line
                        typeof elem[i] === 'string' ? oElem = ((bByName && form) ? form[sPrefix + elem[i]] : document.getElementById(sPrefix + elem[i])) : oElem = elem[i]; // eslint-disable-line
                        if (oElem && oElem.length) {
                            var oElemTemp; j = 0;
                            while (oElemTemp = oElem[j++]) { // eslint-disable-line
                                aElem.push(oElemTemp);
                            }
                        } else if (oElem) {
                            aElem.push(oElem);
                        }
                    }
                    oElem = null;
                }
                elem = $(aElem);
            }

            return elem;
        },
        /**
         * Получить пустые элементы
         * @param {jQuery|domNode} [form=document]
         * @param {String} [sFindClass]
         * @param {Boolean} [bSuccessful=true]
         * @return {jQuery}
         */
        getEmptyField: function(form, sFindClass, bSuccessful) {
            sFindClass = (sFindClass ? '.' + sFindClass : 'input, select, textarea');
            var aEmpty = [],
                jElem = $(sFindClass, (form || document)),
                oElem,
                i = 0,
                sTag,
                oTrueTag = {
                    'input': true,
                    'select': true,
                    'textarea': true
                };

            if (bSuccessful === undefined) {
                bSuccessful = true;
            }

            while (oElem = jElem[i++]) { // eslint-disable-line
                sTag = oElem.tagName && oElem.tagName.toLowerCase();

                if (!(sTag && sTag in oTrueTag)) continue;
                if (bSuccessful && oElem.disabled) continue;

                if ($.trim(oElem.value) === '') {
                    aEmpty.push(oElem);
                }
            }

            return $(aEmpty);
        },
        /**
         * Mark form field
         * @public
         * @param {jQuery|domNode|Array.String|Array.domNode} elem поля формы или вся форма
         * @param {String} [sType=has-danger] (has-success/has-warning/has-error)
         * @param {String} [sGroupClass=form-group]
         * @param {Boolean} [bClear=false]
         * @param {Boolean} [bMarkGroup=true]
         * @return {jQuery}
         */
        markField: function(elem, sType, sGroupClass, bClear, bMarkGroup) {
            if (!elem) elem = jQuery();
            if (!sGroupClass) sGroupClass = 'form-group';
            if (bClear === undefined) bClear = false;
            if (bMarkGroup === undefined) bMarkGroup = true;

            bClear = !!bClear;
            bMarkGroup = !!bMarkGroup;

            // is form -> unmark all fields in the form
            if ((elem.jquery && elem.is('form')) || (elem.tagName && (elem.tagName.toUpperCase() === 'FORM'))) {
                if (sType) {
                    elem = $('.' + sType, elem).removeClass(sType);
                } else {
                    sType = 'has-danger has-warning has-success';
                    elem = $('.has-danger, .has-warning, .has-success', elem).removeClass(sType);
                }

                $(elem).find('.' + sGroupClass).removeClass(sType);

            // selected fields
            } else {
                if (!sType) sType = 'has-danger';

                if (!elem.jquery) {
                    var aElem = [];
                    if (!jQuery.isArray(elem)) {
                        elem = Array(elem);
                    }
                    for (var i = 0, n = elem.length; i < n; i++) {
                        aElem.push((typeof elem[i] === 'string' ? document.getElementById(elem[i]) : elem[i]))
                    }
                    elem = $(aElem);
                }

                elem.toggleClass(sType, !bClear);
                if (bMarkGroup) {
                    elem.closest('.' + sGroupClass).toggleClass(sType, !bClear);
                }
            }

            return elem;
        },
        /**
         * Unmark form field
         * @public
         * @param {jQuery|domNode} elem поля формы или вся форма
         * @param {String} [sType=has-danger] (has-success/has-warning/has-error)
         * @param {String} [sGroupClass=form-group]
         * @param {Boolean} [bMarkGroup=true]
         * @return {jQuery}
         */
        unmarkField: function(elem, sType, sGroupClass, bMarkGroup) {
            return _self.markField(elem, sType, sGroupClass, true, bMarkGroup);
        },
        /**
         * Checked/unchecked checkbox
         * @public
         * @param {DomNode|Array.String|Array.Object|String} elem список элементов формы
         * @param {String} [sPrefix] префикс ID-ков/имен полей
         * @param {String} [sDelim = ","] разделитель ID-ков/имен полей (если они переданы строкой)
         * @param {Boolean} [bChecked = true]
         * @param {Boolean} [bByName=false] по именам полей
         * @param {Object} [oForm] форма
         * @param {Boolean} [bByValue] по значению полей
         * @return {jQuery}
         */
        setCheckbox: function(elem, sPrefix, sDelim, bChecked, bByName, oForm, bByValue) {
            var jElem = _self.getField(elem, sPrefix, sDelim, bByName, oForm, bByValue);
            bChecked = (!!bChecked || typeof bChecked === 'undefined' ? true : false);
            jElem.filter('input:checkbox,input:radio').prop('checked', bChecked);
            return jElem;
        },
        /**
         * Checked checkbox by id
         * @public
         * @param {Array|String} id список ID-ков элементов
         * @param {String} [sPrefix] префикс ID-ков
         * @param {String} [sDelim = ","] разделитель ID-ков (если они переданы строкой)
         * @return {jQuery}
         */
        checkedById: function(id, sPrefix, sDelim) {
            return _self.setCheckbox(id, sPrefix, sDelim, true);
        },
        /**
         * Unchecked checkbox by id
         * @public
         * @param {Array|String} id список ID-ков элементов
         * @param {String} [sPrefix] префикс ID-ков
         * @param {String} [sDelim = ","] разделитель ID-ков (если они переданы строкой)
         * @return {jQuery}
         */
        uncheckedById: function(id, sPrefix, sDelim) {
            return _self.setCheckbox(id, sPrefix, sDelim, false);
        },
        /**
         * Checked checkbox by value
         * @public
         * @param {Array.String|String} id список значений
         * @param {Object} [oContainer=document] контейнер для поиска элементов
         * @param {String} [sDelim = ","] разделитель значений
         * @return {jQuery}
         */
        checkedByVal: function(val, oContainer, sDelim) {
            return _self.setCheckbox(val, null, sDelim, true, false, oContainer, true);
        },
        /**
         * Checked checkbox by value
         * @public
         * @param {Array.String|String} id список значений
         * @param {Object} [oContainer=document] контейнер для поиска элементов
         * @param {String} [sDelim = ","] разделитель значений
         * @return {jQuery}
         */
        uncheckedByVal: function(val, oContainer, sDelim) {
            return _self.setCheckbox(val, null, sDelim, false, false, oContainer, true);
        },
        /**
         * Add new option to the select
         * @public
         * @param {Object|String|jQuery} listbox DOM element
         * @param {String} sText отображаемый текст элемента
         * @param {String|Number} value значение элемента
         * @param {Boolean} [bDefaultSelected = false] будет ли элемент выделенным при сбросе формы методом reset()
         * @param {Boolean} [bSelected = false]  является ли элемент выделенным в данный момент
         * @return {Object|undefined}
         */
        addOption: function(listbox, sText, value, bDefaultSelected, bSelected) {
            if ((!sText && sText !== 0) || (!value && value !== 0)) {
                return undefined;
            }

            var oListbox = (listbox.jquery ? listbox[0] : (typeof listbox === 'string' ? document.getElementById(listbox) : listbox));
            if (typeof oListbox !== 'object') {
                return undefined;
            }

            var oOption = document.createElement("option");
            oOption.appendChild(document.createTextNode(sText));
            oOption.setAttribute("value", value);
            if (bDefaultSelected) {
                oOption.defaultSelected = true;
            } else if (bSelected) {
                oOption.selected = true;
            }
            oListbox.appendChild(oOption);

            return oListbox;
        },
        /**
         * Remove all option from select
         * @public
         * @param {Object|String|jQuery} listbox DOM element
         * @return {Object|undefined}
         */
        removeOptions: function(listbox) {
            var oListbox = (listbox.jquery ? listbox[0] : (typeof listbox === 'string' ? document.getElementById(listbox) : listbox));
            if (typeof oListbox !== 'object') {
                return undefined;
            }

            for (var i = oListbox.options.length - 1; i >= 0; i--) {
                oListbox.remove(i);
            }

            return oListbox;
        },
        /**
         * Generates a storable representation of a form (string JSON)
         * @public
         * @param {String|jQuery|Object} form This is ID, jQuery or DOM Node
         * @return {String}
         */
        serialize: function(form) {
            var sRet = '';
            form = (form.jquery ? form[0] : (typeof form === 'string' ? document.getElementById(form) : form));

            if (form && window.JSON && JSON.stringify) {
                var oData = {
                    name: form.name,
                    id: form.id,
                    method: form.method,
                    action: form.action,
                    enctype: form.enctype,
                    target: form.target,
                    elements: []
                };
                var i = 0,
                    oElem,
                    aElem = oData.elements;
                var nRadioIndex = 0,
                    sRadioName;
                while (oElem = form.elements[i++]) { // eslint-disable-line

                    var sName = oElem.name,
                        sId = oElem.id,
                        sType = oElem.type,
                        sTag = oElem.tagName.toLowerCase(),
                        oObj;
                    if (!(sName || sId))
                        continue;

                    oObj = {
                        name: sName,
                        id: sId,
                        tagName: sTag,
                        type: sType,
                        disabled: oElem.disabled,
                        readOnly: oElem.readOnly
                    };

                    switch (sTag) {
                        case 'fieldset':
                        case 'button':
                            break;
                        case 'input':
                        case 'select':
                        case 'textarea':
                            switch (sType) {
                                case 'button':
                                case 'submit':
                                case 'image':
                                    break;
                                case 'checkbox':
                                    oObj.checked = oElem.checked;
                                    oObj.value = _self.fieldValue(oElem, false);
                                    break;
                                case 'radio':
                                    oObj.checked = oElem.checked;
                                    if (sRadioName !== (sName || sId))
                                        nRadioIndex = 0;
                                    sRadioName = (sName || sId);
                                    oObj.indexRadio = nRadioIndex++;
                                    oObj.value = _self.fieldValue(oElem, false);
                                    break;
                                default:
                                    var val = _self.fieldValue(oElem, false);
                                    if (val && val.constructor === Array) {
                                        oObj.value = [];
                                        for (var j = 0, aTemp = [], nLength = val.length; i < nLength; j++) { // eslint-disable-line
                                            oObj.value.push(val[j]);
                                        }
                                    } else if (val !== null && val !== undefined) {
                                        oObj.value = val;
                                    }
                            }
                    }
                    aElem.push(oObj);
                }
                sRet = JSON.stringify(oData);
            }

            return sRet;
        },
        /**
         * Restore form from a stored representation
         * @public
         * @param {String} sData representation string
         * @return {Void}
         */
        unserialize: function(sData) {
            if (!sData || typeof sData !== 'string') return;

            if (window.JSON && JSON.parse) {
                var oData = JSON.parse(sData);
                if (!oData || !(oData.name || oData.id)) return;

                var oForm = (oData.name ? document.forms[oData.name] : document.getElementById(oData.id));
                if (!oForm) return;

                if (oData.method) oForm.method = oData.method;
                if (oData.action) oForm.action = oData.action;
                if (oData.enctype) oForm.enctype = oData.enctype;
                if (oData.target) oForm.target = oData.target;
                if (oData.elements && oData.elements.length) {
                    var oDataElem,
                        oElem,
                        i = 0;

                    while (oDataElem = oData.elements[i++]) { // eslint-disable-line
                        if (!(oDataElem.name || oDataElem.id)) continue;
                        oElem = (oDataElem.name ? oForm[oDataElem.name] : document.getElementById(oDataElem.id));
                        if (!oElem) continue;

                        var val = oDataElem.value;
                        var oTriggerChangeElem = null;

                        if (val !== undefined && !(oDataElem.type in {'checkbox': true, 'radio': true})) {
                            oTriggerChangeElem = oElem;
                            // set multiselect tag value
                            if (val.constructor === Array && oDataElem.type !== 'select-one') {
                                var oOps = oElem.options,
                                    oOp,
                                    j = 0;

                                while (oOp = oOps[j++]) { // eslint-disable-line
                                    if (_helpers.inArray(oOp.value, val)) { // eslint-disable-line
                                        oOp.selected = true;
                                    }
                                }

                            // set select, input, textarea value
                            } else {
                                oElem.value = val;
                            }
                        }

                        if (oDataElem.disabled !== undefined) oElem.disabled = !!oDataElem.disabled;
                        if (oDataElem.readOnly !== undefined) oElem.readOnly = !!oDataElem.readOnly;
                        if (oDataElem.checked !== undefined) {
                            oTriggerChangeElem = oElem;
                            if (oDataElem.indexRadio !== undefined) {// radio element
                                if (oElem[oDataElem.indexRadio] && oDataElem.checked) { // eslint-disable-line
                                    oElem[oDataElem.indexRadio].checked = true;
                                }
                            } else { // checkbox element
                                oElem.checked = !!oDataElem.checked;
                            }
                        }

                        // trigger change event for element
                        if (oTriggerChangeElem) {
                            if (window.jQuery) {
                                $(oElem).trigger('change');
                            } else {
                                if ('createEvent' in document) { // eslint-disable-line
                                    var evt = document.createEvent('HTMLEvents');
                                    evt.initEvent('change', false, true);
                                    oElem.dispatchEvent(evt);
                                } else {
                                    oElem.fireEvent('onchange');
                                }
                            }
                        }

                    }
                }

            }
        }
    };

    return _self;
})();