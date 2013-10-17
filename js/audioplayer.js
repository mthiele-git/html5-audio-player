/* ======================================
   audioplayer.js
   ===================================== */
/*JSLint*/
/*global window:true, console:true*/

(function (c$) {

    'use strict';

    var doc = window.document,
        bLogging = true,
        os = c$.device,
        a = doc.createElement('audio'),
        bAudio = a.canPlayType && (a.canPlayType('audio/mpeg') !== '' && a.canPlayType('audio/mpeg') !== 'no'),
        bTouch = window.ontouchstart !== undefined,
        sStartEvt = bTouch ? 'touchstart' : 'mousedown',
        sMoveEvt = bTouch ? 'touchmove' : 'mousemove',
        sEndEvt = bTouch ? 'touchend' : 'mouseup',
        aAudioEvents = [
            // http://www.w3schools.com/tags/ref_av_dom.asp
            'abort', //Fires when the loading of an audio/video is aborted
            'canplay', //Fires when the browser can start playing the audio/video
            'canplaythrough', //Fires when the browser can play through the audio/video without stopping for buffering
            'durationchange', //Fires when the duration of the audio/video is changed
            'emptied', //Fires when the current playlist is empty
            'ended', //Fires when the current playlist is ended
            'error', //Fires when an error occurred during the loading of an audio/video
            'loadeddata', //Fires when the browser has loaded the current frame of the audio/video
            'loadedmetadata', //Fires when the browser has loaded meta data for the audio/video
            'loadstart', //Fires when the browser starts looking for the audio/video
            'pause', //Fires when the audio/video has been paused
            'play', //Fires when the audio/video has been started or is no longer paused
            'playing', //Fires when the audio/video is ready to play after having been paused or stopped for buffering
            'progress', //Fires when the browser is downloading the audio/video
            'ratechange', //Fires when the playing speed of the audio/video is changed
            'seeked', //Fires when the user is finished moving/skipping to a new position in the audio/video
            'seeking', //Fires when the user starts moving/skipping to a new position in the audio/video
            'stalled', //Fires when the browser is trying to get media data, but data is not available
            'suspend', //Fires when the browser is intentionally not getting media data
            'timeupdate', //Fires when the current playback position has changed
            'volumechange', //Fires when the volume has been changed
            'waiting' //Fires when the video stops because it needs to buffer the next frame
        ],
        Album,
        Track;
    
    // Helper
    function ucfirst(str) {
        return str.slice(0, 1).toUpperCase() + str.substring(1);
    }

    function logInfo(str, param) {
        if (!bLogging) {
            return;
        } else if (param !== undefined) {
            return console.log(str, param);
        } else {
            return console.log(str);
        }
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

            // initialize tracks in the playlist
            this.initPlaylist();

            // set amount of tracks
            c$('.song-count', this.$wrapper).html(this.aTracks.length);
            
            // set album title
            c$('.album-title').html(this.title);
            
            // set album artist
            c$('.album-artist').html('by ' + this.artist);
            
            // add touch/click listeners for showing, hiding & playing the playlist
            this.$control.bind('click', function () {
                that.showPlaylist();
                return !that.bPlaying ? that.playTrack() : that.pauseTrack();
            });
            this.$playlistToggler.bind('click', function (e) {
                that.togglePlaylist();
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
        this.length = data.length;
        this.bDownloadable = (data.download === 'true');
        this.album = album || null;
        this.$wrapper = c$('#' + this.id);
        this.$wrapper[0].removeAttribute('data-src');
        this.audio = null;
        this.error = null;
        this.bPlaying = false;
        this.bWaiting = false;
        this.bPlayStarted = false;
        this.bCanPlay = false;
        this.iIndex = 0;
        this.fDuration = 0;
        this.iLoadedPercent = 0;

        if (!bAudio) {
            logInfo('No HTML5 audio support!');
            return;
        }
        
        this.init();
    };

    Track.prototype = {

        instances: [],

        init: function () {

            var that = this;
            
            // set track playlist index
            this.iIndex = this.instances.push(this) - 1;

            // create player markup
            this.createPlayer();

            // init audio element
            this.initAudio();
        },

        initAudio: function () {
            
            var that = this;
            
            // create new Audio object
            this.audio = new window.Audio();
            
            // set preload option 
            this.audio.preload = 'none';

            // set track source
            this.audio.setAttribute('src', this.src);
            logInfo(that.id + ' audio src: ' + this.src);
            
            // add audio listeners for specified events
            ['play', 'playing', 'waiting', 'pause', 'ended', 'error', 'timeupdate', 'loadstart', 'loadedmetadata', 'seeking', 'seeked'].forEach(function (evtType) {
                var listener = 'on' + ucfirst(evtType);
                c$(that.audio).bind(evtType, function (e) {
                    that[listener](e);
                });
            });
            
            // debug audio events
            if (bLogging) {
                aAudioEvents.forEach(function (evtType) {
                    c$(that.audio).bind(evtType, function (e) {
                        if (evtType !== 'timeupdate') {
                            logInfo(that.id + ' audio event: ' + evtType);
                        }
                    });
                });
            }
        },
        
        createPlayer: function () {

            this.$player = c$.newEl('div', {'class': 'audio-player clearfix'},
                '<div class="audio-control">' +
                    '<div class="ic-play-pause"></div>' +
                '</div>' +
                '<div class="audio-metadata clearfix">' +
                    '<div class="audio-title">' + this.title + (this.artist !== '' ? '<br/>by ' + this.artist : '') + '</div>' +
                    '<div class="audio-time">' +
                        '<span class="played">00:00</span>/<strong class="duration">00:00</strong>' +
                    '</div>' +
                    '<div class="audio-progress">' +
                        '<div class="progress-bg"></div>' +
                        '<div class="progress"></div>' +
                        '<div class="loaded"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="audio-download">' +
                    (os.ios ? '<div class="ic-mail"></div>' : '<a class="ic-download" href="" download="' + this.artist + ' - ' + this.title + '.mp3" target="_blank"></a>') +
                '</div>');
            
            this.$wrapper.append(this.$player);
            
            // get player elements
            this.$duration = c$('.duration', this.$player);
            this.$loaded = c$('.loaded', this.$player);
            this.$progress = c$('.progress', this.$player);
            this.$played = c$('.played', this.$player);
            this.$progressBar = c$('.audio-progress', this.$player);
            this.$control = c$('.audio-control', this.$player);
            this.$title = c$('.audio-title', this.$player);
            
            this.addPlayerEventListeners();
        },
        
        addPlayerEventListeners: function () {
                        
            var that = this;
            
            // event listener for progress bar
            function adjustCurrentTime(e) {
                that.adjustCurrentTime(e);
            }
            
            // add touch/click listeners
            this.$control.bind(sStartEvt, function (e) {
                return !that.bPlaying ? that.play() : that.pause();
            });
            
            this.$progressBar.bind(sStartEvt, function (e) {
                adjustCurrentTime(e);
                that.$progressBar.bind(sMoveEvt, adjustCurrentTime);
            });
            
            this.$progressBar.bind(sEndEvt, function () {
                that.$progressBar.unbind(sMoveEvt, adjustCurrentTime);
            });
            
            if (this.bDownloadable && !os.ios) {
                c$('.ic-download', this.$wrapper).bind(sStartEvt, function (e) {
                    this.href = that.src;
                    return true;
                });
            }
        },

        onPlay: function (e) {
            if (!this.bPlayStarted) {
                this.bPlayStarted = true;
            }
        },
        
        onPlaying: function (e) {
            this.$control.removeClass('play waiting').addClass('pause');
            this.bPlaying = true;
            this.bWaiting = false;
            if (this.album) {
                this.album.bPlaying = true;
                this.album.iTrackNr = this.iIndex;
                this.album.toggleControlIcon();
            }
        },
        
        onWaiting: function () {
            this.bWaiting = true;
            this.$control.removeClass('play pause').addClass('waiting');
        },

        onPause: function (e) {
            this.$control.removeClass('pause waiting').addClass('play');
            this.bPlaying = false;
            if (this.album) {
                this.album.bPlaying = false;
                this.album.toggleControlIcon();
            }
        },
        
        onSeeking: function (e) {
            //this.pause();
        },
        
        onSeeked: function (e) {
            //this.play();
        },
        
        onEnded: function (e) {
            this.setCurrentTime(0);
            // play next track
            if (this.instances[this.iIndex + 1] !== undefined) {
                this.instances[this.iIndex + 1].play();
            }
        },
        
        onError: function (e) {
            this.error = e.target.error;
            var msg = 'Audio Error: ';

            switch (this.error.code) {
            case this.error.MEDIA_ERR_ABORTED:
                msg += 'MEDIA_ERR_ABORTED';
                break;
            case this.error.MEDIA_ERR_NETWORK:
                msg += 'MEDIA_ERR_NETWORK';
                break;
            case this.error.MEDIA_ERR_DECODE:
                msg += 'MEDIA_ERR_DECODE';
                break;
            case this.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                msg += 'MEDIA_ERR_SRC_NOT_SUPPORTED';
                break;
            default:
                msg += 'An unknown error occurred.';
                break;
            }
            logInfo(this.src);
            logInfo(msg);
        },

        onLoadstart: function (e) {
            var that = this,
                timer,
                buffered,
                tmp,
                loaded = -1;

            timer = window.setInterval(function () {
                
                buffered = (that.audio.buffered.length > 0) ? that.audio.buffered.end(that.audio.buffered.length - 1) : null;
                
                if (buffered) {
                    tmp = Math.floor((buffered / that.fDuration) * 100);
                    if (tmp > loaded) {
                        loaded = Math.floor((buffered / that.fDuration) * 100);
                        that.setLoadedProgress(loaded);
                        logInfo(that.id + ' buffered ' + loaded + '%');
                    }
                }
                if (loaded >= 100) {
                    //logInfo('buffering finished');
                    window.clearInterval(timer);
                }
            }, 400);
        },

        onTimeupdate: function (e) {
            this.setPlayedProgress();
        },

        onLoadedmetadata: function (e) {
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

        setLoadedProgress: function (percent) {
            this.$loaded.css('width: ' + percent + '%;');
        },

        setPlayedProgress: function () {
            var currentTime = this.audio.currentTime,
                playedPercent = (currentTime / this.audio.duration) * 100,
                m = Math.floor(currentTime / 60),
                s = Math.ceil(currentTime % 60);
            this.$progress.css('width: ' + playedPercent + '%;');
            this.$played.html((m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
        },
        
        setCurrentTime: function (time) {
            if (this.audio.currentTime) {
                this.audio.currentTime = time;
            }
        },
        
        adjustCurrentTime: function (e) {
            var evt = bTouch ? e.touches[0] : e,
                s = Math.round((this.audio.duration * (evt.pageX - this.$progressBar[0].offsetLeft)) / this.$progressBar[0].offsetWidth);
            this.setCurrentTime(s);
        },

        play: function () {
            this.pauseAll();
            this.$player.addClass('active');
            if (!this.bPlaying) {
                this.audio.play();
            }
            if (this.bWaiting) {
                this.reload();
            }
        },

        pause: function () {
            this.$player.removeClass('active');
            this.$control.removeClass('waiting');
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
        },
        
        reload: function () {
            logInfo(this.id + ' reload ' + this.src);
            this.$player.removeClass('active');
            this.audio.src = this.src;
            this.bWaiting = false;
        }
    };

    c$('.album').each(function (el, i) {
        window['album' + i] = new Album(this.id, this.dataset);
    });

}(window.c$));