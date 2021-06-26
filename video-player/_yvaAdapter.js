module.exports = (function() {
    var _helpers = RA.repo.helpers;

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
        th.yva = null;
        th.adViewer = null;
        th.adPlaybackController = null;
        th.volume = 0;
        th.isVideoEnded = false;
    }

    function _loadYVASDK() {
        var th = _loadYVASDK;
        if (th.promise) return th.promise;

        th.promise = new Promise(function(resolve, reject) {
            if (window.ya && window.ya.videoAd) {
                resolve(window.ya.videoAd);
            } else {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = '//an.yandex.ru/system/video-ads-sdk/adsdk.js';
                script.onload = script.onerror = function() {
                    if (window.ya && window.ya.videoAd) {
                        resolve(window.ya.videoAd);
                    } else {
                        reject('Error loading Yandex Video Ads SDK');
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
        _onAdViewerLoaded: function(adViewer) {
            var th = this;

            th.adViewer = adViewer;

            // Создаем контроллер воспроизведения
            th.adPlaybackController = adViewer.createPlaybackController(th.player.video, th.player.videoBox, {
                skipDelay: 5,
                vpaidTimeout: 2000,
                videoTimeout: 2000
            });

            // error
            th.adPlaybackController.subscribe('AdPodError', th._onAdError.bind(th));
            // Начало проигрывания AdPod рекламы.
            th.adPlaybackController.subscribe('AdPodStarted', th._onAdPodStarted.bind(th));
            // Окончание проигрывания AdPod рекламы. AdPodStopped может быть вызван без вызова AdPodStarted
            // (проигрывание AdPod было завершено до старта, на этапе инициализации).
            th.adPlaybackController.subscribe('AdPodStopped', th._onAdPodStopped.bind(th));
            // Один из AdPod был пропущен.
            th.adPlaybackController.subscribe('AdPodSkipped', th._onAdPodStopped.bind(th));
            // AdPlaybackController закончил воспроизведение и освободил ресурсы.
            th.adPlaybackController.subscribe('AdStopped', th.cbs.onAllAdsCompleted);

            try {
                // on ready callback
                _cbs.onReady({
                    adFormat: 'vast'
                });

            } catch (e) {
                th.cbs.onError(e);
            }
        },
        _onAdPodStarted: function() {
            var th = this;

            // remove all video events
            th.player.toggleVideoEvents(false);

            th.cbs.onAdStart({
                duration: th.adPlaybackController.getAdPodDuration(),
                skipTime: th.adPlaybackController.getAdPodTimeToSkip()
            });
        },
        _onAdPodStopped: function() {
            var th = this;

            th.cbs.onAdEnded();
            th.player.toggleVideoEvents(true);

            if (!th.isVideoEnded) {
                setTimeout(function() {
                    th.player.play();
                }, 300);
            }
        },
        _onAdError: function(error) {
            var th = this;

            // Произошла ошибка.
            // Со списком ошибок можно ознакомиться тута https://yandex.ru/dev/video-sdk/doc/dg/sdk-html5/Error-interface-docpage/
            th.cbs.onError({
                message: 'Yandex Video Ads SDK - ' + error.code
            });
        },

        // public api
        init: function() {
            var th = this;

            if (th.yva) {
                return Promise.resolve();
            }

            return _loadYVASDK().then(function(yva) {
                th.yva = yva;
            });
        },
        destroy: function() {
            var th = this;

            if (th.adViewer) {
                th.adViewer.destroy();
                th.adViewer = null;
            }

            if (th.adPlaybackController) {
                th.adPlaybackController.stopAd();
                th.adPlaybackController = null;
            }
        },
        requestAds: function() {
            var th = this;

            if (!th.yva) {
                return;
            }

            th.destroy();

            th.yva
                .loadModule('AdLoader')
                // Создаем экземпляр AdLoader с рекламными параметрами
                .then(function(module) {
                    return module.AdLoader.create({
                        //adFoxParameters: th.player.config.adFoxParameters
                        adFoxParameters: { // sample
                            ownerId: '168627',
                            params: {
                                p1: 'ciptt',
                                p2: 'ekza'
                            }
                        }
                    });
                })
                // Загружаем рекламу
                .then(function(adLoader) {
                    return adLoader.loadAd();
                })
                // Запускаем рекламу
                .then(th._onAdViewerLoaded.bind(th))
                // Если что-то пошло не так
                .catch(th._onAdError.bind(th));
        },
        start: function() {
            var th = this;

            // Запускаем проигрывание рекламы
            if (th.adPlaybackController) {
                th.adPlaybackController.playAd();
            }
        },
        resume: function() {
            var th = this;

            if (th.adPlaybackController) {
                th.adPlaybackController.resumeAd();
            }
        },
        pause: function() {
            var th = this;

            if (th.adPlaybackController) {
                th.adPlaybackController.pauseAd();
            }
        },
        skip: function() {
            var th = this;

            if (!th.adPlaybackController) return;

            if (th.adPlaybackController.getAdSkippableState()) {
                th.adPlaybackController.skipAd();
            } else {
                th.adPlaybackController.stopAd();
            }
        },
        getRemainingTime: function() {
            var th = this;
            var remainingTime = 0;

            if (th.adPlaybackController) {
                th.adPlaybackController.getAdPodRemainingTime();
            }

            return remainingTime;
        },
        contentComplete: function() {
            var th = this;

            th.isVideoEnded = true;
        },
        resize: _noop,
        setVolume: function(value) {
            var th = this;

            th.volume = parseInt(value, 10) || 0;

            // Устанавливает громкость в диапазоне 0-1.
            // Установка громкости доступна только после старта рекламы (метод playAd ()) и до ее окончания (событие AdStopped).
            if (th.adPlaybackController) {
                th.adPlaybackController.setAdVolume(th.volume);
            }
        }
    };

    return Constructor;
})();