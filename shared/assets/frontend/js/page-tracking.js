/* Console.log fix for old browsers */
(function() {
  if (!window.console) {
    window.console = {};
  }
  // union of Chrome, FF, IE, and Safari console methods
  var m = [
    "log", "info", "warn", "error", "debug", "trace", "dir", "group",
    "groupCollapsed", "groupEnd", "time", "timeEnd", "profile", "profileEnd",
    "dirxml", "assert", "count", "markTimeline", "timeStamp", "clear"
  ];
  // define undefined methods as noops to prevent errors
  for (var i = 0; i < m.length; i++) {
    if (!window.console[m[i]]) {
      window.console[m[i]] = function() {};
    }
  }
})();

/**
 * Lead Tracking JS
 * http://www.inboundnow.com
 */

var InboundAnalytics = (function () {

   var debugMode = true;

   var _privateMethod = function () {
      console.log('Run private');
   };


   var App = {
     init: function () {
          InboundAnalytics.PageTracking.StorePageView();
          InboundAnalytics.Events.loadEvents();
          InboundAnalytics.Utils.init();
          InboundAnalytics.Events.analyticsLoaded();
     },
     /* Debugger Function toggled by var debugMode */
     debug: function(msg,callback){
         //if app not in debug mode, exit immediately
         if(!debugMode || !console){return};
         var msg = msg || false;
         //console.log the message
         if(msg && (typeof msg === 'string')){console.log(msg)};

         //execute the callback if one was passed-in
         if(callback && (callback instanceof Function)){
           callback();
         };
     }
   };

   return App;

 })();


var InboundAnalyticsPageTracking = (function (InboundAnalytics) {

    InboundAnalytics.PageTracking = {

    getPageViews: function () {
        var local_store = InboundAnalytics.Utils.checkLocalStorage();
        if(local_store){
          var page_views = localStorage.getItem("page_views"),
          local_object = JSON.parse(page_views);
          if (typeof local_object =='object' && local_object) {
            this.StorePageView();
          }
          return local_object;
        }
    },
    StorePageView: function() {
          var timeout = this.CheckTimeOut();
          var pageviewObj = jQuery.totalStorage('page_views');
          if(pageviewObj === null) {
            pageviewObj = {};
          }
          var current_page_id = wplft.post_id;
          var datetime = wplft.track_time;

          if (timeout) {

              // If pageviewObj exists, do this
              var page_seen = pageviewObj[current_page_id];

              if(typeof(page_seen) != "undefined" && page_seen !== null) {
                  pageviewObj[current_page_id].push(datetime);
                  InboundAnalytics.Events.pageRevisit();
              } else {
                  pageviewObj[current_page_id] = [];
                  pageviewObj[current_page_id].push(datetime);
                  InboundAnalytics.Events.pageFirstView();
              }

              jQuery.totalStorage('page_views', pageviewObj);
          }
    },
    CheckTimeOut: function() {
        var PageViews = jQuery.totalStorage('page_views');
        if(PageViews === null) {
        var PageViews = {};
        }
        var page_id = wplft.post_id,
        pageviewTimeout = true, /* Default */
        page_seen = PageViews[page_id];
        if(typeof(page_seen) != "undefined" && page_seen !== null) {

            var time_now = wplft.track_time,
            vc = PageViews[page_id].length - 1,
            last_view = PageViews[page_id][vc],
            last_view_ms = new Date(last_view).getTime(),
            time_now_ms = new Date(time_now).getTime(),
            timeout_ms = last_view_ms + 30*1000,
            time_check = Math.abs(last_view_ms - time_now_ms),
            wait_time = 30000;

            InboundAnalytics.debug('Timeout Checks =',function(){
                 console.log('Current Time is: ' + time_now);
                 console.log('Last view is: ' + last_view);
                 console.log("Last view milliseconds " + last_view_ms);
                 console.log("time now milliseconds " + time_now_ms);
                 console.log("Wait Check: " + wait_time);
                 console.log("TIME CHECK: " + time_check);
            });

            //var wait_time = Math.abs(last_view_ms - timeout_ms) // output timeout time 30sec;

            if (time_check < wait_time){
              time_left =  Math.abs((wait_time - time_check)) * .001;
              pageviewTimeout = false;
              var status = '30 sec timeout not done: ' + time_left + " seconds left";
            } else {
              var status = 'Timeout Happened. Page view fired';
              this.firePageView();
              pageviewTimeout = true;
              InboundAnalytics.Events.analyticsTriggered();
            }

            InboundAnalytics.debug('',function(){
                 console.log(status);
            });
       }

       return pageviewTimeout;

    },
    firePageView: function() {
      var lead_id = InboundAnalytics.Utils.readCookie('wp_lead_id'),
      lead_uid = InboundAnalytics.Utils.readCookie('wp_lead_uid');

      if (typeof (lead_id) != "undefined" && lead_id != null && lead_id != "") {

        InboundAnalytics.debug('Run page view ajax');

        jQuery.ajax({
              type: 'POST',
              url: wplft.admin_url,
              data: {
                action: 'wpl_track_user',
                wp_lead_uid: lead_uid,
                wp_lead_id: lead_id,
                page_id: wplft.post_id,
                current_url: window.location.href,
                json: '0'
              },
              success: function(user_id){
                InboundAnalytics.Events.analyticsSaved();
              },
              error: function(MLHttpRequest, textStatus, errorThrown){
                  console.log(MLHttpRequest+' '+errorThrown+' '+textStatus);
                  InboundAnalytics.Events.analyticsError(MLHttpRequest, textStatus, errorThrown);
              }
          });
      }
    }
  }

    return InboundAnalytics;

})(InboundAnalytics || {});


/**
 * Utility functions
 * @param  Object InboundAnalytics - Main JS object
 * @return Object - include util functions
 */
var InboundAnalyticsUtils = (function (InboundAnalytics) {

    InboundAnalytics.Utils =  {
      init: function() {
          this.setUrlParams();
          this.SetUID();
          this.SetSessionTimeout();
          this.getReferer();
      },
      // Create cookie
      createCookie: function(name, value, days, custom_time) {
          var expires = "";
          if (days) {
              var date = new Date();
              date.setTime(date.getTime()+(days*24*60*60*1000));
              expires = "; expires="+date.toGMTString();
          }
          if(custom_time){
             expires = "; expires="+days.toGMTString();
          }
          document.cookie = name+"="+value+expires+"; path=/";
      },
      // Read cookie
      readCookie: function(name) {
          var nameEQ = name + "=";
          var ca = document.cookie.split(';');
          for(var i=0;i < ca.length;i++) {
              var c = ca[i];
              while (c.charAt(0) === ' ') {
                  c = c.substring(1,c.length);
              }
              if (c.indexOf(nameEQ) === 0) {
                  return c.substring(nameEQ.length,c.length);
              }
          }
          return null;
      },
      // Erase cookie
      eraseCookie: function(name) {
          createCookie(name,"",-1);
      },
      getAllCookies: function(){
              var cookies = {};
              if (document.cookie && document.cookie != '') {
                  var split = document.cookie.split(';');
                  for (var i = 0; i < split.length; i++) {
                      var name_value = split[i].split("=");
                      name_value[0] = name_value[0].replace(/^ /, '');
                      cookies[decodeURIComponent(name_value[0])] = decodeURIComponent(name_value[1]);
                  }
              }
              jQuery.totalStorage('inbound_cookies', cookies); // store cookie data
              return cookies;
      },
      /* Grab URL params and save */
      setUrlParams: function() {
          var urlParams = {},
          local_store = InboundAnalytics.Utils.checkLocalStorage();

            (function () {
              var e,
                d = function (s) { return decodeURIComponent(s).replace(/\+/g, " "); },
                q = window.location.search.substring(1),
                r = /([^&=]+)=?([^&]*)/g;

              while (e = r.exec(q)) {
                if (e[1].indexOf("[") == "-1")
                  urlParams[d(e[1])] = d(e[2]);
                else {
                  var b1 = e[1].indexOf("["),
                    aN = e[1].slice(b1+1, e[1].indexOf("]", b1)),
                    pN = d(e[1].slice(0, b1));

                  if (typeof urlParams[pN] != "object")
                    urlParams[d(pN)] = {},
                    urlParams[d(pN)].length = 0;

                  if (aN)
                    urlParams[d(pN)][d(aN)] = d(e[2]);
                  else
                    Array.prototype.push.call(urlParams[d(pN)], d(e[2]));

                }
              }
            })();

            if (JSON) {
                for (var k in urlParams) {
                  if (typeof urlParams[k] == "object") {
                    for (var k2 in urlParams[k])
                    this.createCookie(k2, urlParams[k][k2], 30);
                  } else {
                    this.createCookie(k, urlParams[k], 30);
                  }
                 }
            }

            if(local_store){
              var pastParams =  jQuery.totalStorage('inbound_url_params');
              var params = this.mergeObjs(pastParams, urlParams);
              jQuery.totalStorage('inbound_url_params', params); // store cookie data
            }
      },
      getUrlParams: function(){
          var local_store = this.checkLocalStorage(),
          get_params = {};
          if(local_store){
            var get_params =  jQuery.totalStorage('inbound_url_params');
          }
          return get_params;
      },
      // Check local storage
      checkLocalStorage: function() {
        if ('localStorage' in window) {
            try {
              ls = (typeof window.localStorage === 'undefined') ? undefined : window.localStorage;
              if (typeof ls == 'undefined' || typeof window.JSON == 'undefined'){
                supported = false;
              } else {
                supported = true;
              }

            }
            catch (err){
              supported = false;
            }
        }
        return supported;
      },
      /* Set Expiration Date of Session Logging */
      SetSessionTimeout: function(){
          var session_check = this.readCookie("lead_session_expire");
          console.log(session_check);
          if(session_check !== 'true'){
            InboundAnalytics.Events.sessionStart(); // trigger 'inbound_analytics_session_start'
          } else {
            InboundAnalytics.Events.sessionActive(); // trigger 'inbound_analytics_session_active'
          }
          var d = new Date();
          d.setTime(d.getTime() + 30*60*1000);
          this.createCookie("lead_session_expire", true, d, true); // Set cookie on page loads
      },
      getReferer: function(){
        //console.log(expire_time);
        var d = new Date();
        d.setTime(d.getTime() + 30*60*1000);
        var referrer_cookie = InboundAnalytics.Utils.readCookie("wp_lead_referral_site");
        if (typeof (referrer_cookie) === "undefined" || referrer_cookie === null || referrer_cookie === "") {
          var referrer = document.referrer || "NA";
          this.createCookie("wp_lead_referral_site", referrer, d, true); // Set cookie on page loads
        }
      },
      CreateUID: function(length) {
          var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split(''),
          str = '';
          if (! length) {
              length = Math.floor(Math.random() * chars.length);
          }
          for (var i = 0; i < length; i++) {
              str += chars[Math.floor(Math.random() * chars.length)];
          }
          return str;
      },
      SetUID:  function () {
       /* Set Lead UID */

       if(this.readCookie("wp_lead_uid") === null) {
          var wp_lead_uid =  this.CreateUID(35);
          this.createCookie("wp_lead_uid", wp_lead_uid );
          InboundAnalytics.debug('Set UID');
       }
      },
      mergeObjs:  function(obj1,obj2){
            var obj3 = {};
            for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
            for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
            return obj3;
      },

  };

  return InboundAnalytics;

})(InboundAnalytics || {});



/**
 * Event functions
 * @param  Object InboundAnalytics - Main JS object
 * @return Object - include event triggers
 */
 /* example:
 // trigger custom function on page view trigger
 window.addEventListener("inbound_analytics_triggered", fireOnPageViewTrigger, false);
 function fireOnPageViewTrigger(){
     alert("page view was triggered");
 }
 // trigger custom function on page first seen
 window.addEventListener("inbound_analytics_page_first_view", page_first_seen_function, false);
 function page_first_seen_function(){
     alert("This is the first time you have seen this page");
 }
 */
var InboundAnalyticsEvents = (function (InboundAnalytics) {

    InboundAnalytics.Events =  {
      // Create cookie
      loadEvents: function() {
          this.analyticsLoaded();
      },
      analyticsLoaded: function() {
          var loaded = new CustomEvent("inbound_analytics_loaded");
          window.dispatchEvent(loaded);
      },
      analyticsTriggered: function() {
          var triggered = new CustomEvent("inbound_analytics_triggered");
          window.dispatchEvent(triggered);
      },
      analyticsSaved: function() {
          var page_view_saved = new CustomEvent("inbound_analytics_saved");
          window.dispatchEvent(page_view_saved);
          console.log('Page View Saved');
      },
      analyticsError: function(MLHttpRequest, textStatus, errorThrown) {
          var error = new CustomEvent("inbound_analytics_error", {
            detail: {
              MLHttpRequest: MLHttpRequest,
              textStatus: textStatus,
              errorThrown: errorThrown
            }
          });
          window.dispatchEvent(error);
          console.log('Page Save Error');
      },
      pageFirstView: function() {
          var page_first_view = new CustomEvent("inbound_analytics_page_first_view");
          window.dispatchEvent(page_first_view);
          console.log('First Ever Page View of this Page');
      },
      pageRevisit: function() {
          var page_revisit = new CustomEvent("inbound_analytics_page_revisit");
          window.dispatchEvent(page_revisit);
          console.log('Page Revisit');
      },
      sessionStart: function() {
          var session_start = new CustomEvent("inbound_analytics_session_start");
          window.dispatchEvent(session_start);
          console.log('Session Start');
      },
      sessionActive: function() {
          var session_active = new CustomEvent("inbound_analytics_session_active");
          window.dispatchEvent(session_active);
          console.log('Session Active');
      },

  };

  return InboundAnalytics;

})(InboundAnalytics || {});


InboundAnalytics.init(); // run analytics


/* run on ready */
jQuery(document).ready(function($) {

  //record non conversion status
  var wp_lead_uid = InboundAnalytics.Utils.readCookie("wp_lead_uid");
  var wp_lead_id = InboundAnalytics.Utils.readCookie("wp_lead_id");
  //var data_block = jQuery.parseJSON(trackObj);
  var json = 0;
  var page_id = inbound_ajax.page_id;
  //console.log(page_id);

// Page view trigging moved to /shared/tracking/page-tracking.js

// Check for Lead lists
var expired = InboundAnalytics.Utils.readCookie("lead_session_list_check"); // check for session
if (expired != "true") {
  //var data_to_lookup = global-localized-vars;
  if (typeof (wp_lead_id) != "undefined" && wp_lead_id != null && wp_lead_id != "") {
    jQuery.ajax({
          type: 'POST',
          url: inbound_ajax.admin_url,
          data: {
            action: 'wpl_check_lists',
            wp_lead_id: wp_lead_id,

          },
          success: function(user_id){
              jQuery.cookie("lead_session_list_check", true, { path: '/', expires: 1 });
              console.log("Lists checked");
               },
          error: function(MLHttpRequest, textStatus, errorThrown){

            }

        });
    }
  }
/* end list check */

var expire_time = InboundAnalytics.Utils.readCookie("lead_session_expire"); //

});