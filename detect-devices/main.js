module.exports = (function() {
    var _desktop = document.querySelector('.g-desktop');
    var _desktopSmall = document.querySelector('.g-desktop-small');
    var _tablet = document.querySelector('.g-tablet');
    var _raConfig = RA.config;

    function _checkType() {
        var type;
        var isSmallDesktop = false;
        var isChange = false;

        var oldType = _raConfig.get('device.type');
        var oldSmallDesktop = _raConfig.get('device.smallDesktop');

        if (_isVisible(_desktop)){
            type = 'desktop';
            isSmallDesktop = _isVisible(_desktopSmall);
        } else if (_isVisible(_tablet)) {
            type = 'tablet';
        } else {
            type = 'smartphone';
        }

        if (type !== oldType) {
            isChange = oldType !== undefined;
            _raConfig.set('device.type', type);
        }

        if (isSmallDesktop !== oldSmallDesktop) {
            isChange = oldSmallDesktop !== undefined;
            _raConfig.set('device.smallDesktop', isSmallDesktop);
        }

        if (isChange) {
            RA.eventManager.trigger(RA.eventManager.EVENT_DEVICE_CHANGE, type);
        }
    }

    function _isVisible(elem) {
        return elem && elem.offsetParent !== null;
    }

    if (!_tablet || !_desktop || !_desktopSmall) return;

    window.addEventListener('resize', _checkType, false);
    _checkType();
})();