'use strict';

const _MODULE = 'repo::intersection-observer';
const _helpers = RA.repo.helpers;
const _defaults = {
    root: null,
    threshold: 0,
    rootMargin: null,
};

/**
 * Create observer instance
 * @param {Function} callback A function which is called when the percentage of the target element is visible crosses a threshold. The callback receives parameter: entry
 * @param {Object} [config]
 *   @param {Object} [config.root] Object which is an ancestor of the intended target, whose bounding rectangle will be considered the viewport.
 *   @param {number} [config.threshold] A threshold of 1.0 means that when 100% of the target is visible within the element specified by the root option
 *   @param {string} [config.rootMargin] A string which specifies a set of offsets to add to the root's bounding_box. The syntax is approximately the same as that for the CSS margin property
 * @constructor
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver
 */
function Constructor(callback, config) {
    const self = this;

    const params = self.params = Object.assign({}, _defaults, config);

    if (params.root === undefined) {
        params.root = self.params.root = null;
    }

    self.cb = callback;
    self.targetList = new window.Set();

    if (!_helpers.is('function', self.cb)) {
        throw new Error(_MODULE + ' - undefined callback');
    }

    if (params.root !== null && !params.root.nodeName) {
        throw new Error(_MODULE + ' - wrong type for root');
    }

    params.threshold = parseFloat(params.threshold);
    if (params.threshold < 0 || params.threshold > 1) {
        throw new Error(_MODULE + ' - threshold is invalid');
    }

    _create.call(self);
}


// Private static
//
function _create() {
    const self = this;
    let viewportBox;

    // all modern browsers
    if (typeof window.IntersectionObserver === 'function') {
        if (self.params.rootMargin === null) {
            if (self.params.root === null) {
                viewportBox = _getProjectViewport();
                self.params.rootMargin = [
                    -viewportBox.top + 'px',
                    -viewportBox.offsetRight + 'px',
                    -viewportBox.offsetBottom + 'px',
                    -viewportBox.left + 'px'
                ].join(' ');
            } else {
                self.params.rootMargin = '0px';
            }
        }

        self.observer = new IntersectionObserver(_onObserve.bind(self), {
            root: self.params.root,
            rootMargin: self.params.rootMargin,
            threshold: self.params.threshold // A threshold of 1.0 means that when 100% of the target is visible within the element specified by the root option
        });

    // use scroll + resize events
    // IE 11- и Sarafi 12.1- и IOS Sarafi 12.3-
    } else {
        const root = self.params.root = self.params.root || window;

        if (self.params.rootMargin === null) {
            if (root === window) {
                viewportBox = _getProjectViewport();
                self.params.rootMargin = {top: viewportBox.top, right: viewportBox.offsetRight, bottom: viewportBox.offsetBottom, left: viewportBox.left};
            } else {
                self.params.rootMargin = {left: 0, top: 0, right: 0, bottom: 0};
            }
        } else {
            const list = self.params.rootMargin.split(' ');
            const top = _helpers.toInt(list[0]);
            const right = list[1] === undefined ? top : _helpers.toInt(list[1]);
            const bottom = list[2] === undefined ? top : _helpers.toInt(list[2]);
            const left = list[3] === undefined ? right : _helpers.toInt(list[3]);
            self.params.rootMargin = {top, right, bottom, left};
        }

        if (!self.scrollFunc) {
            const cb = _wndScroll.bind(self);
            self.scrollFunc = _helpers.debounce ? _helpers.debounce(cb, 300) : cb;
        }

        root.addEventListener('resize', self.scrollFunc, false);
        root.addEventListener('scroll', self.scrollFunc, false);
    }
}
function _onObserve(entries) {
    const self = this;

    entries.forEach(function(entry) {
        self.cb.call(self, entry, self);
    });
}
function _wndScroll() {
    const self = this;

    self.targetList.forEach(function(target) {
        const res = _isVisible.call(self, target);

        const isIntersecting = !!target.isIntersecting;
        const isIntersectingNow = !!(res.intersectionRatio && (res.intersectionRatio >= self.params.threshold));
        res.isIntersecting = isIntersectingNow;
        target.isIntersecting = isIntersectingNow;

        let isChangeState = false;

        if (isIntersectingNow) {
            if (isIntersecting === false) {
                isChangeState = true;
            }
        } else {
            if (isIntersecting === true) {
                isChangeState = true;
            }
        }

        if (isChangeState) {
            self.cb.call(self, res, self);
            target.isIntersecting = null;
        }
    });
}
function _isVisible(target) {
    const self = this;
    const root = self.params.root;
    const rootMargin = self.params.rootMargin;
    const ret = {target: target, isVisible: false};

    if (document.visibilityState !== 'visible') {
        ret.intersectionRatio = 0;
        return ret;
    }

    // check target is visible
    // if (!target || target.offsetParent === null) return false; // быстрый вариант, но не работает в старых IE и для position=fixed
    //
    if (!target || !(target.offsetWidth || target.offsetHeight || target.getClientRects().length)) { // jQuery вариант
        ret.intersectionRatio = 0;
        return ret;
    }

    // get elem bounding rect
    //
    const box = target.getBoundingClientRect();
    ret.boundingClientRect = box;

    // get viewport sizes
    //
    const viewportBox = root.getBoundingClientRect && root.getBoundingClientRect() || {
        top: 0,
        left: 0,
        right: document.documentElement.clientWidth,
        bottom: document.documentElement.clientHeight
    };
    viewportBox.left -= rootMargin.left;
    viewportBox.top -= rootMargin.top;
    viewportBox.right += rootMargin.right;
    viewportBox.bottom += rootMargin.bottom;
    ret.rootBounds = viewportBox;
    if (viewportBox.right === viewportBox.left || viewportBox.bottom === viewportBox.top) {
        ret.intersectionRatio = 0;
        return ret;
    }

    // get target metrics
    //
    const targetWidth = box.right - box.left;
    const targetHeight = box.bottom - box.top;

    //  position
    //
    const isOnViewportXLeft = box.left >= viewportBox.left && box.left < viewportBox.right;
    const isOnViewportXRight = box.right > viewportBox.left && box.right < viewportBox.right;
    const isOnViewportYTop = box.top >= viewportBox.top && box.top < viewportBox.bottom;
    const isOnViewportYBottom = box.bottom > viewportBox.top && box.bottom < viewportBox.bottom;

    const isOnViewportX = isOnViewportXLeft || isOnViewportXRight;
    const isOnViewportY = isOnViewportYTop || isOnViewportYBottom;
    const isOnVieport = isOnViewportX && isOnViewportY;

    // 0% view
    //
    if (!isOnVieport) {
        ret.intersectionRatio = 0;
        return ret;
    }

    // 100% view
    //
    if (isOnViewportXLeft && isOnViewportXRight && isOnViewportYTop && isOnViewportYBottom) {
        ret.intersectionRatio = 1;
        ret.isVisible = !!(targetWidth && targetHeight);
        return ret;
    }

    // ширина видимой части
    //
    let w;
    if (isOnViewportXLeft && isOnViewportXRight) {
        w = targetWidth;
    } else if (isOnViewportXLeft) {
        w = viewportBox.right - box.left;
    } else if (isOnViewportXRight) {
        w = box.right - viewportBox.left;
    }

    // высота видимой части
    //
    let h;
    if (isOnViewportYTop && isOnViewportYBottom) {
        h = targetHeight;
    } else if (isOnViewportYTop) {
        h = viewportBox.bottom - box.top;
    } else if (isOnViewportYBottom) {
        h = box.bottom - viewportBox.top;
    }

    // относительная видимая часть
    //
    ret.intersectionRatio = ((w * h) / (targetWidth * targetHeight)).toFixed(2);
    ret.isVisible = !!(targetWidth && targetHeight);

    return ret;
}
function _getProjectViewport() {
    return (RA.repo.getProjectViewport && RA.repo.getProjectViewport()) || {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        offsetRight: 0,
        offsetBottom: 0
    };
}


// Public api
//
Object.assign(Constructor.prototype, {
    /**
     * Observe elem
     * @public
     * @param {Object} target
     * @return {void}
     */
    observe: function(target) {
        const self = this;

        if (!target || !target.nodeName) {
            throw new Error(_MODULE + ' - incorrect target for observe');
        }

        if (self.observer) {
            self.observer.observe(target);
        } else if (self.scrollFunc) {
            // вызываем ручками - имитируем нативный observer
            setTimeout(self.scrollFunc, 300);
        }

        self.targetList.add(target);
    },
    /**
     * Unobserve elem
     * @public
     * @param {Object} target
     * @return {void}
     */
    unobserve: function(target) {
        const self = this;

        if (!target || !target.nodeName) {
            throw new Error(_MODULE + ' - incorrect target for unobserve');
        }

        if (self.observer) {
            self.observer.unobserve(target);
        }

        self.targetList.delete(target);
    },
    /**
     * Stops watching all of its target elements for visibility changes
     * + empty instance
     * @public
     * @return {void}
     */
    disconnect: function() {
        let self = this;

        if (self.observer) {
            self.observer.disconnect();
            self.observer = null;
        } else {
            self.params.root.removeEventListener('resize', self.scrollFunc);
            self.params.root.removeEventListener('scroll', self.scrollFunc);
        }

        self.targetList = null;
        self = null;
    },
    /**
     * Get all targets
     * @public
     * @return {Array}
     */
    getTargetList: function() {
        return Array.from(this.targetList.values());
    }
});

module.exports = Constructor;