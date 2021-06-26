'use strict';

const _IntersectionObserver = RA.repo.IntersectionObserver;
const _validAttributes = ['data-alt', 'data-src', 'data-srcset', 'data-background-image', 'data-toggle-class'];
const _defaultConfig = {
    rootMargin: '0px',
    threshold: 0,
    enableAutoReload: false,
    load(elem) {
        const nodeName = elem.nodeName.toLowerCase();

        if (nodeName === 'picture') {
            let img = elem.querySelector('img');
            let append = false;

            if (img === null) {
                img = document.createElement('img');
                append = true;
            }

            const alt = elem.dataset.alt;
            if (alt) {
                img.alt = alt;
            }

            if (append) {
                elem.append(img);
            }
        }

        if (nodeName === 'video') {
            if (!elem.dataset.src && elem.children) {
                const childs = elem.children;
                for (let child of childs) {
                    const src = child.dataset.src;
                    if (src) {
                        child.src = src;
                    }
                }

                elem.load();
            }

            const poster = elem.dataset.poster;
            if (poster) {
                elem.setAttribute('poster', poster);
            }
        }

        const src = elem.dataset.src;
        if (src) {
            elem.src = src;
        }

        const srcset = elem.dataset.srcset;
        if (srcset) {
            elem.setAttribute('srcset', srcset);
        }

        const backgroundImageDelimiter = elem.dataset.backgroundDelimiter || ',';
        const backgroundImage = elem.dataset.backgroundImage;
        const backgroundImageSet = elem.dataset.backgroundImageSet;
        if (backgroundImage) {
            elem.style.backgroundImage = `url('${backgroundImage.split(backgroundImageDelimiter).join('\'),url(\'')}')`;
        } else if (backgroundImageSet) {
            const imageSetLinks = backgroundImageSet.split(backgroundImageDelimiter);
            let firstUrlLink = (imageSetLinks[0].substr(0, imageSetLinks[0].indexOf(' ')) || imageSetLinks[0]); // Substring before ... 1x
            firstUrlLink = firstUrlLink.indexOf('url(') === -1 ? `url(${firstUrlLink})` : firstUrlLink;
            if (imageSetLinks.length === 1) {
                elem.style.backgroundImage = firstUrlLink;
            } else {
                elem.setAttribute('style', (elem.getAttribute('style') || '') + `background-image: ${firstUrlLink}; background-image: -webkit-image-set(${imageSetLinks}); background-image: image-set(${imageSetLinks})`);
            }
        }

        const toggleClass = elem.dataset.toggleClass;
        if (toggleClass) {
            elem.classList.toggle(toggleClass);
        }
    },
    loaded: null,
};

const _markAsLoaded = element => element.dataset.loaded = true;

const _getIsLoaded = element => !!element.dataset.loaded;

const _onIntersection = (load, loaded) => (entry, observer) => {
    if (entry.intersectionRatio > 0 || entry.isIntersecting) {
        observer.unobserve(entry.target);

        if (!_getIsLoaded(entry.target)) {
            load(entry.target);

            _markAsLoaded(entry.target);

            if (loaded) {
                loaded(entry.target);
            }
        }
    }
}

const _onMutation = load => entries => {
    entries.forEach(entry => {
        if (_getIsLoaded(entry.target) && entry.type === 'attributes' && _validAttributes.includes(entry.attributeName)) {
            load(entry.target);
        }
    });
};

const _getElements = (selector, root = document) => {
    if (selector instanceof Element) {
        return [selector];
    }

    if (selector instanceof NodeList) {
        return selector;
    }

    return root.querySelectorAll(selector);
}

/**
 * Создание экземпляра наблюдателя
 * @see https://github.com/ApoorvSaxena/lozad.js/blob/master/src/lozad.js
 * @param {*} [selector='js-lozad'] Селектор поиска внутри options.root | Element | NodeList
 * @param {object} [options]
 *   @param {object} [options.root] Контейнер для поиска элементов и отслеживания их видимости
 *   @param {string} [options.rootMargin='0px'] границы отслеживания из видимости (см IntersectionObserver)
 *   @param {number} [options.threshold=0] порог видимости (см IntersectionObserver)
 *   @param {boolean} [options.enableAutoReload=false] перезагрузка элемента при обновлении его отслеживаемых атрибутов
 *   @param {function} [options.load] функция загрузки при появлении в зоне видимости (аргументом передается сам элемент)
 *   @param {function} [options.loaded=null] коллбэк при появлении в зоне видимости (аргументом передается сам элемент)
 * @returns {{observer, mutationObserver, triggerLoad(*=): void, observe(): void}}
 * @example
 *
 * In HTML, add an identifier to the element (default selector identified is lozad class):
 *
 *   <img class="js-lozad" data-src="image.png">
 *
 * All you need to do now is just instantiate Lozad as follows:
 *
 *   const observer = lozad(); // lazy loads elements with default selector as '.js-lozad'
 *   observer.observe();
 *
 * or with a DOM Element reference:
 *
 *   const el = document.querySelector('img');
 *   const observer = lozad(el); // passing a `NodeList` (e.g. `document.querySelectorAll()`) is also valid
 *   observer.observe();
 *
 * or with custom options:
 *
 *   const observer = lozad('.lozad', {
 *     rootMargin: '10px 0px', // syntax similar to that of CSS Margin
 *     threshold: 0.1, // ratio of element convergence
 *     enableAutoReload: true // it will reload the new image when validating attributes changes
 *   });
 *   observer.observe();
 *
 * or if you want to give custom function definition to load element:
 *
 *   lozad('.lozad', {
 *     load: function(el) {
 *         console.log('loading element');
 *         // Custom implementation to load an element
 *         // e.g. el.src = el.dataset.src;
 *     }
 *   });
 *
 *
 * If you would like to extend the loaded state of elements, you can add the loaded option:
 *
 *   Note: The "data-loaded"="true" attribute is used by lozad to determine if an element has been previously loaded.
 *
 *   lozad('.lozad', {
 *     loaded: function(el) {
 *         // Custom implementation on a loaded element
 *     }
 *   });
 *
 *
 * If you want to lazy load dynamically added elements:
 *
 *   const observer = lozad();
 *   observer.observe();
 *   // ... code to dynamically add elements
 *   observer.observe(); // observes newly added elements as well
 *
 *
 * for use with responsive images
 *
 *   <!-- responsive image example -->
 *   <img class="js-lozad" data-src="image.png" data-srcset="image.png 1000w, image-2x.png 2000w">
 *   for use with background images
 *
 *   <!-- background image example -->
 *   <div class="js-lozad" data-background-image="image.png"></div>
 *
 *
 * for use with multiple background images
 *
 *   <!-- multiple background image example -->
 *   <div class="js-lozad" data-background-image="path/to/first/image,path/to/second/image,path/to/third/image"></div>
 *
 *
 * for use with responsive background images (image-set)
 *
 *   <!-- responsive background image-set example -->
 *   <div class="js-lozad" data-background-image-set="url('photo.jpg') 1x, url('photo@2x.jpg') 2x">
 *   </div>
 *
 *
 * If you want to load the images before they appear:
 *
 *   const observer = lozad();
 *   observer.observe();
 *   const coolImage = document.querySelector('.image-to-load-first');
 *   // ... trigger the load of a image before it appears on the viewport
 *   observer.triggerLoad(coolImage);
 *
 *
 * Example with picture tag
 * If you want to use image placeholder (like low quality image placeholder), you can set a temporary img tag inside your picture tag.
 * It will be removed when lozad loads the picture element.
 *
 *   <picture class="js-lozad" style="display: block; min-height: 1rem" data-iesrc="images/thumbs/04.jpg" data-alt="">
 *     <source srcset="images/thumbs/04.jpg" media="(min-width: 1280px)">
 *     <source srcset="images/thumbs/05.jpg" media="(min-width: 980px)">
 *     <source srcset="images/thumbs/06.jpg" media="(min-width: 320px)">
 *     <!-- you can define a low quality image placeholder that will be removed when the picture is loaded -->
 *     <img src="data:image/jpeg;base64,/some_lqip_in_base_64==">
 *   </picture>
 *
 *
 * Example with video
 *
 *   <video class="js-lozad" data-poster="images/backgrounds/video-poster.jpeg">
 *     <source data-src="video/mov_bbb.mp4" type="video/mp4">
 *     <source data-src="video/mov_bbb.ogg" type="video/ogg">
 *   </video>
 *
 *
 * Example with iframe
 *
 *   <iframe data-src="embed.html" class="js-lozad"></iframe>
 *
 *
 * Example toggling class
 *
 *   <div data-toggle-class="active" class="lozad">
 *     <!-- content -->
 *   </div>
 *
 */
const _greateInstance = (selector = '.js-lozad', options = {}) => {
    const {root, rootMargin, threshold, enableAutoReload, load, loaded} = Object.assign({}, _defaultConfig, options);

    const observer = new _IntersectionObserver(_onIntersection(load, loaded), {root, rootMargin, threshold});

    let mutationObserver;
    if (typeof window.MutationObserver === 'function' && enableAutoReload) {
        mutationObserver = new MutationObserver(_onMutation(load, loaded));
    }

    // Public API
    //
    return {
        observe() {
            const elements = _getElements(selector, root);

            for (let elem of elements) {
                if (_getIsLoaded(elem)) continue;

                observer.observe(elem);

                if (mutationObserver && enableAutoReload) {
                    mutationObserver.observe(elem, {subtree: true, attributes: true, attributeFilter: _validAttributes});
                }
            }
        },
        triggerLoad(elem) {
            if (_getIsLoaded(elem)) return;

            load(elem);

            _markAsLoaded(elem);

            if (loaded) {
                loaded(elem);
            }
        },
        observer,
        mutationObserver
    }
}

// Cached in the fn module
if (!RA.fn.lozad) {
    RA.fn.lozad = _greateInstance;
}

module.exports = _greateInstance;