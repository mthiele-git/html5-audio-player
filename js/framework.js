/** ### edited Mini Framework ### **/
(function() {
var document = window.document,
    wsRE = /\s/,        /** Regular Expression for whitespaces */
    c$,
    Query;

String.prototype.trim = function() { return this.replace(/^\s+|\s+$/g, ''); };

c$ = function (selector, context) {
    return new Query(selector, context);
};

Query = function (selector, context) {
    this.selector = selector;
    if (selector === document){ return this; }
    else if (selector instanceof Query){ return selector; }
    else{
        var result; 
        if (selector instanceof Element || selector === window){
            result = [selector];
        } else {
            /** Regular Expression for CSS IDs */
            result = (/^#/.test(selector) ? c$.byId(selector.substr(1)) : c$.qsa(selector, context));
        }
        this.length = result.length;
        for (var i=0; i < this.length; i++) {
            this[i] = result[i];
        }
        return this;
    }
};

c$.qsa = function (selector, context){
    context = context || document;
    if (context.length === 1){ context = context[0] };
    return [].slice.call(context.querySelectorAll(selector));
};

c$.byId = function(id){
        return [document.getElementById(id)];
};

c$.ajaxGet = function(url, success) {
    return c$.ajax({
        url: url,
        success: success
    });
};

c$.ajaxJSON = function(url, data, success) {
    if (typeof (data) === "function") {
        success = data;
        data = {};  
    }
    return c$.ajax({
        url: url,
        data: data,
        success: success,
        dataType: "json"
    });
};

c$.ajax = function (options) {  
    
    // Create a new XMLHttpRequest instance 
    var xhr = new window.XMLHttpRequest();
    
    // Empty function, used as default callback
    var empty = function () {};
    
    // Function to convert parameter, stored in an object => returns a string
    var param = function (obj, prefix) {
        var str = [];
        for (var p in obj) {
            var k = prefix ? prefix + "[" + p + "]" : p, 
            v = obj[p];
            str.push((v instanceof Object) ? param(v, k) : (k) + "=" + encodeURIComponent(v));
        }
        return str.join("&");
    };
        
    var defaultSettings = {
            type: 'GET',
            async: true,
            beforeSend: empty,
            success: empty,
            error: empty,
            complete: empty,
            context: undefined,
            // Data types mapping
            dataTypes: {
              json:   'application/json',
              xml:    'application/xml, text/xml',
              script: 'text/javascript, application/javascript',
              html:   'text/html',
              text:   'text/plain'
            },
            timeout: 0
    };
        
    try {
        var settings = options || {}, abortTimeout;
        
        for (var key in defaultSettings) {
            if (!settings[key]) {
                settings[key] = defaultSettings[key];
            }  
        }
        
        // Get the context for callbacks
        var context = settings.context; 
        
        settings.url = settings.url || window.location;
        settings.data = (settings.data instanceof Object) ? c$.param(settings.data) : settings.data;
        
        if (settings.type.toLowerCase() === "get" && settings.data) {
            if (settings.url.indexOf("?") === -1) {
                settings.url += "?" + settings.data;
            }  
            else {
                settings.url += "&" + settings.data;
            }
        }
        
        settings.dataType = (settings.dataType) ? settings.dataTypes[settings.dataType] : "text/html";
        settings.contentType = settings.contentType || 'application/x-www-form-urlencoded';
        settings.headers = settings.headers || {'X-Requested-With': 'XMLHttpRequest'};
        settings.headers['Content-Type'] = settings.contentType;     

        xhr.onreadystatechange = function () {
            // xhr.DONE => 4
            // xhr.LOADING => 3
            // xhr.HEADERS_RECEIVED => 2
            // xhr.OPENED => 1
            // xhr.UNSENT => 0          
            if (xhr.readyState === xhr.DONE) {
                clearTimeout(abortTimeout);
                var result, error = false;
                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
                    if (settings.dataType === 'application/json' && !(/^\s*$/.test(xhr.responseText))) {
                        try {
                            result = JSON.parse(xhr.responseText);
                        } 
                        catch (e) {
                            error = e;
                        }
                    } 
                    else {
                        result = xhr.responseText;
                    }     
                    if (error) {
                        settings.error.call(context, xhr, 'parsererror', error);
                    } 
                    else {
                        settings.success.call(context, result, 'success', xhr);
                    }
                } 
                else {
                    error = true;
                    settings.error.call(context, xhr, 'error');
                }
                settings.complete.call(context, xhr, error ? 'error' : 'success');
            }
        };
        
        // Open the connection
        xhr.open(settings.type, settings.url, settings.async);
                
        for (var name in settings.headers) {
            xhr.setRequestHeader(name, settings.headers[name]);
        }
        
        if (settings.beforeSend.call(context, xhr, settings) === false) {
            xhr.abort();
            return false;
        }
        
        if (settings.timeout > 0) {
            abortTimeout = setTimeout(function() {
                xhr.onreadystatechange = empty;
                xhr.abort();
                settings.error.call(context, xhr, 'timeout');
            }, settings.timeout);
        }
        
        // Send the request
        xhr.send(settings.data);
         
        // Store in c$
        c$.xhr = xhr;
        c$.xhr.settings = settings;
        
        return xhr;
    } 
    catch (e) {
        console.log(e);
    }
};

getDeviceInfo = function(){
    var ua = navigator.userAgent.toLowerCase(), dev = {};
    dev.width = document.body.clientWidth;
    if (a = ua.match(/(android)\s+([\d.]+)/)) dev.android = a[2];
    else if (a = ua.match(/(ipod).*os\s([\d_]+)/)) dev.ios = a[2].replace(/_/g, '.'), dev.ipod = true;
    else if (a = ua.match(/(ipad).*os\s([\d_]+)/)) dev.ios = a[2].replace(/_/g, '.'), dev.ipad = true;
    else if (a = ua.match(/(iphone\sos)\s([\d_]+)/)) dev.ios = a[2].replace(/_/g, '.'), dev.iphone = true;
    if (b = /webkit/i.test(ua)) dev.webkit = true, dev.jspre='webkit', dev.csspre='-webkit-', dev.transitionEnd='webkitTransitionEnd';
    else if (b = /firefox/i.test(ua)) dev.firefox = true, dev.jspre='Moz', dev.csspre='-moz-', dev.transitionEnd='transitionend';
    else if (b = /opera/i.test(ua)) dev.opera = true, dev.jspre='O', dev.csspre='-o-', dev.transitionEnd='oTransitionEnd';
    else if (b = /msie/i.test(ua)) dev.ie = true, dev.jspre='ms', dev.csspre='-ms-';
    else dev.jspre = dev.csspre= '';
    if (typeof WebKitCSSMatrix != 'undefined' && new WebKitCSSMatrix().hasOwnProperty('m41')) dev.support3d = true;
    return dev;
};

c$.device = getDeviceInfo();

Query.prototype = c$.fn = {
    first: function(){ return this[0]},
    each: function(callback) {
            for (var i = 0, l = this.length; i < l; ++i) {
                if (callback.call(this[i], this[i], i, this) === false)
                break;
            }
            return this;
    },
    
    /** html:  
     *  - sets or gets the innerHTML values of selected elements
     * */
    html: function(html){
            var result=[];
            if(html === undefined){
                this.each(function(el){result.push(el.innerHTML);});
            } else {
                result = this.each(function(item){item.innerHTML = html});
            }
            return result;
    },
    
    /** css:
     *  - sets the values of CSS properties
     *  - arguments: 
     *    cssString: string => CSS-Code (e.g. "display:block;color:red;")
     **/
    css: function(cssString){
            return this.each(function(){this.style.cssText += ';' + cssString});
    },
    
    /** translate:
     *  - specifies a 3D or 2D CSS-transform
     *  - arguments: 
     *    x: int => x-value
     *    y: int => y-value
     *    z: int => z-value
     *    duration: string => duration (in ms) (e.g. "700")
     *    timingfn: string => transition timing function (e.g. "ease-in-out", "ease-out" or "cubic-bezier(0,0,0.25,1)")    
     **/
    translate: function(x, y, z, duration, timingfn){
                    return this.each(function (el){
                        el.style[c$.device.jspre + 'TransitionProperty'] = c$.device.csspre + 'transform';
                        el.style[c$.device.jspre + 'TransitionDuration'] = duration ? duration + 'ms' : '';
                        el.style[c$.device.jspre + 'TransitionTimingFunction'] = timingfn || '';
                        
                        if(c$.device.support3d && !c$.device.android){
                            el.style.webkitTransform = 'translate3d(' + x + 'px,' + (y || 0) + 'px,' + (z || 0) + 'px)';
                        } else {
                            el.style[c$.device.jspre + 'Transform'] = 'translate(' + x + 'px,' + (y || 0) + 'px)';
                        }
                    });
    },
    
    /** bind:
     *  - shortcut for the addEventListener-method
     *  - registers a single event listener on a single target
     *  - arguments:
     *    type: string = > event type to listen for (e.g "touchmove")
     *    listener: object or function 
     *              => function which will be executed when an event of the specified type occurs. 
     *              => object implementing EventListener-Interface which calls its handleEvent-method whenever an event of the specified type occurs.
     *    capture: 
     *      
     **/
    bind: function (type, listener, capture) {
                return this.each(function () {
                    if(window.attachEvent){
                        this.attachEvent("on" + type, listener);
                    }
                    else{
                        this.addEventListener(type, listener, capture || false); 
                    }
                });
    },
    /** unbind:
     *  - shortcut for the removeEventListener-method
     *  - removes a single event listener from a single event target
     *  - arguments:
     *    type: string = > event type to be removed (e.g "touchmove")
     *    listener: object or function to be removed
     *    capture: 
     **/
    unbind: function (type, listener, capture) {
                return this.each(function () {
                    if(window.detachEvent){
                        this.attachEvent("on" + type, listener);
                    }
                    else{
                        this.removeEventListener(type, listener, capture || false); 
                    }
                });     
    },
    show: function(value){ return (value) ? this.css('display:' + value + ';') : this.css('display:block;') },
    hide: function(){ return this.css('display:none;') },
    
    /** newElement:
     *  - creates a new element
     *  - arguments: 
     *    name: string => name of the html-element (e.g. "div", "a", "ul", "span", ...)
     *    attributes: object => attribute name/s and value/s (e.g. {'class':'paging','data':'pages'})
     *    html: string => innerHTML value (e.g. "<p>hallo</p>" or any text)
     *        
     *    e.g.: var paging = c$('document').newElement('div', {'class':'paging'}, '1234');
     * */
    newElement: function(name, attributes, html) {
                    var el = document.createElement(name);
                    for (var i in attributes){
                            el.setAttribute(i,attributes[i]);
                    }
                    el.innerHTML = html || '';
                    return c$(el);
    },
    
    /** insetBefore:
     *  c$('#content').insertBefore(newEl, refEl);
     * */
    insertBefore: function(newEl, refEl){
        return this.each(function(){this.insertBefore(newEl[0], refEl[0])});
    },
    
    /** append:
     *  var new_el = c$('document').newElement('div', {'class':'paging'}, '1234');
     *  c$('#content').append(new_el)
     * */
    append: function(child) {
                return this.each(function(){this.appendChild(child[0])});
    },
    
    /** hasClass:
     *  - returns true if the selected element has the given css classname
     *  - e.g.: c$('#content').hasClass('padding')
     * */
    hasClass: function(name){
                return new RegExp('(^|\\s)' + name + '(\\s|$)').test(this[0].className);
                
                
                //new RegExp('(^|\\s)' + name + '(\\s|$)')
    },
    
    /** addClass:
     *  - adds css classnames to selected elements if they doesn't already exists
     *  - e.g.: c$('#content').addClass('active padding')
     * */
    addClass: function(classnames){
                return this.each(function() {
                    var classes = [];
                    classnames = classnames.split(wsRE);
                    classnames.forEach(function(classname) {
                        if (!c$(this).hasClass(classname)) {
                            classes.push(classname);
                        }
                    });
                    this.className += (this.className ? " " : "") + classes.join(" ");
                })
    },
    
    /** removeClass:
     *  - removes css classnames from selected elements
     *  - e.g.: c$('#content').removeClass('active padding')
     * */
    removeClass: function(classnames){  
                  return this.each(function() {
                      var classes = this.className;
                      var remClasses = classnames.split(wsRE);
                      remClasses.forEach(function(name){
                          if(re = new RegExp('(^|\\s)' + name + '(\\s|$)').test(classes)){
                              classes = classes.replace(name, " ");
                          }  
                      });
                      this.className = classes.trim();
                  })
    },
    
    /** toggleClass:
     *  - adds or removes a css classname from selected element
     *  - e.g.: c$('#content').toggleClass('active padding')
     * */
    toggleClass: function(classname){
                  return this.each(function(){
                    c$(this).hasClass(classname) ? c$(this).removeClass(classname) : c$(this).addClass(classname);
                  });
    },
    
    /** metrics:
     *  - returns the metrics (width,height) and position (left,top) of a selected element
     *  - e.g.: c$('#content').metrics()
     * */
    metrics: function(){
        var el = this[0].getBoundingClientRect();
        return {
          left: el.left + document.body.scrollLeft,
          top: el.top + document.body.scrollTop,
          width: el.width,
          height: el.height
        };
    },
    
     /** height:
     *  - returns the height of a selected element
     *  - e.g.: c$('#content').height()
     * */
    height: function(){
                return c$(this).metrics().height;
    },
    
    /** width:
     *  - returns the width of a selected element
     *  - e.g.: c$('#content').width()
     * */
    width: function(){
                return c$(this).metrics().width;
    }
};

c$.newEl = c$.fn.newElement;

/** Expose c$ to the world */
window.c$ = c$;
})();
/** ### END of Mini Framework ### **/