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
        supportAudio = a.canPlayType && (a.canPlayType('audio/mpeg') !== ''),
        Track,
        Album;
    
    // Helper
    function ucfirst(str) {
        return str.slice(0, 1).toUpperCase() + str.substring(1);
    }
    
    Album = function (id, data) {
        this.id = id;
        this.title = data.title;
        this.artist = data.artist;
        this.wrapper = c$('#' + this.id);
        this.control = c$('.album-control', this.wrapper);
        this.playlist = c$('.album-playlist', this.wrapper);
        this.playlistToggler = c$('.album-playlist-toggler', this.wrapper);
        this.toggleArrow = c$('.toggle-arrow', this.playlistToggler);
        this.playlistVisible = !this.playlist.hasClass('hidden');
        this.playing = false;
        this.trackIndex = 0;
        this.tracks = [];
        this.init();
    };
    
    Album.prototype = {
        instances: [],
        init: function () {
            var that = this;
            
            this.index = this.instances.push(this) - 1;
                        
            this.playlistToggler.bind('click', function (e) {
                that.togglePlaylist();
            });
            
            c$('.audio-wrapper', this.wrapper).each(function (el, i) {
                that.tracks[i] = new Track(this.id, this.dataset, that);
            });
            
            c$('.song-count', this.wrapper).html(this.tracks.length);
            
            c$('.album-title').html(this.title);
            
            c$('.album-artist').html(this.artist);
            
            this.control.bind('click', function () {
                that.showPlaylist();
                if (!that.playing) {
                    that.playTrack();
                } else {
                    that.pauseTrack();
                }
            });
        },
        playTrack: function () {
            this.tracks[this.trackIndex].play();
        },
        pauseTrack: function () {
            this.tracks[this.trackIndex].pause();
        },
        toggleControlIcon: function () {
            this.control.removeClass((this.playing ? 'play' : 'pause')).addClass((this.playing ? 'pause' : 'play'));
        },
        togglePlaylist: function () {
            if (this.playlistVisible) {
                this.hidePlaylist();
            } else {
                this.showPlaylist();
            }
        },
        showPlaylist: function () {
            if (!this.playlistVisible) {
                this.playlist.removeClass('hidden');
                this.playlistVisible = true;
                this.toggleArrow.addClass('up');
            }
        },
        hidePlaylist: function () {
            if (this.playlistVisible) {
                this.playlist.addClass('hidden');
                this.playlistVisible = false;
                this.toggleArrow.removeClass('up');
            }
        }
    };
    
    Track = function (id, data, album) {
        this.id = id;
        this.title = data.title;
        this.artist = data.artist;
        this.src = data.src;
        this.album = album || null;
        this.wrapper = c$('#' + this.id);
        this.playing = false;
        this.loadStarted = false;
        this.audio = null;
        this.control = null;
        this.progressBar = null;
        this.index = 0;
        this.duration = 0;
        this.loaded = 0;

        if (supportAudio) {
            this.init();
        } else {
            console.log('No HTML5 audio support!');
            return;
        }
    };

    Track.prototype = {

        instances: [],

        init: function () {

            var that = this,
                length;
            
            // event listener for progress bar
            function adjustCurrentTime(e) {
                that.adjustCurrentTime(e);
            }

            this.index = this.instances.push(this) - 1;

            this.createPlayer();

            this.audio = new window.Audio();

            this.audio.load(); // required for 'older' browsers
            
            this.audio.preload = 'metadata';

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
            
            this.player = c$('.audio-player', this.wrapper);

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
            c$('.audio-player').removeClass('active');
            this.player.addClass('active');
            if (this.album) {
                this.album.playing = true;
                this.album.trackIndex = this.index;
                this.album.toggleControlIcon();
            }
        },

        onPause: function () {
            this.control.removeClass('pause').addClass('play');
            this.playing = false;
            if (this.album) {
                this.album.playing = false;
                this.album.toggleControlIcon();
            }
        },
        
        onEnded: function () {
            this.setCurrentTime(0);
            // play next track
            if (this.instances[this.index + 1] !== undefined) {
                this.instances[this.index + 1].play();
            }
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
                }, 200);
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

    c$('.album').each(function (el, i) {
        window['album' + i] = new Album(this.id, this.dataset);
    });

}(window.c$));