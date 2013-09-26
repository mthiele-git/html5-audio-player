/* ======================================
   audioplayer.js
   ===================================== */
/*JSLint*/
/*global window:true, console:true, DocumentTouch: true*/

(function (c$) {

    'use strict';

    var document = window.document,
        isTouch = window.ontouchstart !== undefined,
        startEvt = isTouch ? 'touchstart' : 'mousedown',
        moveEvt = isTouch ? 'touchmove' : 'mousemove',
        endEvt = isTouch ? 'touchend' : 'mouseup',
        cancelEvt = isTouch ? 'touchcancel' : 'mouseup',
        a = document.createElement('audio'),
        supportAudio = a.canPlayType && (a.canPlayType('audio/mpeg') !== '');

    function ucfirst(str) {
        return str.slice(0, 1).toUpperCase() + str.substring(1);
    }

    function TRACK(trackId, audioSrc) {
        this.id = trackId;
        this.src = audioSrc;
        this.wrapper = c$('#' + trackId);
        this.playing = false;
        this.loadStarted = false;
        this.audio = null;
        this.control = null;
        this.progressBar = null;
        this.duration = 0;
        this.loaded = 0;

        if (supportAudio) {
            this.init();
        } else {
            console.log('No HTML5 audio support!');
            return;
        }
    }

    TRACK.prototype = {

        instances: [],

        init: function () {

            var that = this;
            
            function adjustCurrentTime(e) {
                that.adjustCurrentTime(e);
            }

            this.instances.push(this);

            this.createPlayer();

            this.audio = new window.Audio();

            this.audio.load(); // required for 'older' browsers

            this.audio.setAttribute('src', this.src);

            ['play', 'pause', 'ended', 'timeupdate', 'loadstart', 'durationchange'].forEach(function (evtType) {
                var listener = 'on' + ucfirst(evtType);
                c$(that.audio).bind(evtType, function (e) {
                    that[listener]();
                });
            });

            this.control = c$('.audio-control', this.wrapper).bind(startEvt, function (e) {
                if (!that.playing) {
                    that.play();
                } else {
                    that.pause();
                }
            });

            this.progressBar = c$('.audio-progress', this.wrapper).bind(startEvt, function (e) {
                adjustCurrentTime(e);
                that.progressBar.bind(moveEvt, adjustCurrentTime);
            });

            this.progressBar.bind(endEvt, function () {
                that.progressBar.unbind(moveEvt, adjustCurrentTime);
            });
        },

        createPlayer: function () {
            this.wrapper.html(
                '<div class="audio-player">' +
                    '<div class="audio-control play"></div>' +
                    '<div class="audio-progress">' +
                        '<div class="progress"></div>' +
                        '<div class="loaded"></div>' +
                    '</div>' +
                    '<div class="audio-time">' +
                        '<span class="played">00:00</span>/<strong class="duration">00:00</strong>' +
                    '</div>' +
                    '</div>'
            );
        },

        onPlay: function () {
            this.control.removeClass('play').addClass('pause');
            this.playing = true;
        },

        onPause: function () {
            this.control.removeClass('pause').addClass('play');
            this.playing = false;
        },
        
        onEnded: function () {
            this.setCurrentTime(0);
        },

        onLoadstart: function () {
            if (!this.loadStarted) {
                this.loadStarted = true;
                var that = this;
                that.loadTimer = window.setInterval(function () {
                    that.setLoadedProgress();
                    //console.log('buffered ' + that.loadedPercent + '%');
                    if (that.loadedPercent >= 100) {
                        //console.log('buffering finished');
                        window.clearInterval(that.loadTimer);
                    }
                }, 250);
            }
        },

        onTimeupdate: function () {
            this.setPlayedProgress();
        },

        onDurationchange: function () {
            this.setDuration();
        },

        setDuration: function () {
            if (!this.audio.duration) {
                return;
            } else {
                this.duration = this.audio.duration;
            }
            var m = Math.floor(this.duration / 60),
                s = Math.ceil(this.duration % 60);
            c$('.duration', this.wrapper).html((m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
        },

        setLoadedProgress: function () {
            var durationLoaded = this.audio.buffered.end(this.audio.buffered.length - 1);
            this.loadedPercent = Math.ceil((durationLoaded / this.duration) * 100);
            c$('.loaded', this.wrapper).css('width: ' + this.loadedPercent + '%;');
        },

        setPlayedProgress: function () {
            var currentTime = this.audio.currentTime,
                playedPercent = Math.ceil((currentTime / this.audio.duration) * 100),
                m = Math.floor(currentTime / 60),
                s = Math.ceil(currentTime % 60);
            c$('.progress', this.wrapper).css('width: ' + playedPercent + '%;');
            c$('.played', this.wrapper).html((m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
        },

        adjustCurrentTime: function (e) {
            var evt = isTouch ? e.touches[0] : e,
                s = Math.round((this.audio.duration * (evt.pageX - this.progressBar[0].offsetLeft)) / this.progressBar[0].offsetWidth);
            this.setCurrentTime(s);
        },
        
        setCurrentTime: function (time) {
            this.audio.currentTime = time;
        },

        play: function () {
            this.pauseAll();
            if (!this.playing) {
                this.audio.play();
            }
        },

        pause: function () {
            if (this.playing) {
                this.audio.pause();
            }
        },

        stop: function () {
            this.audio.pause();
            this.setCurrentTime(0);
        },

        pauseAll: function () {
            this.instances.forEach(function (track) {
                track.pause();
            });
        }
    };

    c$('.audio-wrapper').each(function (el, i) {
        window['track' + i] = new TRACK(this.id, this.dataset.audioSrc);
    });

    window.AUDIOPLAYER = TRACK.prototype.instances;

}(window.c$));