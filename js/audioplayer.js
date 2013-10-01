/* ======================================
   audioplayer.js
   ===================================== */
/*JSLint*/
/*global window:true, console:true, DocumentTouch: true*/

(function (c$) {

    'use strict';

    var doc = window.document,
        a = doc.createElement('audio'),
        bAudio = a.canPlayType && (a.canPlayType('audio/mpeg') !== '' && a.canPlayType('audio/mpeg') !== 'no'),
        bTouch = window.ontouchstart !== undefined,
        sStartEvt = bTouch ? 'touchstart' : 'mousedown',
        sMoveEvt = bTouch ? 'touchmove' : 'mousemove',
        sEndEvt = bTouch ? 'touchend' : 'mouseup',
        Album,
        Track;
    
    // Helper
    function ucfirst(str) {
        return str.slice(0, 1).toUpperCase() + str.substring(1);
    }
    
    Album = function (id, data) {
        this.id = id;
        this.title = data.title;
        this.artist = data.artist;
        this.$wrapper = c$('#' + this.id);
        this.$control = c$('.album-control', this.$wrapper);
        this.$playlist = c$('.album-playlist', this.$wrapper);
        this.$playlistToggler = c$('.album-playlist-toggler', this.$wrapper);
        this.bPlaylistVisible = !this.$playlist.hasClass('hidden');
        this.bPlaying = false;
        this.iTrackNr = 0;
        this.aTracks = [];
        this.init();
    };
    
    Album.prototype = {
        instances: [],
        init: function () {
            var that = this;
            
            this.iIndex = this.instances.push(this) - 1;
                        
            this.initPlaylist();
            
            this.$playlistToggler.bind('click', function (e) {
                that.togglePlaylist();
            });
                        
            c$('.song-count', this.$wrapper).html(this.aTracks.length);
            
            c$('.album-title').html(this.title);
            
            c$('.album-artist').html(this.artist);
            
            this.$control.bind('click', function () {
                that.showPlaylist();
                return !that.bPlaying ? that.playTrack() : that.pauseTrack();
            });
        },
        playTrack: function () {
            this.aTracks[this.iTrackNr].play();
        },
        pauseTrack: function () {
            this.aTracks[this.iTrackNr].pause();
        },
        toggleControlIcon: function () {
            this.$control.removeClass((this.bPlaying ? 'play' : 'pause')).addClass((this.bPlaying ? 'pause' : 'play'));
        },
        togglePlaylist: function () {
            return this.bPlaylistVisible ? this.hidePlaylist() : this.showPlaylist();
        },
        initPlaylist: function () {
            var that = this;
            c$('.audio-wrapper', this.$wrapper).each(function (el, i) {
                that.aTracks[i] = new Track(this.id, this.dataset, that);
            });
        },
        showPlaylist: function () {
            if (!this.bPlaylistVisible) {
                this.$playlist.removeClass('hidden');
                this.bPlaylistVisible = true;
                this.$playlistToggler.addClass('up');
            }
        },
        hidePlaylist: function () {
            if (this.bPlaylistVisible) {
                this.$playlist.addClass('hidden');
                this.bPlaylistVisible = false;
                this.$playlistToggler.removeClass('up');
            }
        }
    };
    
    Track = function (id, data, album) {
        this.id = id;
        this.title = data.title;
        this.artist = data.artist;
        this.src = data.src;
        this.album = album || null;
        this.$wrapper = c$('#' + this.id);
        this.$duration = c$('.duration', this.$wrapper);
        this.$control = this.$progressBar = this.$player = this.audio = null;
        this.bPlaying = false;
        this.bLoadStarted = false;
        this.bPlayStarted = false;
        this.iIndex = 0;
        this.fDuration = 0;
        this.iLoadedPercent = 0;

        if (!bAudio) {
            console.log('No HTML5 audio support!');
            return;
        }
        
        this.init();
    };

    Track.prototype = {

        instances: [],

        init: function () {

            var that = this;
            
            // event listener for progress bar
            function adjustCurrentTime(e) {
                that.adjustCurrentTime(e);
            }

            this.iIndex = this.instances.push(this) - 1;

            this.createPlayer();

            this.audio = new window.Audio();

            this.audio.load(); // required for 'older' browsers
            
            this.audio.preload = 'metadata';

            this.audio.setAttribute('src', this.src);

            this.$control = c$('.audio-control', this.$wrapper).bind(sStartEvt, function (e) {
                return !that.bPlaying ? that.play() : that.pause();
            });

            this.$progressBar = c$('.audio-progress', this.$wrapper).bind(sStartEvt, function (e) {
                adjustCurrentTime(e);
                that.$progressBar.bind(sMoveEvt, adjustCurrentTime);
            });
            
            this.$player = c$('.audio-player', this.$wrapper);
            
            this.$duration = c$('.duration', this.$wrapper);
            
            this.$loaded = c$('.loaded', this.$wrapper);
            
            this.$progress = c$('.progress', this.$wrapper);
            
            this.$played = c$('.played', this.$wrapper);

            this.$progressBar.bind(sEndEvt, function () {
                that.$progressBar.unbind(sMoveEvt, adjustCurrentTime);
            });
            
            ['play', 'pause', 'ended', 'timeupdate', 'loadstart', 'loadedmetadata'].forEach(function (evtType) {
                var listener = 'on' + ucfirst(evtType);
                c$(that.audio).bind(evtType, function (e) {
                    that[listener]();
                });
            });
        },

        createPlayer: function () {
            this.$wrapper.html(
                '<div class="audio-player clearfix">' +
                    '<div class="audio-control">' +
                        '<div class="play-pause"></div>' +
                    '</div>' +
                    '<div class="audio-metadata clearfix">' +
                        '<div class="audio-title">dummy-title</div>' +
                        '<div class="audio-time">' +
                            '<span class="played">00:00</span>/<strong class="duration">00:00</strong>' +
                        '</div>' +
                        '<div class="audio-progress">' +
                            '<div class="progress-bg"></div>' +
                            '<div class="progress"></div>' +
                            '<div class="loaded"></div>' +
                        '</div>' +
                    '</div>' +
                    '</div>'
            );
        },

        onPlay: function () {
            this.$control.removeClass('play').addClass('pause');
            this.bPlaying = true;
            c$('.audio-player').removeClass('active');
            this.$player.addClass('active');
            if (this.album) {
                this.album.bPlaying = true;
                this.album.iTrackNr = this.iIndex;
                this.album.toggleControlIcon();
            }
            if (!this.started) {
                this.started = true;
            }
        },

        onPause: function () {
            this.$control.removeClass('pause').addClass('play');
            this.bPlaying = false;
            if (this.album) {
                this.album.bPlaying = false;
                this.album.toggleControlIcon();
            }
        },
        
        onEnded: function () {
            this.setCurrentTime(0);
            // play next track
            if (this.instances[this.iIndex + 1] !== undefined) {
                this.instances[this.iIndex + 1].play();
            }
        },

        onLoadstart: function () {
            if (!this.bLoadStarted) {
                this.bLoadStarted = true;
                var that = this;
                that.loadTimer = window.setInterval(function () {
                    that.setLoadedProgress();
                    //console.log('buffered ' + that.iLoadedPercent + '%');
                    if (that.iLoadedPercent >= 100) {
                        //console.log('buffering finished');
                        window.clearInterval(that.loadTimer);
                    }
                }, 200);
            }
        },

        onTimeupdate: function () {
            this.setPlayedProgress();
        },

        onLoadedmetadata: function () {
            this.setDuration();
        },

        setDuration: function () {
            if (!this.audio.duration) {
                return;
            }
            this.fDuration = this.audio.duration;
            var m = Math.floor(this.fDuration / 60),
                s = Math.ceil(this.fDuration % 60);
            this.$duration.html((m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
        },

        setLoadedProgress: function () {
            var durationLoaded = this.audio.buffered.end(this.audio.buffered.length - 1);
            this.iLoadedPercent = Math.ceil((durationLoaded / this.fDuration) * 100);
            this.$loaded.css('width: ' + this.iLoadedPercent + '%;');
        },

        setPlayedProgress: function () {
            var currentTime = this.audio.currentTime,
                playedPercent = (currentTime / this.audio.duration) * 100,
                m = Math.floor(currentTime / 60),
                s = Math.ceil(currentTime % 60);
            this.$progress.css('width: ' + playedPercent + '%;');
            this.$played.html((m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
        },

        adjustCurrentTime: function (e) {
            var evt = bTouch ? e.touches[0] : e,
                s = Math.round((this.audio.duration * (evt.pageX - this.$progressBar[0].offsetLeft)) / this.$progressBar[0].offsetWidth);
            this.setCurrentTime(s);
        },
        
        setCurrentTime: function (time) {
            this.audio.currentTime = time;
        },

        play: function () {
            this.pauseAll();
            if (!this.bPlaying) {
                this.audio.play();
            }
        },

        pause: function () {
            if (this.bPlaying) {
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