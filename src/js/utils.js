import _ from "lodash";
import config from "config";
const { shouldDebug, debugDisabledModules } = config;

export default function({from} = {}) {
  const dQ = (arg) => document.querySelector(arg);
  const dQAll = (arg) => document.querySelectorAll(arg);
  function _d(method, args) {
    (shouldDebug && !debugDisabledModules.includes(from)) && console[method].apply(undefined, [from, ...args]);
  }
  function debug() {
    return _d("log", arguments);
  }
  function debugWarn() {
    return _d("warn", arguments);
  }
  function debugErr() {
    return _d("error", arguments);
  }
  function debugAll() {
    console.log.apply(undefined, arguments);
  }
  return {
    debug,
    debugErr,
    debugAll,
    bindEl: ({className}) => {
      const el = document.querySelector(`.${className}`);
      if (el) {
        el.hide = function() {
          el.style.display = "none";
        }
        el.show = function(display = "inline") {
          el.style.display = display;
        }
      }
      else {
        debugErr(`Could not load ${className}`);
      }
      return el;
    },
    updateClasses: (domBinding, elClassName, classes = []) => {
        const el = _.get(domBinding, elClassName);
        if (el) el.className = `${elClassName} `.concat(classes.join(" "));
    },
    isMobileUserAgent: () => {
      let check = false;
      (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
      const mediaMet = window.matchMedia(`(max-width: ${config.mobileMaxWidth}px)`).matches;
      return mediaMet || check && mediaMet;
    },
    isNumber: (number) => (_.isNumber(number) && !_.isNaN(number)),
    isPositiveNumber: (number) => (_.isNumber(number) && !_.isNaN(number) && number > 0),
    domAddClass: function({el, className}) {
      return el?.classList && el.classList.add(className);
    },
    domRemClass: function({el, className}) {
      return el?.classList.contains(className) && el.classList.remove(className);
    },
    location_getParameterByName: function location_getParameterByName(name, url) {
      if (!url) url = window.location.href;
      name = name.replace(/[\[\]]/g, "\\$&");
      var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, " "));
    },
    clickBinder: function clickBinder({el, selector, eventCb, eventName = "click"}) {
      if (!el) el = dQ(selector);
      if (!el) return debugErr(`Could not get element from selector: ${selector}`);
      el.addEventListener(eventName, (e) => {
        eventCb();
      });
      const mouseLeft = false;
      let pressHoldInterval;
      el.addEventListener("mousedown", (e) => {
        pressHoldInterval = setInterval(() => {
          eventCb(5);
        }, 333);
      });
      el.addEventListener("mouseleave", () => {
        clearInterval(pressHoldInterval);
      });
      el.addEventListener("mouseup", () => {
        clearInterval(pressHoldInterval);
      });
    },
    simulateClick: function simulateClick(elem) {
      // Create our event (with options)
      const evt = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      // If cancelled, don't dispatch our event
      const cancelled = !elem.dispatchEvent(evt);
      return { cancelled, evt };
    },
    callEvery: function callEvery(_every, {timeout = 0, dequeue = false, bind = null, callbackArgs = null} = {}) {
      if (_every) {
        if (_.isArray(_every)) {
          let i, onS;
          //debug("callEvery", _every) ;
          for (i in _every) {
            onS = _every[i];
            if (_.isFunction(onS?.fn)) {
              timeout = onS.timeout;
              onS = onS.fn;
            }
            if (!_.isFunction(onS)) return debugErr(`onS is not a function`, i, _every)
            debug("callEvery - func", onS);
            if (timeout) {
              setTimeout(() => {
                if (bind) {
                  onS = onS.bind(bind);
                }
                const result = onS(callbackArgs);
                debug("callEvery - result", result); 
              }, timeout);
            }
            else {
              if (bind) {
                onS = onS.bind(bind);
              }
              const result = onS(callbackArgs);
              debug("callEvery - result", result); 
            }
            if (dequeue) delete _every[i];
          }
        }
        else {
          _every?.();
        }
      }
    },
    getInfoField: function getInfoField(abc, key) {
      return abc.split("\n").filter(line => (_.startsWith(line, `${key}:`)))?.shift()?.replace(`${key}:`,"");
    },
    isFullScreen: function isFullScreen() {
      return !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement)
    },
    dQ,
    dQAll,
    timeoutElOp: ({el, fn, timeout = 500, waitStart = 0} = {}) => {
      let ic = 0;
      setTimeout(() => {
        const interval = setInterval(() => {
          if(!el && ic < 4) {
            debug(`timeoutElOp retrying`, fn);
            ic++;
          }
          else if (!el && ic > 4) {
            debugErr(`Could not perform on el`, fn);
            clearInterval(interval);
          }
          else if(el) {
            debug("timeoutElOp:", el);
            fn(el);
            clearInterval(interval);
          }
        }, (timeout < 1000) ?  _.min(timeout, 500)  : timeout);
      }, waitStart);
    },
    htmlToElement: function htmlToElement(html) {
      var template = document.createElement('template');
      html = html.trim(); // Never return a text node of whitespace as the result
      template.innerHTML = html;
      return template.content.firstChild;
    },
    parseYTVideoId: function parseYTVideoId(url) {
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    },
  }
}
