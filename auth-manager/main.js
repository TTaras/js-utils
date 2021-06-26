module.exports = (function() {
    var _self;
    var _helpers = RA.repo.helpers;

    var _user = {
        logined: false,
        paid: false,
        paidpro: false,
        rights: 0,
    };

    // mask => номер бита
    var _permissions = {
        nobanner: 0,
        material: 1
    };

    function _can(permission) {
        return !!(permission && (permission in _permissions) && (_user.rights & (1 << _permissions[permission])));
    }

    _self = {
        init: function(userData) {
            _helpers.extend(_user, userData);

            if (_user.logined) {
                if (_user.paid) _user.rights += 1;
                if (_user.paidpro) _user.rights += 2;
            }

            return this;
        },
        can: function(permission) {
            return _can(permission);
        },
        getIsLogined: function() {
            return !!_user.logined;
        },
        getUser: function() {
            return _user;
        },
        getUserRights: function() {
            return _user.rights;
        },
        getPermissions: function() {
            return _permissions;
        },
        getAuthLocation: RA.repo.paywall.getAuthLocation,
        getTariff: RA.repo.paywall.getTariff
    };

    return _self;
})();