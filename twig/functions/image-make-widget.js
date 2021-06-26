// TODO: перенести фильтры и функции твига в repo

const _PLACEHOLDERS = {
    'default': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20{{ width }}%20{{ height }}%22%20width%3D%22{{ width }}%22%20height%3D%22{{ height }}%22%3E%3Crect%20width%3D%22{{ width }}%22%20height%3D%22{{ height }}%22%20fill%3D%22%23e6e6e6%22%3E%3C%2Frect%3E%3C%2Fsvg%3E'
};

const _DEFAULT_PROPERTIES = {
    'decoding': 'async'
};

// TODO: после внедрения RBCADT-1762 добавить в сборку адекватный путь
const _template = require('./../../../../../../widgets/views/image-make.html');

const _picResize = require('vendor/twig/filters/pic-resize');
const _helpers = RA.helpers;

let _properties;


function _setWidthAndHeight() {
    const ratio = _properties.ratio && parseFloat(_properties.ratio) || null;
    let w = _properties.width && parseInt(_properties.width, 10) || null;
    let h = _properties.height && parseInt(_properties.height, 10) || null;

    if (ratio) {
        if (w && !h) {
            h = Math.round(w / ratio);
        } else if (h && !w) {
            w = Math.round(h * ratio);
        }
    }

    _properties.ratio = ratio;
    _properties.width = w;
    _properties.height = h;
}

function _setCssClass() {
    let result = !_properties.cssDefaultReset ? 'g-image' : '';

    if (_properties.cssclass) {
        result += ' ' + _properties.cssclass;
    } else if (_properties.cssclass === false) {
        result = null;
    }

    _properties.cssclass = result;
}

function _getResize(url, resize) {
    if (resize && resize.w && resize.h) {
        return _picResize(url, [resize.w, resize.h, !!resize.needCrop]);
    }

    return url;
}

function _getUrl(img) {
    if (typeof img === 'object') {
        if (typeof img.url !== 'string') {
            return null;
        }

        if (img.resize) {
            return _getResize(img.url, img.resize);
        } else {
            return img.url;
        }

    } else if (typeof img === 'string') {
        return img;
    }

    return null;
}

function _getSrcsetByImages(images) {
    let set = [];

    if (Array.isArray(images)) {
        for (let image of images) {
            let item = _getUrl(image);
            let descriptors = [];

            if (_helpers.isEmpty(item)) continue;

            if (image.w) {
                const w = parseInt(image.w, 10);
                if (w) {
                    descriptors.push(w + 'w');
                }
            } else if (image.x) {
                const x = parseFloat(image.x);
                if (x) {
                    descriptors.push(x + 'x');
                }
            }

            if (descriptors.length) {
                item += ' ' + descriptors.join(' ');
            }

            set.push(item);
        }
    } else if (typeof images === 'string') {
        set.push(images);
    }

    return set;
}

function _getSrcsetByPlaceholder(placeholder) {
    let set = [];

    if (typeof placeholder === 'object') {
        const type = placeholder.type || 'default';
        const ratio = placeholder.ratio && parseFloat(placeholder.ratio);
        let w = placeholder.width && parseInt(placeholder.width, 10);
        let h = placeholder.height && parseInt(placeholder.height, 10);

        if (ratio) {
            if (w && !h) {
                h = Math.round(w / ratio);
            } else if (h && !w) {
                w = Math.round(h * ratio);
            }
        }

        if (w && h) {
            const item = _getPlaceholder(type, w, h);
            if (item) {
                set.push(item);
            }
        }
    } else if (typeof placeholder === 'string') {
        set.push(placeholder);
    }

    return set;
}

function _getPlaceholder(type, w = 0, h = 0) {
    let placeholder = type && _PLACEHOLDERS[type] || _PLACEHOLDERS.default;

    if (placeholder) {
        if (placeholder.replaceAll) {
            placeholder = placeholder.replaceAll('{{ width }}', w);
            placeholder = placeholder.replaceAll('{{ height }}', h);
        } else {
            placeholder = placeholder.replace(/{{ width }}/g, w);
            placeholder = placeholder.replace(/{{ height }}/g, h);
        }
    }

    return placeholder;
}

function _getSrc() {
    if (_properties.src) {
        return _getUrl(_properties.src);
    }

    return null;
}

function _getSrcset() {
    let set;

    if (_properties.srcset) {
        if (_properties.srcset.img) {
            set = _getSrcsetByImages(_properties.srcset.img);
        } else if (_properties.srcset.placeholder) {
            set = _getSrcsetByPlaceholder(_properties.srcset.placeholder);
        } else if (typeof _properties.srcset === 'string') {
            set = [_properties.srcset];
        }
    }

    if (set && set.length) {
        return set.join(',')
    }

    return null;
}

function _getDataSrcset() {
    let set;

    if (_properties['data-srcset']) {
        if (Array.isArray(_properties['data-srcset'])) {
            set = _getSrcsetByImages(_properties['data-srcset']);
        } else if (typeof _properties['data-srcset'] === 'string') {
            set = [_properties['data-srcset']];
        }
    }

    if (set && set.length) {
        return set.join(',');
    }

    return null;
}

function _getSizes() {
    let set;

    if (_properties.sizes) {
        if (Array.isArray(_properties.sizes)) {
            set = [];
            for (let size of _properties.sizes) {
                if (typeof size === 'string') {
                    set.push(size);
                }
            }
        } else if (typeof _properties.sizes === 'string') {
            set = [_properties.sizes];
        }
    }

    if (set && set.length) {
        return set.join(',');
    }

    return null;
}


/**
 * TwigJS function - create image
 * ...
 * можно передавать произвольные параметры
 * главное обрабатывать их во вьюхе
 * ##################################################
 * @param {object} properties
 *   @param {string|object} properties.src параметры src в виде объекта или сформированной строки
 *     @param {string} properties.src.url адрес ресурса картинки
 *     @param {object} [properties.src.resize] параметры ресайза
 *       @param {string|number} properties.src.resize.w
 *       @param {string|number} properties.src.resize.h
 *       @param {boolean} [properties.src.resize.needCrop=false]
 *   @param {string|object} properties.srcset параметры srcset в виде объекта или сформированной строки ('url1 1200w, url2 590w')
 *     @param {string|array<object|string>} properties.srcset.img ресурсы картинки в виде массива объектов или сформированной строки ('url1 1200w, url2 590w')
 *       @param {string} properties.srcset.img[] полностью сформированный адрес ресурса картинки
 *       @param {string} properties.srcset.img[].url адрес ресурса картинки
 *       @param {object} [properties.srcset.img[].resize] параметры ресайза
 *         @param {string|number} properties.srcset.img[].resize.w
 *         @param {string|number} properties.srcset.img[].resize.h
 *         @param {boolean} [properties.srcset.img[].resize.needCrop=false]
 *       @param {string|number} [properties.srcset.img[].w] ширина картинки в px
 *       @param {string|number} [properties.srcset.img[].x] плотности пикселей целевого устройства
 *     @param {string|object} [properties.srcset.placeholder] параметры плейсхолдера при использовании кастомной ленивой загрузки в виде объекта или сформированной строки
 *       @param {string} [properties.srcset.placeholder.type=default] вид
 *       @param {string|number} [properties.srcset.placeholder.width] ширина в px
 *       @param {string|number} [properties.srcset.placeholder.height] высота в px
 *       @param {string|number} [properties.srcset.placeholder.ratio] соотношение сторон, w/h
 *   @param {string|array<object|string>} [properties.data-srcset] ресурсы картинки при использовании кастомной ленивой загрузки в виде массива объектов или сформированной строки
 *     @param {string} properties.data-srcset[] полностью сформированный адрес ресурса картинки
 *     @param {string} properties.data-srcset[].url адрес ресурса картинки
 *     @param {object} [properties.data-srcset[].resize] параметры ресайза
 *       @param {string|number} properties.data-srcset[].resize.w
 *       @param {string|number} properties.data-srcset[].resize.h
 *       @param {boolean} [properties.data-srcset[].resize.needCrop=false]
 *     @param {string|number} [properties.data-srcset[].w] ширина картинки в px
 *     @param {string|number} [properties.data-srcset[].x] плотности пикселей целевого устройства
 *   @param {string|array<string>} [properties.sizes] определяет перечень медиавыражений (например, ширину экрана) и указывает предпочтительную ширину изображения, когда определённое медиавыражение истинно
 *     @param {string} [properties.sizes[]] Медиа-условие + ширина слота (в оригинале "width of the slot"), занимаемую изображением, когда медиа-условие истинно
 *   @param {object} [properties.jstemplate=_template] твиг-шаблон для рендера картинки (метод render), по-умолчания используется встроенная _template
 *   @param {string} [properties.decoding=async] нативный параметр декодирования для картинки
 *   @param {string|boolean} [properties.cssclass] css класс (g-image будет добавляться автоматом всегда, но если указать false, то класс не ставиться)
 *   @param {string} [properties.style] inline css styles
 *   @param {string|number} [properties.width] ширина картинки в px
 *   @param {string|number} [properties.height] высота картинки в px
 *   @param {string|number} [properties.ratio] соотношение сторон, w/h
 *   @param {string} [properties.alt] описание
 *   @param {boolean} [properties.lazyload=false] добавляет нативный loading="lazy"
 * @returns {string} image html
 * @sample
 *
 * Sample1
 * -----------------------------------------
 *   {{ image_make_widget({
 *     'src': 'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *     'width': 1180,
 *     'height': 730,
 *     'style': 'max-width: 100%; height: auto',
 *     'alt': 'Путин согласился объявить выходные с 1 по 10 мая',
 *   }) | raw }}
 *
 *
 * Sample2
 * -----------------------------------------
 *   {{ image_make_widget({
 *     'src': {
 *       'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *       'resize': {'w': 1200, 'h': 'H', 'needCrop': false}
 *     },
 *     'srcset': {
 *       {
 *         'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *         'resize': {'w': 1200, 'h': 'H'},
 *         'w': '1200'
 *       },
 *       {
 *         'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *         'resize': {'w': 590, 'h': 'H'},
 *         'w': '590'
 *       },
 *       {
 *         'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *         'resize': {'w': 320, 'h': 'H'},
 *         'w': '320'
 *       }
 *     },
 *     'width': 1180,
 *     'height': 730,
 *     'cssclass': 'my-class',
 *     'alt': 'Путин согласился объявить выходные с 1 по 10 мая'
 *   }) | raw }}
 *
 *
 * Sample3
 * -----------------------------------------
 *   {{ image_make_widget({
 *     'src': {
 *       'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *       'resize': {'w': 1200, 'h': 'H', 'needCrop': false}
 *     },
 *     'srcset': {
 *       'placeholder': {
 *           'type': 'default',
 *           'w': 590,
 *           'h': 320
 *       }
 *     },
 *     'data-srcset': [
 *       {
 *         'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *         'resize': {'w': 1200, 'h': 'H'},
 *         'w': '1200'
 *       },
 *       {
 *         'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *         'resize': {'w': 590, 'h': 'H'},
 *         'w': '590'
 *       },
 *       {
 *         'url': 'https://s0.test.rbk.ru/v6_top_pics/media/img/5/31/556085552448315.jpg',
 *         'resize': {'w': 320, 'h': 'H'},
 *         'w': '320'
 *       }
 *     ],
 *     'width': 1180,
 *     'ratio': 1.616,
 *     'cssclass': 'my-class',
 *     'style': 'max-width: 100%; height: auto',
 *     'alt': 'Путин согласился объявить выходные с 1 по 10 мая'
 *   }) | raw }}
 */
module.exports = function(properties) {
    _properties = Object.assign({}, _DEFAULT_PROPERTIES, properties);

    _properties.src = _getSrc();
    _properties.srcset = _getSrcset();
    _properties.datasrcset = _getDataSrcset();
    _properties.sizes = _getSizes();
    _setCssClass();
    _setWidthAndHeight();

    if (_helpers.isEmpty(_properties.src)) {
        return '';
    }

    const template = _properties.jstemplate && typeof _properties.jstemplate.render === 'function'
        ? _properties.jstemplate
        : _template;

    return template.render(_properties);
}