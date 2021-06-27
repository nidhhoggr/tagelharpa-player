import utils from "./utils";
const {
  debug,
  debugErr,
  htmlToElement,
} = utils({from: "hps"});

export default HPS;
function HPS(wrapperName, options) {

  var self = Object.create(HPS.prototype);

  self.animReq = null;

  var deviceWidth,
        deviceHeight;
        
  self.originStyles = [];


  // Default Settings
  self.options = {
    sectionClass: 'hps-section',
    scrollCallback: false,
    touchMult: -2,
    firefoxMult: 15,
    mouseMult: 1,
    ease: 0.1,
    sectionWidth: 0,
    sectionOffset: 0,
    controls: {
      append: false,
      elementClass: 'hps-controls',
      prevButtonClass: 'hps-control-prev',
      nextButtonClass: 'hps-control-next'
    }
  };

  // User defined options (might have more in the future)
  if (options){
    Object.keys(options).forEach(function(key){
      self.options[key] = options[key];
    });
  }

  self.wrapperName = wrapperName;
  // By default, hps-wrapper class
  if (!self.wrapperName) {
    self.wrapperName = '.hps-wrapper';
  }
  else if (typeof wrapperName === 'string') {
    var wrapper = document.querySelector(self.wrapperName);
  }
  else {
    var wrapper = self.wrapperName[0] || self.wrapperName;
  }

  // Now query selector
  if (wrapper && typeof wrapper === 'object') {
    self.wrapper = wrapper;
    if (wrapper.children.length > 0) {
      self.sections = wrapper.children;
    }
    else {
      // There is no children elements to swipe!
      throw new Error("Selected wrapper does not contain any child object.")
    }

    self.wrapper.rect = wrapper.getBoundingClientRect();
  }
  // The wrapper don't exist
  else {
    throw new Error("The wrapper you're trying to select don't exist.");
  }

  // Let's kick this script off

  // Set styles that are CRUCIAL for the script to work
  self.setupStyles = function setupStyles() {
    self.originStyles = [];

    deviceWidth = window.innerWidth;
    deviceHeight = window.innerHeight;
    if (options.disableScrolling) {
      options.disableScrolling();
    }
    self.applyStyle(self.wrapper, {
      width: (self.options.sectionWidth || deviceWidth) * self.sections.length + self.options.sectionOffset
    });
    for (var elem of self.sections){
      self.applyStyle(elem, {
        float: 'left'
      });
      elem.classList.add(self.options.sectionClass);
    };
  }


  // Let me make your website as it was before kicking this script off
  var destroyStyles = function() {
    if (self.originStyles.length > 0) {
      for (var key in self.originStyles) {
        self.applyStyle(self.originStyles[key].elem, self.originStyles[key].styles, false);
      }
    }
    for (var elem of self.sections){
      elem.classList.remove(self.options.sectionClass);
    };

    self.originStyles = [];
  }

  // Helper function, so the styling looks clean and lets us track changes

  /****** SCROLL SETUP *****/
  var numListeners,
         listeners = [],
         touchStartX,
         touchStartY,
         bodyTouchAction,
         currentSection = 0;

  self.currentX = 0;
  self.targetX = 0;

  var hasWheelEvent = 'onwheel' in document;
  var hasMouseWheelEvent = 'onmousewheel' in document;
  var hasMouseMoveEvent = true;
  
  var isFirefox = navigator.userAgent.indexOf('Firefox') > -1;

  self.mouseEvent = {
    y: 0,
    x: 0,
    deltaX: 0,
    deltaY: 0,
    originalEvent: null
  };

  var notify = function(e) {
    self.mouseEvent.x += self.mouseEvent.deltaX;
    self.mouseEvent.y += self.mouseEvent.deltaY;
    self.mouseEvent.originalEvent = e;

    if (!self.options.scrollCallback) {
      self.targetX += -self.mouseEvent.deltaX || self.mouseEvent.deltaY;
      self.targetX = Math.max( ((deviceWidth * self.sections.length) - deviceWidth) * -1, self.targetX);
      self.targetX = Math.min(0, self.targetX);
    }

    self.animate(e);
  }

  var onWheel = function(e) {
    // In Chrome and in Firefox (at least the new one)
    self.mouseEvent.deltaX = e.wheelDeltaX || e.deltaX * -1;
    self.mouseEvent.deltaY = e.wheelDeltaY || e.deltaY * -1;

    // for our purpose deltamode = 1 means user is on a wheel mouse, not touch pad
    // real meaning: https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent#Delta_modes
    if(isFirefox && e.deltaMode == 1) {
      self.mouseEvent.deltaX *= self.options.firefoxMult;
      self.mouseEvent.deltaY *= self.options.firefoxMult;
    }

    self.mouseEvent.deltaX *= self.options.mouseMult;
    self.mouseEvent.deltaY *= self.options.mouseMult;

    notify(e);
  }

  var onMouseWheel = function(e) {
    // In Safari, IE and in Chrome if 'wheel' isn't defined
    self.mouseEvent.deltaX = (e.wheelDeltaX) ? e.wheelDeltaX : 0;
    self.mouseEvent.deltaY = (e.wheelDeltaY) ? e.wheelDeltaY : e.wheelDelta;

    notify(e);
  }

  // Just listen...
  self.setupListeners = function setupListeners() {
    if(hasWheelEvent) document.addEventListener("wheel", onWheel);
    if(hasMouseWheelEvent) document.addEventListener("mousewheel", onMouseWheel);
  }

    // Stop listening!
  var destroyListeners = function() {
    if(hasWheelEvent) document.removeEventListener("wheel", onWheel);
    if(hasMouseWheelEvent) document.removeEventListener("mousewheel", onMouseWheel);
  }

  // Or fire up user's callback
  self.destroy = function() {
    destroyListeners();
    destroyStyles();
  };

  return self;
};

HPS.prototype.addItems = function addItems({items, itemIterator, onFinish, firstEl, lastEl}) {
  const self = this;
  if (firstEl && typeof firstEl === "string") {
    self.wrapper.innerHTML = firstEl;
  }
  items.map((item, i) => {
    const itemSection = document.createElement('section');
    itemIterator && itemIterator({section: itemSection, item});
    self.wrapper.appendChild(itemSection);
    //last iteration;
    if (i == (items.length - 1)) {
      if (lastEl && typeof lastEl === "string") {
        self.wrapper.appendChild(htmlToElement(lastEl));
      }
      debug("Finished", i, items.length);
      onFinish({
        el: self.wrapper
      });
    }
  });
}

HPS.prototype.animate = function animate(e) {

  const self = this;

  if (self.options.scrollCallback) {
    self.options.scrollCallback({event: self.mouseEvent, hps: self, originEvent: e});
  }
  else if (self.isHoveringWithinWrapper(e)) {
    self.currentX += (self.targetX - self.currentX) * self.options.ease;
    isNaN(self.currentX) || self.currentX > -self.options.ease ? self.currentX = 0 : false;
    self.setScrollerXPos({xpos: self.currentX});
  }
}

HPS.prototype.setScrollerXPos = function setScrollerXPos({xpos}) {
  const self = this;
  const t = 'translateX(' + xpos + 'px) translateZ(0)';
  const styling = self.wrapper.style;
  const c = self.wrapper.children;
  if (styling.width) {
    //get width of the noteScroller wrapper
    const width = parseInt(styling.width.replace("px",""));
    //get the direction of scrolling
    let isDirectionLtr;
    if (xpos < self.lastXpos) {
      isDirectionLtr = true;
    }
    else {
      isDirectionLtr = false;
    }
    const wouldExceedWidth = (xpos * -1) >= (width - 800);
    if (!wouldExceedWidth) {
      setElTransformStyle({styling, xpos});
    }
    else if (wouldExceedWidth && !isDirectionLtr) {//would exceed but scrolling left
      //debug({width, xpos}, width - (self.lastXpos - xpos));
      const nextX = ((width - 1000) * -1); 
      self.currentX = nextX;
      self.targetX = nextX;
      setElTransformStyle({styling, xpos: nextX });
    }
    else {//would exceed width
      //debug(`${width} is less than ${xpos}`);
      setElTransformStyle({styling, xpos: (width - 800) * -1});
    }
  }
  self.lastXpos = xpos;
}

function setElTransformStyle({styling, xpos}) {
  xpos = `translateX(${xpos}px) translateZ(0)`;
  styling["transform"] = xpos;
  styling["webkitTransform"] = xpos;
  styling["mozTransform"] = xpos;
  styling["msTransform"] = xpos;
}

HPS.prototype.init = function() {
  const self = this;
  self.setupStyles();
  self.setupListeners();
  self.animate()
  return self;
};

HPS.prototype.isHoveringWithinWrapper = function(e) {
  if (!e) return false; 
  const self = this;
  let i, p, found = false;
  for (i in e.path) {
    p = e.path[i];
    if (p && p.className && p.className.toString().includes(self.wrapperName.replace('.',''))) {
      found = true;
      break;
    }
    else if (i > 3) {
      break;
    } 
  }

  return found;
}

HPS.prototype.applyStyle = function applyStyle(elem, css, saveOrigin = true) {
  if (saveOrigin) {
    var currentElem = {};
    currentElem.elem = elem;
    currentElem.styles = {
      transform: "",
      webkitTransform: "",
      mozTransform: "",
      msTransform: ""
    };
  }

  for (var property in css) {
    if (typeof css[property] === 'number') {
      css[property] += 'px';
    }
    saveOrigin ? currentElem.styles[property] = elem.style[property] : false;
    elem.style[property] = css[property];
  }

  saveOrigin ? this.originStyles.push(currentElem) : false;
}
