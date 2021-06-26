module.exports = (function() {
    var _helpers = RA.repo.helpers;
    var _VIDEO_FORMATS_ADS = {'16x9': [640, 360], '4x3': [640, 480]};

    var _noop = function() {};
    var _cbs = {
        onReady: _noop,
        onError: _noop,
        //
        onVideoEnded: _noop,
        onAdRequest: _noop,
        onAdStart: _noop,
        onAdPause: _noop,
        onAdResume: _noop,
        onAdEnded: _noop,
        onAllAdsCompleted: _noop
    };

    function Constructor(player, cbs) {
        var th = this;

        th.player = player;
        th.cbs = _helpers.extend(_cbs, cbs);

        th.isInit = false;
        th.ima = null;
        th.adsManager = null;
        th.adsLoader = null;
        th.adDisplay = null;
        th.volume = 0;
        th.isVideoEnded = false;
    }

    function _loadImaSDK() {
        var th = _loadImaSDK;
        if (th.promise) return th.promise;

        th.promise = new Promise(function(resolve, reject) {
            if (window.google && window.google.ima) {
                resolve(window.google.ima);
            } else {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
                script.onload = script.onerror = function() {
                    if (window.google && window.google.ima) {
                        resolve(window.google.ima);
                    } else {
                        reject('Error loading IMA SDK for HTML5');
                    }
                    th.promise = null;
                };
                document.head.appendChild(script);
            }
        });

        return th.promise;
    }

    Constructor.prototype = {
        // private
        _onAdsManagerLoaded: function(adsManagerLoadedEvent) {
            var th = this;
            var ima = th.ima;

            var adsRenderingSettings = new th.ima.AdsRenderingSettings();
            // Hide countdown default element
            adsRenderingSettings.uiElements = [];

            // Get the ads manager.
            // videoContent should be set to the content video element.
            var adsManager = th.adsManager = adsManagerLoadedEvent.getAdsManager(th.player.video, adsRenderingSettings);

            // Add listeners to the required events.
            var onAdEventHandler = th._onAdEvent.bind(th);
            var onAdErrorHandler = th._onAdError.bind(th);
            adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, onAdErrorHandler);
            adsManager.addEventListener(ima.AdEvent.Type.STARTED, onAdEventHandler);
            adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, onAdEventHandler);
            adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, onAdEventHandler);
            adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEventHandler);
            adsManager.addEventListener(ima.AdEvent.Type.PAUSED, onAdEventHandler);
            adsManager.addEventListener(ima.AdEvent.Type.RESUMED, onAdEventHandler);
            adsManager.addEventListener(ima.AdEvent.Type.AD_PROGRESS, onAdEventHandler);

            try {
                var size = th.player.getVideoSize();
                // Initialize the ads manager. Ad rules playlist will start at this time.
                adsManager.init(size.w, size.h, ima.ViewMode.NORMAL);

                // get ad format
                var adPoints = adsManager.getCuePoints();

                // on ready callback
                _cbs.onReady({
                    adFormat: adPoints && adPoints.length ? 'vmap' : 'vast'
                });
            } catch (e) {
                // An error may be thrown if there was a problem with the VAST response.
                th.cbs.onError(e);
            }
        },
        _onAdEvent: function(adEvent) {
            var th = this;
            var ima = th.ima;

            // Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
            // don't have ad object associated.
            var ad = adEvent.getAd();

            switch (adEvent.type) {
                case ima.AdEvent.Type.STARTED:
                    // trigger for every adPod
                    // это оверлеи разные - мы их не показываем
                    if (!ad.isLinear()) {
                        th.adsManager.stop();
                        th.player.play();
                    }
                    break;

                case ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED:
                    // trigger for every adPod
                    th.player.adContainer.style.display = 'block';
                    _cbs.onAdStart({
                        duration: ad.getDuration(),
                        skipTime: ad.getSkipTimeOffset() // в настройках vast указано пропускать рекламу через N сек
                    });
                    th.player.pause();
                    break;

                case ima.AdEvent.Type.CONTENT_RESUME_REQUESTED:
                    // trigger for every adPod
                    th.player.adContainer.style.display = 'none';
                    _cbs.onAdEnded();
                    if (!th.isVideoEnded) {
                        th.player.play();
                    }
                    break;

                case ima.AdEvent.Type.ALL_ADS_COMPLETED:
                    _cbs.onAllAdsCompleted();
                    break;

                case ima.AdEvent.Type.PAUSED:
                    _cbs.onAdPause();
                    break;

                case ima.AdEvent.Type.RESUMED:
                    _cbs.onAdResume();
                    break;

                case ima.AdEvent.Type.AD_PROGRESS:
                    var remainingTime = _helpers.toInt(th.adsManager.getRemainingTime(), true);
                    _cbs.onAdProgress(remainingTime);
                    break;
            }
        },
        _onAdError: function(adErrorEvent) {
            _cbs.onError({
                message: adErrorEvent.getError().getMessage()
            });
        },

        // public api
        init: function() {
            var th = this;

            if (th.ima) {
                return Promise.resolve();
            }

            return _loadImaSDK().then(function(ima) {
                th.ima = ima;
            });
        },
        destroy: function() {
            var th = this;

            th.isInit = false;
            if (th.adsLoader) th.adsLoader.destroy();
            if (th.adsManager) th.adsManager.destroy();

            th.ima = th.adsLoader = th.adsManager = th.adDisplay = null;
        },
        requestAds: function(isAutoplayAllowed, isAutoplayRequiresMuted) {
            var th = this;

            if (!th.ima) {
                return;
            }

            if (!th.isInit) {
                th.isInit = true;

                // set russian locale
                th.ima.settings.setLocale('ru');

                // To enable VPAID 2 JavaScript support
                th.ima.settings.setVpaidMode(th.ima.ImaSdkSettings.VpaidMode.INSECURE);

                // https://developers.google.com/interactive-media-ads/docs/sdks/html5/skippable-ads
                th.ima.settings.setDisableCustomPlaybackForIOS10Plus(true);

                // Create the ad display container.
                th.adDisplay = new th.ima.AdDisplayContainer(th.player.adContainer, th.player.video);

                // Initialize the container. Must be done via a user action on mobile devices.
                th.adDisplay.initialize();

                // Create ads loader
                th.adsLoader = new th.ima.AdsLoader(th.adDisplay);

                // Listen and respond to ads loaded and error events.
                th.adsLoader.addEventListener(th.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, th._onAdsManagerLoaded.bind(th));
                th.adsLoader.addEventListener(th.ima.AdErrorEvent.Type.AD_ERROR, th._onAdError.bind(th));

            } else {
                if (th.adsManager) th.adsManager.destroy();
                if (th.adsLoader) th.adsLoader.contentComplete();
            }

            // Request video ads.
            var adsRequest = new th.ima.AdsRequest();

            if (th.player.config.adXMLResponse) {
                adsRequest.adsResponse = th.player.config.adXMLResponse;
            } else {
                adsRequest.adTagUrl = th.player.config.adTagUrl;
            }

            // Specify the linear and nonlinear slot sizes. This helps the SDK to
            // select the correct creative if multiple are returned.
            adsRequest.linearAdSlotWidth = _VIDEO_FORMATS_ADS['16x9'][0];
            adsRequest.linearAdSlotHeight = _VIDEO_FORMATS_ADS['16x9'][1];
            adsRequest.nonLinearAdSlotWidth = 640;
            adsRequest.nonLinearAdSlotHeight = 150;

            adsRequest.setAdWillAutoPlay(isAutoplayAllowed);
            adsRequest.setAdWillPlayMuted(isAutoplayRequiresMuted);
            th.adsLoader.requestAds(adsRequest);
            th.cbs.onAdRequest();
        },
        start: function() {
            var th = this;

            // Запускаем проигрывание рекламы
            if (th.adsManager) {
                th.adsManager.start();
            }
        },
        resume: function() {
            var th = this;

            if (th.adsManager) {
                th.adsManager.resume();
            }
        },
        pause: function() {
            var th = this;

            if (th.adsManager) {
                th.adsManager.pause();
            }
        },
        skip: function() {
            var th = this;

            if (!th.adsManager) return;

            if (th.adsManager.getAdSkippableState()) {
                th.adsManager.skip();
            } else {
                th.adsManager.stop();
            }
        },
        getRemainingTime: function() {
            var th = this;
            var remainingTime = 0;

            if (th.adsManager) {
                remainingTime = _helpers.toInt(th.adsManager.getRemainingTime(), true)
            }

            return remainingTime;
        },
        contentComplete: function() {
            var th = this;

            th.isVideoEnded = true;

            if (th.adsLoader) {
                th.adsLoader.contentComplete();
            }
        },
        resize: function(size) {
            var th = this;

            if (th.adsManager) {
                th.adsManager.resize(size.w, size.h, th.ima.ViewMode.NORMAL);
            }
        },
        setVolume: function(value) {
            var th = this;

            th.volume = parseInt(value, 10) || 0;

            if (th.adsManager) {
                th.adsManager.setVolume(value);
            }
        }
    };

    return Constructor;
})();