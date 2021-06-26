module.exports = (function() {
    const _videoPlayerTpl = require('blocks/video-player/main.html');
    const _videoAutoplay = require('fn/videoAutoplay');

    const _helpers = RA.repo.helpers;
    const _dynamic = RA.repo.dynamic;
    const _yandexCounter = RA.repo.yandexCounter;
    const _gaCounter = RA.repo.gaCounter;

    const _isTouch = _helpers.isTouch();
    const _isEdge = (/Edge/).test(navigator.userAgent);
    let _isFullscreenState = false;

    const _HLS_SCRIPT_SRC = RA.config.get('urls.common_static') + 'scripts/vendor/hls/hls.js';
    const _ADS_BOX_CLASS = 'v-player-ads';
    const _ADS_CONTROLS_CLASS = 'v-player-ads-controls';
    const _TOUCH_PLAYER_CLASS = 'v-player-touch';
    const _FULLSCREEN_BOX_CLASS = 'v-player-fullscreen-mode';
    // Buttons state classes
    const _BTN_PAUSE_CLASS = 'state-pause';
    const _BTN_REPLAY_CLASS = 'state-replay';
    const _BTN_FULLSCREEN_CLASS = 'state-fullscreen';
    const _BTN_MUTED_CLASS = 'state-muted';

    const _defaults = {
        width: 'auto',
        height: 'auto',
        controls: false,
        autoplay: true,
        loop: false,
        muted: false,
        preload: 'none',
        cssClass: '',
        type: 'application/x-mpegURL', // video type for mp4 fallback
        volumeVal: 0.5,
        live: undefined,
        inside: true, // place for video insertion - inside or after container

        // additional video data
        videoData: {
            id: null,
            title: null,
            publishDate: null, // mixed js date format for consctuctor Date
            duration: null, // sec
            detailsUrl: null, // url for btn "more"
        },

        // Ad
        adSDKName: 'ima',
        adTagUrl: null,
        adXMLResponse: null,
        adControls: true,
        adSkipTime: 5, // sec
        adPosition: 'preroll', // preroll | postroll | N% | Nsec | N

        // trigger callbacks
        onVideoPlay: null,
        onVideoPause: null,
        onVideoError: null,
        onAdPlay: null,
        onAdPause: null,
        onAdError: null,
        onEnded: null,
        onVideoOutFullScreen: null,
        onAutoplayCheck: null,
        onPlayerModification: null,

        // counters
        /* targets:
             activate - активация видео
             play - запуск видео
             error - ошибка проигрывания видео
             quarter - видео проиграло черверть
             half - видео проиграмо половину
             threeQuarter - видео проиграло три четверти
             end - видео доиграло до конца
             adRequest - запрос рекламы
             adPlay - запуск рекламы
             adError - ошибка запуска рекламы
        */
        counters: {
            /*ym: {
                counterName: null, // имя/id счетчика
                params: null, // доп параметры целей
                targets: { // объект-список целей (target: "название цели счетчика")
                    play: 'video_play',
                    quarter: 'video_quarter',
                    end: 'video_end',
                    ...
                }
            },
            ga: {
                counterName: null, // имя/id счетчика
                category: 'Video', // категория/объект события
                targets: { // объект-список целей (target: "название цели счетчика")
                    play: 'video_play',
                    quarter: 'video_quarter',
                    end: 'video_end',
                    ...
                }
            },
            custom: {
                targets: {
                    play: urlPixel,
                    quarter: fn,
                    end: [urlPixel, urlPixel2, fn, fn2, ...],
                    ...
                }
            },*/
            ym: null,
            ga: null,
            custom: null,
            rm: {
                live: {
                    group: 'live-tv',
                    targets: {
                        activate: 'live-tv-activate',
                        play: 'live-tv-play',
                        adRequest: 'live-tv-ad-request',
                        adPlay: 'live-tv-ad-play',
                        adError: 'live-tv-ad-error'
                    }
                },
                video: {
                    group: 'video',
                    targets: {
                        activate: 'video-activate',
                        play: 'video-play',
                        quarter: 'video-quarter',
                        half: 'video-half',
                        threeQuarter: 'video-three-quarter',
                        end: 'video-end',
                        adRequest: 'video-ad-request',
                        adPlay: 'video-ad-play',
                        adError: 'video-ad-error'
                    }
                }
            }
        }
    };

    function VideoPlayer(url, container, options) {
        let self = this;

        self.videoUrl = url;
        self.container = container.jquery ? container[0] : container;
        self.config = _helpers.extend(true, {}, _defaults, options);

        if (!self.videoUrl) {
            _logError('не указан videoUrl');
            return;
        }

        if (!self.container) {
            _logError('не указан container');
            return;
        }

        self.init();
    }

    _helpers.extend(VideoPlayer.prototype, {
        init: function() {
            let self = this;
            let config = self.config;
            let container = self.container;
            let videoPlayerHtml = _videoPlayerTpl.render(config);

            _dynamic.requireCSS('fn.video-player', true);

            container.insertAdjacentHTML((config.inside ? 'beforeend' : 'afterend'), videoPlayerHtml);
            self.updateVars();
            self.bindEvents();

            self.adContainer.style.display = 'none';

            if (_isTouch) {
                self.videoBox.classList.add(_TOUCH_PLAYER_CLASS);
            }

            if (config.onPlayerModification) {
                config.onPlayerModification(self);
            }
        },

        updateVars: function() {
            let self = this;
            let config = self.config;

            // config
            config.volumeVal = config.muted ? 0 : _helpers.toFloat(config.volumeVal, true);

            // ad
            self.isAdExist = !!(config.adXMLResponse || config.adTagUrl);
            self.isAdPlaying = false;
            self.isAdRequested = false;
            self.isAdReadySDK = false; // Ad SDK готов
            self.isAdControls = !!config.adControls;
            self.adFormat = 'vast'; // vast|vmap определяем в процессе
            self.adDuration = null;
            self.adSkipTime = _helpers.toInt(config.adSkipTime, true);
            if (self.adSkipTime < 5) self.adSkipTime = 5;

            // video settings
            self.isAutoplayAllowed = false;
            self.isAutoplayRequiresMuted = false;
            self.isVideoPlaying = false;
            self.isVideoEnded = false;

            // player node
            let videoBox = self.videoBox = self.container.querySelector('.js-video-player-box');
            self.video = videoBox.querySelector('.js-video-player');

            // nodes
            self.controls = videoBox.querySelector('.js-video-player-controls');
            self.controlsInner = videoBox.querySelector('.js-video-player-controls-inner');
            self.controlsTop = videoBox.querySelector('.js-video-player-controls-top');
            self.time = videoBox.querySelector('.js-video-player-time');
            self.playTime = videoBox.querySelector('.js-video-player-play-time');
            self.timeProgress = videoBox.querySelector('.js-video-player-time-progress');
            self.timeCurrent = videoBox.querySelector('.js-video-player-time-current');
            self.timeHolder = videoBox.querySelector('.js-video-player-time-holder');
            self.timePopup = videoBox.querySelector('.js-video-player-time-popup');
            self.timeMidrollMark = videoBox.querySelector('.js-video-player-time-midroll-mark');
            self.playBtn = videoBox.querySelector('.js-video-player-play');
            self.volumeBtn = videoBox.querySelector('.js-video-player-volume');
            self.volumeProgress = videoBox.querySelector('.js-video-player-volume-progress');
            self.volumeHolder = videoBox.querySelector('.js-video-player-volume-holder');
            self.volumeCurrent = videoBox.querySelector('.js-video-player-volume-current');
            self.qualityContainer = videoBox.querySelector('.js-video-player-quality-container');
            self.qualityPopup = self.qualityContainer.querySelector('.js-video-player-quality-popup');
            self.qualitySwitcher = self.qualityContainer.querySelector('.js-video-player-quality');
            self.fullscreenBtn = videoBox.querySelector('.js-video-player-fullscreen');
            self.liveText = videoBox.querySelector('.js-video-player-live-text');
            self.preloader = videoBox.querySelector('.js-video-player-preloader');
            self.close = videoBox.querySelector('.js-video-player-close');
            self.detailsLink = videoBox.querySelector('.js-video-player-details');
            self.adContainer = videoBox.querySelector('.js-video-player-ad');
            self.adCountdown = videoBox.querySelector('.js-video-player-ad-countdown');
            self.adSkipBtn = videoBox.querySelector('.js-video-player-ad-skip');
            self.adSkipCountdown = videoBox.querySelector('.js-video-player-ad-skip-countdown');

            // create counters targets list
            self.counterTargets = {};
            if (config.counters) {
                // set current rm counter
                if (config.counters.rm) {
                    config.counters.rm = config.counters.rm[(config.live ? 'live' : 'video')];
                }

                let targets, counter;
                for (let nick in config.counters) {
                    counter = config.counters[nick];
                    targets = counter && counter.targets;

                    for (let target in targets) {
                        if (!self.counterTargets[target]) self.counterTargets[target] = [];

                        switch (nick) {
                            case 'ym':
                                self.counterTargets[target].push({
                                    nick: nick,
                                    counterName: counter.counterName,
                                    event: targets[target],
                                    params: counter.params
                                });
                                break;
                            case 'ga':
                                self.counterTargets[target].push({
                                    nick: nick,
                                    counterName: counter.counterName,
                                    category: counter.category || 'Video',
                                    event: targets[target]
                                });
                                break;
                            case 'custom':
                                self.counterTargets[target].push({
                                    nick: nick,
                                    listCb: targets[target]
                                });
                                break;
                            case 'rm':
                                self.counterTargets[target].push({
                                    nick: nick,
                                    group: counter.group,
                                    event: targets[target]
                                });
                                break;
                        }
                    }
                }
            }
        },

        //

        bindEvents: function() {
            var self = this;
            var video = self.video;
            var videoBox = self.videoBox;

            if (!videoBox) return;

            // ------------------

            self.handlerVideoDurationChange = function() {
                if (self.videoDuration === video.duration) {
                    return;
                }

                self.videoDuration = video.duration || 0;

                self.checkForLive(self.config.live);

                if (!self.config.live) {
                    self.resizeControls();
                }
            };

            self.handlerVideoProgress = function() {
                var timeLoad = self.timeCurrent.previousElementSibling;
                var currentTime = video.currentTime;
                var buffer;

                if (!self.videoDuration) return;

                for (var i = 0; i < video.buffered.length; i++) {
                    if (currentTime > video.buffered.start(i) && currentTime < video.buffered.end(i)) {
                        buffer = video.buffered.end(i);
                    }
                }

                buffer = Math.floor(buffer) / self.videoDuration * 100;
                timeLoad.style.width = buffer.toFixed(2) + '%';
            };

            self.handlerVideoWaiting = function() {
                self.preloader.style.display = 'block';
            };

            self.handlerVideoError = function(e) {
                self.onVideoError(e.target.error);
            };

            self.handlerVideoEnded = function() {
                var timer;

                self.isVideoEnded = true;

                // counters
                self.sendCountersTarget('end');

                // Fix for videoGallery, historyGallery (run Ad and then ended callback)
                (function _onEnded() {
                    if (self.isAdPlaying) {
                        if (timer) clearTimeout(timer);
                        timer = setTimeout(_onEnded, 1000);
                    } else {
                        timer = null;
                        self.pause();

                        self.playBtn.classList.remove(_BTN_PAUSE_CLASS);
                        self.playBtn.classList.add(_BTN_REPLAY_CLASS);

                        self.controls.removeEventListener('mousemove', self.handlerControlsMousemove);
                        self.controls.classList.add('active');

                        // tell the SDK that our content video
                        // is completed so the SDK can play any post-roll ads.
                        if (self.adSDK) {
                            self.adSDK.contentComplete();
                            timer = setTimeout(_onEnded, 300);
                            return;
                        }

                        // on video ended callback
                        if (self.config.onEnded) {
                            self.config.onEnded(self);
                        }
                    }
                })();
            };

            self.handlerVideoPause = function() {
                // Safari iOS (on iPhone) can play only one video at a time, second video pauses automaticly
                self.playBtn.classList.remove(_BTN_PAUSE_CLASS);

                self.controls.removeEventListener('mousemove', self.handlerControlsMousemove);

                // on video pause callback
                if (self.config.onVideoPause) {
                    self.config.onVideoPause(self);
                }
            };

            self.handlerVideoTimeUpdate = _helpers.throttle(function() {
                self.preloader.style.display = 'none';
                self.timeControl(self.video.currentTime);
            }, 500);

            self.handlerVideoPlay = function() {
                // video.play method works on iOS9 only as a result of user gesture, so manage classes here
                self.playBtn.classList.add(_BTN_PAUSE_CLASS);

                // For mobiles
                self.hideControlsOnTimeout();

                // Mousemove triggers after mouseleave...
                // Off on pause for optimization
                self.controls.removeEventListener('mousemove', self.handlerControlsMousemove);
                self.controls.addEventListener('mousemove', self.handlerControlsMousemove);

                // on video play callback
                if (self.config.onVideoPlay) {
                    self.config.onVideoPlay(self);
                }
            };

            self.handlerWindowResize = _helpers.throttle(function() {
                self.resizeControls()
            }, 300);

            self.handlerControlsMousemove = _helpers.throttle(function() {
                if (!self.isControlsHidden) {
                    _dispatchEvent(this, 'mouseenter');
                } else {
                    self.isControlsHidden = false;
                }
            }, 500);

            self.handlerFullscreenchange = function() {
                var fullscreenBtn = self.fullscreenBtn;

                _isFullscreenState = !fullscreenBtn.classList.contains(_BTN_FULLSCREEN_CLASS);

                // Fixed css styles for Safari iOS
                videoBox.classList.toggle(_FULLSCREEN_BOX_CLASS, _isFullscreenState);

                // Removing the White Bars in Safari on iPhone X
                // https://stephenradford.me/removing-the-white-bars-in-safari-on-iphone-x/
                document.body.classList.toggle(_FULLSCREEN_BOX_CLASS, _isFullscreenState);

                fullscreenBtn.classList.toggle(_BTN_FULLSCREEN_CLASS, _isFullscreenState);

                if (_isFullscreenState) {
                    self.close.style.display = 'block';
                } else {
                    self.close.style.display = 'none';
                    if (self.config.onVideoOutFullScreen) {
                        self.config.onVideoOutFullScreen(self);
                    }
                }
            };

            // ------------------

            // вешаем обязательно тут, т.к. наружу выставлены методы requestFullScreen и exitFullScreen
            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(function(type) {
                videoBox.addEventListener(type, self.handlerFullscreenchange);
            });

            // ------------------

            // обязательно вешаем события на видео до его загрузки
            self.toggleVideoEvents(true);
        },

        bindControlsEvents: function() {
            var self = this;
            var video = self.video;

            // ------------------

            function _onVolumeMouseMove(event) {
                var volumeProgressBox = self.volumeProgress.getBoundingClientRect();

                var progressW = volumeProgressBox.width;
                var holderW = self.volumeHolder.offsetWidth;
                var volumeW = self.volumeCurrent.previousElementSibling.offsetWidth;

                var left = event.pageX - volumeProgressBox.left - holderW / 2;
                if (left < 0) {
                    left = 0;
                } else if (left > progressW - holderW) {
                    left = progressW - holderW;
                }

                var volumeVal = left / (volumeW - holderW);
                self.volumeControl(volumeVal);
            }

            function _onVolumeMouseUp() {
                self.volumeProgress.parentNode.classList.remove('active');
                document.removeEventListener('mousemove', _onVolumeMouseMove);
                document.removeEventListener('mouseup', _onVolumeMouseUp);

                // Cursor under controls top part triggers click event (pauses live video), prevent it
                setTimeout(function() {
                    self.isVolumeActive = false;
                }, 50);
            }

            function _onTimeMouseMove(event) {
                var timeProgressBox = self.timeProgress.getBoundingClientRect();

                var timePopup = self.timePopup;
                var progressW = timeProgressBox.width;
                var playbackW = self.timeCurrent.previousElementSibling.previousElementSibling.offsetWidth;

                var left = event.pageX - timeProgressBox.left;
                if (left < 0) {
                    left = 0;
                } else if (left > progressW) {
                    left = progressW;
                }

                if (self.videoDuration) {
                    var timeVal = left / playbackW * self.videoDuration;
                    timePopup.style.left = left - timePopup.offsetWidth / 2;
                    timePopup.textContent = _formatTime(timeVal);
                    if (self.clickEvent) {
                        self.timeControl(timeVal, true);
                    }
                }
            }

            function _onTimeMouseUp() {
                self.clickEvent = false;
                document.removeEventListener('mousemove', _onTimeMouseMove);
                document.removeEventListener('mouseup', _onTimeMouseUp);
            }

            // ------------------

            window.addEventListener('resize', self.handlerWindowResize);

            self.controls.addEventListener('click', function() {
                if (!_isTouch && !self.isVolumeActive) {
                    _dispatchEvent(self.playBtn, 'click');
                    self.toggleQualityPopup(false);
                } else {
                    self.hideControlsOnTimeout();
                }

                this.classList.add('active');
                self.showCursor();
            });
            self.controls.addEventListener('mouseenter', function() {
                this.classList.add('active');
                self.showCursor();
                self.hideControlsOnTimeout();
            });
            self.controls.addEventListener('mouseleave', function() {
                self.isControlsHidden = true;
                if (self.playBtn.classList.contains(_BTN_PAUSE_CLASS)) {
                    this.classList.remove('active');
                    self.showCursor();
                }
            });

            self.controlsInner.addEventListener('click', function(e) {
                if (!_isTouch) e.stopPropagation();
            });

            self.playBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var th = this;

                th.classList.remove(_BTN_REPLAY_CLASS);

                // Video
                if (!self.controls.classList.contains(_ADS_CONTROLS_CLASS)) {
                    if (th.classList.contains(_BTN_PAUSE_CLASS)) {
                        self.pause();
                    } else {
                        if (self.isAdRequested || !self.isAdExist) {
                            self.play();
                        } else {
                            self.requestAds();
                        }
                    }

                // Ads
                } else {
                    if (th.classList.contains(_BTN_PAUSE_CLASS)) {
                        self.isPauseBtnClick = true;
                        self.adSDK.pause();
                    } else {
                        self.isPauseBtnClick = false;
                        self.adSDK.resume();
                    }

                    th.classList.toggle(_BTN_PAUSE_CLASS);
                }
            });

            self.close.addEventListener('click', function(e) {
                e.stopPropagation();

                if (_isFullscreenState) {
                    self.exitFullScreen();
                }
            });

            // Volume button is one for ads and video, so volume is always synchronized
            self.volumeBtn.addEventListener('click', function(e) {
                e.stopPropagation();

                var th = this;
                var adSDK = self.adSDK
                var volume = th.dataset.volume || 0.5;

                // Video
                th.classList.toggle(_BTN_MUTED_CLASS);
                video.muted = !!th.classList.contains(_BTN_MUTED_CLASS);

                if (video.muted) {
                    th.dataset.volume = video.volume;
                    self.volumeControl(0);
                    if (adSDK) adSDK.setVolume(0);
                } else {
                    self.volumeControl(volume);
                    if (adSDK) adSDK.setVolume(volume);
                }

                // Don`t return sound back - user changed sound option by self
                self.isSoundForceOff = false;
            });

            self.qualitySwitcher.addEventListener('click', function(e) {
                e.stopPropagation();
                self.toggleQualityPopup();
            });

            self.qualityPopup.addEventListener('click', function(e) {
                e.stopPropagation();
                let th = e.target; // btn

                // снимаем обработчики, чтобы не было никаких вызовов в момент переключения
                // в частности срабатывает "pause"
                self.toggleVideoEvents(false);

                if (self.hls && !self.isNativePlayer) {
                    self.hls.currentLevel = _helpers.toInt(th.dataset.index);
                } else {
                    let currentTime = video.currentTime;
                    let src = th.dataset.url || '';

                    self.pause();
                    video.setAttribute('src', src);
                    video.load();
                    video.addEventListener('loadedmetadata', function onLoadedmetadata() {
                        self.play();
                        self.timeControl(currentTime, true);
                        video.removeEventListener('loadedmetadata', onLoadedmetadata);
                    });
                }

                // возвращаем обработчики, но только с задержкой, т.к. hls асинхронно меняет поток
                setTimeout(function() {
                    self.toggleVideoEvents(true);
                }, 50);

                let activeElem = this.querySelector('.active');
                if (activeElem) activeElem.classList.remove('active');

                th.classList.add('active');

                self.toggleQualityPopup(false);
            });

            self.fullscreenBtn.addEventListener('click', function(e) {
                e.stopPropagation();

                if (_isFullscreenState) {
                    self.exitFullScreen();
                } else {
                    self.requestFullScreen();
                }
            });

            self.volumeProgress.addEventListener('dragstart', function(e) {
                e.stopPropagation();
                e.preventDefault();
            });
            self.volumeProgress.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            self.volumeProgress.addEventListener('mousedown', function(e) {
                if (e.which !== 1) return;

                this.parentNode.classList.add('active');
                self.isVolumeActive = true;

                document.addEventListener('mousemove', _onVolumeMouseMove);
                document.addEventListener('mouseup', _onVolumeMouseUp);

                _onVolumeMouseMove(e);
            });

            self.timeProgress.addEventListener('dragstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
            self.timeProgress.addEventListener('mousedown', function(e) {
                if (e.which !== 1 || self.controls.classList.contains(_ADS_CONTROLS_CLASS)) return;

                self.clickEvent = true;

                document.addEventListener('mousemove', _onTimeMouseMove);
                document.addEventListener('mouseup', _onTimeMouseUp);

                _onTimeMouseMove(e);
            });
            self.timeProgress.addEventListener('mouseenter', _onTimeMouseMove);
            self.timeProgress.addEventListener('mousemove', _onTimeMouseMove);

            self.timeProgress.addEventListener('click', function(e) {
                e.stopPropagation();
            });

            self.adSkipBtn.addEventListener('click', function(e) {
                e.stopPropagation();

                if (self.isAdCanSkip && self.adSDK) {
                    self.adSDK.skip();
                }
            });
        },

        toggleVideoEvents: function(isOn) {
            // если ad SDK вставляет рекламу в текущий элемент видео (например яндекс),
            // то надо обязательно снимать эти событие

            var self = this;
            var video = self.video;
            var fn = isOn ? 'addEventListener': 'removeEventListener';

            video[fn]('durationchange', self.handlerVideoDurationChange);

            video[fn]('progress', self.handlerVideoProgress);

            video[fn]('waiting', self.handlerVideoWaiting);

            video[fn]('error', self.handlerVideoError);

            // Event can trigger many times (f.e. user changes playback by dragging)
            // Also because of debounce event trigger after ads started
            video[fn]('ended', self.handlerVideoEnded);

            video[fn]('timeupdate', self.handlerVideoTimeUpdate);

            video[fn]('play', self.handlerVideoPlay);

            video[fn]('pause', self.handlerVideoPause);
        },

        //

        setPlayMode: function() {
            var self = this;
            var config = self.config;

            self.controls.classList.add('active');
            self.showCursor();

            if (self.isAutoplayAllowed) {
                if (self.isAutoplayRequiresMuted) {
                    self.volumeControl(0);
                } else {
                    self.volumeControl(config.volumeVal);
                }

                if (self.isAdExist) {
                    self.requestAds();
                } else {
                    self.play();
                }
            } else {
                self.volumeControl(config.volumeVal);
            }
        },

        play: function() {
            var self = this;

            if (!self.isVideoPlaying) {
                var promise = self.play.promise = self.video.play();
                if (promise !== undefined) {
                    promise.then(function() {
                        self.isVideoPlaying = true;

                        // counters
                        self.sendCountersTarget('play');
                    }).finally(function() {
                        self.play.promise = null;
                    })
                } else {
                    self.isVideoPlaying = true;

                    // counters
                    self.sendCountersTarget('play');
                }
            }
        },

        pause: function() {
            var self = this;

            if (self.isVideoPlaying) {
                self.isVideoPlaying = false;
                self.video.pause();
            } else if (self.play.promise) {
                self.play.promise.then(function() {
                    self.isVideoPlaying = false;
                    self.video.pause();
                });
            } else {
                self.video.pause();
            }
        },

        //

        onVideoError: function(error) {
            var self = this;

            // counters
            self.sendCountersTarget('error');

            _logError(error);
            self.destroy();

            // callback
            if (self.config.onVideoError) {
                self.config.onVideoError(self);
            }
        },

        onAdError: function(error) {
            var self = this;

            self.isAdPlaying = false;
            self.play();

            // counters
            self.sendCountersTarget('adError');

            // callback
            if (self.config.onAdError) {
                self.config.onAdError(self);
            }

            _logError(error);
        },

        //

        createQualityLevels: function(data) {
            var self = this;
            var levels = data.levels.length;

            if (levels <= 1) {
                self.qualityContainer.style.display = 'none';
                return;
            }

            var btn = self.qualityPopup.querySelector('.js-video-player-qlt-button');
            if (!btn) return;

            data.levels.map(function(level, index) {
                if (index === 0) {
                    btn.textContent = level.height + 'p';
                    btn.dataset.url = level.url;
                    btn.dataset.index = levels - index - 1;
                } else {
                    var newBtn = btn.cloneNode(true);
                    newBtn.textContent = level.height + 'p';
                    newBtn.dataset.url = level.url;
                    newBtn.dataset.index = levels - index - 1;
                    self.qualityPopup.appendChild(newBtn);
                }

                return null;
            });
        },

        volumeControl: function(value) {
            var self = this;
            var video = self.video;

            value = _helpers.toFloat(value, true);

            var volumeW = self.volumeProgressW || (self.volumeProgressW = _helpers.toInt(window.getComputedStyle(self.volumeProgress).maxWidth));
            var holderW = self.volumeHolder.offsetWidth;
            var left = value * (volumeW - holderW);

            // Change controls state
            self.volumeHolder.style.left = left + 'px';
            self.volumeCurrent.style.width = left + 'px';

            if (value === 0) {
                video.muted = true;
                self.volumeBtn.classList.add(_BTN_MUTED_CLASS);
            } else {
                video.muted = false;
                self.volumeBtn.classList.remove(_BTN_MUTED_CLASS);
            }

            // Set volume
            self.video.volume = value.toFixed(2);
        },

        timeControl: function(value, isChangePlayback, adCountdown, adSkipCountdown) {
            let self = this;
            let playbackW = self.timeCurrent && self.timeCurrent.previousElementSibling.previousElementSibling.offsetWidth || 0;
            let duration = self.videoDuration || 0;
            let left;

            // AD
            if (self.isAdPlaying) {
                if (self.controls.classList.contains(_ADS_CONTROLS_CLASS)) {
                    let adCntdwn = self.adCountdown;
                    let adSkipCntdwn = self.adSkipCountdown;
                    left = value * playbackW / self.adDuration;

                    // Change controls state
                    self.timeCurrent.style.width = left + 'px';

                    if (adCountdown !== null && adCountdown >= 0) {
                        adCntdwn.textContent = _formatTime(adCountdown);
                    }

                    if (adSkipCountdown !== null && adSkipCountdown >= 0) {
                        adSkipCntdwn.textContent = adSkipCountdown;
                    }
                }

            // Video
            } else {
                let holderW = self.timeHolder.offsetWidth;
                left = value * playbackW / duration - holderW / 2;

                // Change controls state
                if (left > 0) {
                    self.timeHolder.style.left = left + 'px';
                    self.timeCurrent.style.width = left + 'px';
                }

                if (self.playTime) {
                    if (value && self.controls.classList.contains('active') || Math.floor(value) === Math.floor(duration)) {
                        self.playTime.textContent = _formatTime(value);
                    }
                }

                // Midroll time mark
                let mdlMark = self.timeMidrollMark;
                if (!mdlMark.classList.contains('active') && duration > 0) {
                    let adPosition = self.config.adPosition;
                    let adTime = _helpers.toInt(adPosition);

                    if (adTime) {
                        if (!~adPosition.toString().indexOf('%')) {
                            adTime = adTime * 100 / duration;
                        }
                        mdlMark.style.left = adTime + '%';
                        mdlMark.classList.add('active');
                    }
                }

                // Set playback
                if (isChangePlayback) {
                    setTimeout(function() {
                        self.video.currentTime = value;

                        // Fix for Safari (it doesnt trigger ended event sometimes)
                        if (duration && value === duration) {
                            _dispatchEvent(self.video, 'ended');
                        }
                    }, 200);
                }

                if (self.isVideoPlaying) {
                    self.checkTimeForCounters(value, duration);
                }
            }
        },

        checkTimeForCounters: function(currentTime, duration) {
            var self = this;

            if (!self.isSendStatQuarter && currentTime >= duration / 4) {
                self.isSendStatQuarter = true;
                self.sendCountersTarget('quarter');

            } else if (!self.isSendStatHalf && currentTime >= duration / 2) {
                self.isSendStatHalf = true;
                self.sendCountersTarget('half');

            } else if (!self.isSendStatThreeQuarter && currentTime >= duration / 4 * 3) {
                self.isSendStatThreeQuarter = true;
                self.sendCountersTarget('threeQuarter');
            }
        },

        checkForLive: function(isLive) {
            var self = this;

            if (isLive === undefined) {
                self.config.live = isLive = self.videoDuration === 'Infinity';
            }

            if (isLive) {
                self.liveText.style.display = 'block';
            } else {
                self.time.textContent = _formatTime(self.videoDuration);
                self.controlsTop.style.display = self.videoDuration > 0 ? 'block' : 'none';
            }
        },

        showCursor: function() {
            var self = this;
            if (self.videoBox) {
                self.videoBox.style.cursor = 'auto';
            }
        },

        hideCursor: function() {
            var self = this;
            if (self.videoBox) {
                self.videoBox.style.cursor = 'none';
            }
        },

        resizeControls: function() {
            let self = this;
            let video = self.video;
            let videoBox = self.videoBox;

            // контейнер может уже убит
            if (!videoBox) return;

            // Use player dimentions, not window
            videoBox.classList.toggle('small', videoBox.offsetWidth <= 500);

            // Resize playback lines (in px) if controls are visible
            if (self.controls.classList.contains('active')) {
                let time;

                if (self.adSDK && self.isAdPlaying) {
                    if (self.controls.classList.contains(_ADS_CONTROLS_CLASS)) {
                        time = self.adDuration - self.adSDK.getRemainingTime();
                        self.timeControl(time);
                    }
                } else {
                    time = video.currentTime;
                    self.timeControl(time);
                }
            }
        },

        hideControlsOnTimeout: function() {
            var self = this;
            var timer = self.hideControlsOnTimeout.timer;

            if (timer) {
                clearTimeout(timer);
            }

            self.hideControlsOnTimeout.timer = setTimeout(function() {
                if (!self.playBtn.classList.contains(_BTN_PAUSE_CLASS)) return;

                // check elem is visible
                if (!self.controls.offsetParent) return;

                self.controls.classList.remove('active');
                self.hideCursor();
            }, 3000);
        },

        toggleQualityPopup: function(isOpen) {
            let self = this;
            let popupClassList = self.qualityPopup.classList;

            if (isOpen === undefined) {
                popupClassList.toggle('active');
            } else if (isOpen) {
                popupClassList.add('active');
            } else {
                popupClassList.remove('active');
            }

            self.setControlsZIndex(popupClassList.contains('active'));
        },

        setControlsZIndex: function(isToTop) {
            let self = this;

            self.controls.style.zIndex = isToTop ? '10000' : '';
        },

        //

        requestAds: function() {
            var self = this;

            if (self.isAdRequested) return;
            self.isAdRequested = true;

            self.loadAdSDK().then(function() {
                self.adSDK.requestAds(self.isAutoplayAllowed, self.isAutoplayRequiresMuted);
            }).catch(self.onAdError.bind(self));
        },

        loadAdSDK: function() {
            var self = this;

            if (self.promiseLoadAdSDK) {
                return self.promiseLoadAdSDK;
            }

            self.promiseLoadAdSDK = new Promise(function(resolve, reject) {
                var name;

                if (self.config.adSDKName === 'ima') {
                    name = 'videoPlayerAdapterIMA';
                } else if (self.config.adSDKName === 'yandex') {
                    name = 'videoPlayerAdapterYVA';

                    if (!self.config.adFoxParameters) {
                        reject('Не указаны параметры adFoxParameters для videoPlayerAdapterYVA');
                        return;
                    }

                } else {
                    reject('Неизвестный тип sdk');
                    return;
                }

                RA.repo.dynamic.require('fn.' + name, true);
                RA.repo.dynamic.ready(function() {
                    if (!RA.fn[name]) {
                        reject('Не найдена ad sdk');
                        return;
                    }

                    self.initAdSDK(RA.fn[name]).then(resolve, reject);
                });
            });

            return self.promiseLoadAdSDK;
        },

        initAdSDK: function(sdk) {
            var self = this;

            function _onReadyAdSDK(data) {
                self.isAdReadySDK = true;

                self.adFormat = (data && data.adFormat) || 'vast';

                // Call start to show ads. Single video and overlay ads will
                // start at this time; this call will be ignored for ad rules, as ad rules
                // ads start when the adsManager is initialized.
                _startAds();
            }

            function _onAdError(error) {
                self.videoBox.classList.remove(_ADS_BOX_CLASS);
                self.controls.classList.remove(_ADS_CONTROLS_CLASS);
                self.controls.style.display = 'block';
                self.timeMidrollMark.classList.remove('active');

                _destroyAds();
                self.onAdError(error);
            }

            function _onAdRequest() {
                // counters
                self.sendCountersTarget('adRequest');
            }

            function _onAdStart(data) {
                if (self.isAdPlaying) return;
                self.isAdPlaying = true;

                self.adDuration = (data && data.duration) || 0;

                // в настройках vast указано пропускать рекламу через N сек
                // SDK нарисует свой контролл и мы его отменить не можем
                // поэтому будем скрывать свой
                self.adSdkSkipTime = data && data.skipTime;

                // Ad without duration parameters
                self.timeProgress.style.display = self.adDuration > 0 ? '' : 'none';

                // Dont show ad own skip btn
                var isHideSkipBtn = self.adSdkSkipTime > -1 || (self.adSkipTime >= self.adDuration && self.adDuration > 0);
                self.adSkipBtn.style.display = isHideSkipBtn ? 'none' : 'block';

                // If autoplay requires muted - force sound off,
                // another way AD inherits sound options from player
                if (self.isAutoplayRequiresMuted && !self.volumeBtn.classList.contains(_BTN_MUTED_CLASS)) {
                    self.volumeBtn.classList.add(_BTN_MUTED_CLASS);
                    self.isSoundForceOff = true; // to return sound back after ad finished playing
                }

                if (self.volumeBtn.classList.contains(_BTN_MUTED_CLASS)) {
                    self.adSDK.setVolume(0);
                } else {
                    self.adSDK.setVolume(self.video.volume);
                }

                // доп. класс для общего контейнера
                self.videoBox.classList.add(_ADS_BOX_CLASS);

                // доп. класс для контроллов
                if (self.isAdControls && self.adSdkSkipTime === -1) {
                    self.controls.classList.add(_ADS_CONTROLS_CLASS);
                } else {
                    self.controls.style.display = 'none';
                }

                // при потере вкладки фокуса реклама может быть поставлена на паузу VPAID без нашего ведома
                // поэтом при возврате фокуса пытаемся заново запустить рекламу
                document.addEventListener('visibilitychange', _onDocumentVisibilityChange);

                window.addEventListener('resize', self.handlerAdResize);
                // check sizes before show ad for Safari (sends multiple resize events)
                self.handlerAdResize();

                _onAdResume();

                // counters
                self.sendCountersTarget('adPlay');
            }

            function _onAdEnded() {
                if (!self.isAdPlaying) return;
                self.isAdPlaying = false;

                self.timeControl(self.adDuration, false, 0);
                self.timeProgress.style.display = '';

                // Return video sound back
                if (self.isSoundForceOff) {
                    self.volumeBtn.classList.remove(_BTN_MUTED_CLASS);
                }

                self.videoBox.classList.remove(_ADS_BOX_CLASS);

                if (self.isAdControls && self.adSdkSkipTime === -1) {
                    self.controls.classList.remove(_ADS_CONTROLS_CLASS);
                } else {
                    self.controls.style.display = '';
                }

                window.removeEventListener('resize', self.handlerAdResize);
                document.removeEventListener('visibilitychange', _onDocumentVisibilityChange);

                // Ended event can trigger immediately after this event, so check video current time
                /*if (!self.playBtn.classList.contains(_BTN_REPLAY_CLASS) && self.video.currentTime !== self.video.duration) {
                    self.play();
                }*/
            }

            function _onAdPause() {
                self.playBtn.classList.remove(_BTN_PAUSE_CLASS);
                self.controls.removeEventListener('mousemove', self.handlerControlsMousemove);

                // Fix for iOS, it pauses some gpmd vpaid creatives before they start, user can`t control them.
                // Stop ads and play video
                if (!self.isAdPlaying) {
                    _destroyAds();
                    return;
                }

                // on ad pause callback
                if (self.config.onAdPause) {
                    self.config.onAdPause(self);
                }
            }

            function _onAdResume() {
                self.playBtn.classList.add(_BTN_PAUSE_CLASS);

                self.hideControlsOnTimeout();

                // Mousemove triggers after mouseleave...
                // Off on pause for optimization
                self.controls.removeEventListener('mousemove', self.handlerControlsMousemove);
                self.controls.addEventListener('mousemove', self.handlerControlsMousemove);

                // on ad play callback
                if (self.config.onAdPlay) {
                    self.config.onAdPlay(self);
                }
            }

            function _onAdProgress(remainingTime) {
                var skipTime = self.adSkipTime;
                var duration = self.adDuration;
                var time = duration - remainingTime;
                var skipCntDwn = skipTime - time;

                if (duration <= 0 || skipCntDwn === 0) {
                    self.adSkipCountdown.parentNode.style.display = 'none';
                    self.isAdCanSkip = true;
                }

                self.timeControl(time, false, remainingTime, skipCntDwn);
            }

            function _onAllAdsCompleted() {
                // For postrolls
                if (self.playBtn.classList.contains(_BTN_REPLAY_CLASS)) {
                    self.pause();
                }

                _destroyAds();
            }

            //

            function _startAds() {
                /*
                Параметры работы ad:
                adFormat: 'vast' | 'vmap'
                adPosition: 'preroll' | 'postroll' | 'N%' | 'N'

                adPosition возможны след. варианты:
                'preroll',
                'postroll',
                'N%' - в процентах от длительности ролика,
                'N' - в секундах от старта

                Есть пара нюансов:
                1. Для формата vmap все игнорируем
                2. Для стрима(прямой эфир) adPosition может быть только кол-во сек от старта
                3. Postroll работает только на редакционных, в historyGallery не работает (по тех. причинам), в videoGalleryNext будут конфликты
                */

                var conf = self.config;
                var video = self.video;
                var isRelative = conf.adPosition.toString().indexOf('%') > -1;

                // If ended callback is run already (slow internet)
                if (self.isVideoEnded) {
                    return;
                }

                // Vmap сам управляет когда и что запустить
                // Preroll запускаем сразу
                // Для стрима не можем указывать позицию в процентах - запускаем сразу
                if (self.adFormat === 'vmap' || conf.adPosition === 'preroll' || (conf.live && isRelative)) {
                    self.adSDK.start();
                    return;
                }

                // Postroll запускаем после того, как видео закончилось
                if (conf.adPosition === 'postroll') {
                    video.addEventListener('ended', function() {
                        self.adSDK.start();
                    });
                    video.play();
                    return;
                }

                var startPos = _helpers.toInt(conf.adPosition, true);

                // Нулевые позиции (0%, 0s) и прочая хрень
                if (!startPos) {
                    self.adSDK.start();
                    return;
                }

                // Midrolls
                video.onTimeUpdateForAds = _helpers.throttle(function() {
                    var currentTime = this.currentTime;
                    var duration = this.duration;

                    if (isRelative) {
                        startPos = Math.floor(startPos * duration / 100);
                        isRelative = false;
                    }

                    // Video less than ad position OR now is time ad
                    if (startPos >= duration || startPos <= currentTime) {
                        self.adSDK.start();
                        video.removeEventListener('timeupdate', video.onTimeUpdateForAds);
                        video.onTimeUpdateForAds = null;
                    }
                }, 1000);
                video.addEventListener('timeupdate', video.onTimeUpdateForAds);

                // play video
                self.play();
            }

            function _destroyAds() {
                self.isAdPlaying = false;

                window.removeEventListener('resize', self.handlerAdResize);
                document.removeEventListener('visibilitychange', _onDocumentVisibilityChange);

                self.adSDK.destroy();
                self.adSDK = null;

                self.handlerAdResize = null;

                self.adContainer.style.display = 'none';
                self.controls.style.display = '';
            }

            function _resumeAd() {
                if (!self.isPauseBtnClick && self.isAdPlaying && self.adSDK) {
                    self.adSDK.resume();
                }
            }

            function _onDocumentVisibilityChange() {
                if (document.visibilityState === 'visible') {
                    _resumeAd();
                }
            }

            self.handlerAdResize = _helpers.throttle(function() {
                // Safari and Chrome on iOS return correct video sizes only after little delay.
                // Also ads resizing during fullscreen in/out has same problems
                setTimeout(function() {
                    if (self.adSDK) {
                        self.adSDK.resize(self.getVideoSize());
                    }
                }, 200);
            }, 300);

            //

            if (self.adSDK) {
                return Promise.resolve();
            }

            self.adSDK = new sdk(self, {
                onReady: _onReadyAdSDK,
                onError: _onAdError,
                //
                onAdRequest: _onAdRequest,
                onAdStart: _onAdStart,
                onAdPause: _onAdPause,
                onAdResume: _onAdResume,
                onAdProgress: _onAdProgress,
                onAdEnded: _onAdEnded,
                onAllAdsCompleted: _onAllAdsCompleted
            });

            return self.adSDK.init();
        },

        //

        // Public api
        //
        activate: function() {
            var self = this;
            var config = self.config;
            var video = self.video;
            var videoUrl = self.videoUrl;

            // counters
            self.sendCountersTarget('activate');

            // show video details link
            if (self.config.videoData.detailsUrl && self.detailsLink) {
                let url = _helpers.trim(self.config.videoData.detailsUrl);
                if (url) {
                    url += (url.includes('?') ? '&' : '?') + 'from=video_details';
                    self.detailsLink.href = url;
                    self.detailsLink.classList.add('active');
                }
            }

            // mp4 fallback
            if (config.type === 'mp4') {
                video.src = videoUrl;
                self.qualitySwitcher.parentNode.style.display = 'none';
                video.addEventListener('loadedmetadata', function() {
                    _onVideoMetaLoad(config);
                });
                video.load();
                return;
            }

            _loadHLS()
                .then(function(Hls) {
                    var hls = self.hls = new Hls({debug: false});

                    hls.loadSource(videoUrl);

                    // For Edge/IOS use native video (Edge can play using hls but has some bugs)
                    if (Hls.isSupported() && !_isEdge) {
                        hls.attachMedia(video);
                    } else {
                        self.isNativePlayer = true;
                        video.src = videoUrl;
                    }

                    // Recommended MANIFEST_PARSED doesnt trigger on iOS
                    hls.on(Hls.Events.MANIFEST_LOADED, function(event, data) {
                        _onVideoMetaLoad(config, data);
                    });
                })
                .catch(_logError);

            function _onVideoMetaLoad(config, data) {
                if (config.autoplay) {
                    if (data) {
                        self.createQualityLevels(data);
                    }

                    _autoplayCheck().then(function(result) {
                        self.isAutoplayAllowed = result.autoplayAllowed;
                        self.isAutoplayRequiresMuted = result.autoplayRequiresMuted;
                        self.bindControlsEvents();
                        self.setPlayMode();

                        if (self.config.onAutoplayCheck) {
                            self.config.onAutoplayCheck(result, self);
                        }
                    });
                } else {
                    self.bindControlsEvents();
                    self.volumeControl(config.volumeVal);
                    self.controls.classList.add('active');
                }
            }
        },

        getVideo: function(isDomNode) {
            return window.$ && !isDomNode ? $(this.video) : this.video;
        },

        getVideoBox: function(isDomNode) {
            return window.$ && !isDomNode ? $(this.videoBox) : this.videoBox;
        },

        runPlayer: function() {
            var self = this;

            if (self.isAdPlaying) {
                self.adSDK.resume();
            } else {
                self.play();
            }
        },

        stopPlayer: function() {
            var self = this;

            if (self.isAdPlaying) {
                self.adSDK.pause();
            } else {
                self.pause();
            }
        },

        triggerResizePlayer: function() {
            var self = this;
            self.resizeControls();

            if (self.handlerAdResize) {
                self.handlerAdResize();
            }
        },

        requestFullScreen: function() {
            var self = this;
            var elem = self.videoBox;

            if (elem.requestFullscreen) {
                return elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                return elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                return elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                return elem.msRequestFullscreen();
            } else {
                // Safari IOS doesnt support fullscreen API, so simulate it
                _dispatchEvent(elem,'fullscreenchange');
                _helpers.lockScrollBody();
                if (self.handlerAdResize) self.handlerAdResize();
                return Promise.resolve();
            }
        },

        exitFullScreen: function() {
            var self = this;
            var elem = self.videoBox;

            if (document.exitFullscreen) {
                return document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                return document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                return document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                return document.msExitFullscreen();
            } else {
                _dispatchEvent(elem, 'fullscreenchange');
                _helpers.unlockScrollBody();
                if (self.handlerAdResize) self.handlerAdResize();
                return Promise.resolve();
            }
        },

        sendCountersTarget: function(target) {
            var self = this;
            var list = self.counterTargets[target];

            if (!list) return;

            list.forEach(function(data) {
                switch (data.nick) {
                    case 'ym':
                        if (_yandexCounter) {
                            _yandexCounter.initReach(data.event, data.params, data.counterName);
                        }
                        break;

                    case 'ga':
                        if (_gaCounter) {
                            _gaCounter.exec(_gaCounter.getPrefix(data.counterName) + 'send', 'event', data.category, data.event);
                        }
                        break;

                    case 'custom':
                        // custom counters
                        if (!data.listCb) return;

                        if (!_helpers.isArray(data.listCb)) {
                            data.listCb = [data.listCb];
                        }

                        data.listCb.forEach(function(cb) {
                            var type = typeof cb;
                            if (type === 'string') {
                                (new Image()).src = cb;
                            } else if (type === 'function') {
                                cb();
                            }
                        });
                        break;

                    case 'rm':
                        // RBC.Metrika
                        if (data.event && data.group) {
                            var params = {};
                            var videoData = self.config.videoData;
                            var isAdEvent = _helpers.inArray(target, ['adRequest', 'adPlay', 'adError']);

                            if (document.referrer) {
                                params.referrer = document.referrer;
                            }

                            // extra video params
                            if (!self.config.live && !isAdEvent) {
                                if (self.video.currentTime || self.video.currentTime === 0) {
                                    params.currentTime = Math.floor(self.video.currentTime);
                                }

                                var duration = videoData.duration || self.video.duration;
                                if (duration) {
                                    params.duration = Math.floor(duration);
                                }

                                if (videoData.publishDate) {
                                    var parseTS = Number(videoData.publishDate);
                                    var ms = new Date(parseTS ? parseTS * 1000 : videoData.publishDate).getTime();
                                    if (!isNaN(ms)) {
                                        params.publishDate = ms;
                                    }
                                }

                                if (videoData.id) {
                                    params.videoId = videoData.id.toString();
                                }
                            }

                            RA.repo.rm.api('pushEvent', data.event, {type: 'Video', group: data.group}, params);
                        }
                        break;
                }
            });

            // send this target once
            switch (target) {
                case 'play':
                case 'end':
                case 'quarter':
                case 'half':
                case 'threeQuarter':
                    self.counterTargets[target] = null;
                    break;
            }
        },

        getVideoSize: function() {
            var self = this;

            return {
                w: (self.video.clientWidth || self.config.width),
                h: (self.video.clientHeight || self.config.height)
            }
        },

        destroy: function() {
            var self = this;

            if (!self.videoBox) return;

            if (self.adSDK) {
                self.adSDK.destroy();
                self.adSDK = null;
            }

            if (self.hls) {
                self.hls.destroy();
                self.hls = null;
            }

            if (_isFullscreenState) {
                self.exitFullScreen().then(function() {
                    self.handlerFullscreenchange();
                    self.videoBox.remove();
                    self.videoBox = null;
                });
            } else {
                self.videoBox.remove();
                self.videoBox = null;
            }

            window.removeEventListener('resize', self.handlerWindowResize);
        }
    });

    // Private static functions
    //
    function _autoplayCheck() {
        return new Promise(function(resolve) {
            new _videoAutoplay({
                autoplayChecksResolved: resolve,
                videoElement: null
            });
        });
    }

    function _formatTime(time) {
        if (!time) time = 0;

        var formatedTime = [];
        var hours = Math.floor(time / 3600 % 24);
        var minutes = Math.floor((time - hours * 3600) / 60);
        var sec = Math.floor(time % 60);

        var _format = function(val) {
            return val < 10 ? '0' + val : val;
        };

        if (hours) {
            formatedTime.push(_format(hours));
        }
        formatedTime.push(_format(minutes));
        formatedTime.push(_format(sec));

        return formatedTime.join(':');
    }

    function _dispatchEvent(elem, type) {
        var event = new Event(type);
        elem.dispatchEvent(event);
    }

    function _loadHLS() {
        var th = _loadHLS;
        if (th.promise) return th.promise;

        th.promise = new Promise(function(resolve, reject) {
            if (window.Hls) {
                resolve(window.Hls);
            } else {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = _HLS_SCRIPT_SRC;
                script.onload = script.onerror = function() {
                    if (window.Hls) {
                        resolve(window.Hls);
                    } else {
                        reject('Ошибка загрузки Hls');
                    }
                    th.promise = null;
                };
                document.body.appendChild(script);
            }
        });

        return th.promise;
    }

    function _logError(error) {
        if (error) {
            console.error('repo::video-player - ', error.message || error.error || error); // eslint-disable-line
        }
    }

    return VideoPlayer;
})();