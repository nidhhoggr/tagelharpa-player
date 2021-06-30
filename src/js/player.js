import _ from "lodash";
import utils from "./utils";
const { 
  isMobileUserAgent,
  isNumber, 
  isPositiveNumber, 
  isFullScreen,
  debug, 
  debugErr, 
  location_getParameterByName,
  simulateClick,
  clickBinder,
  callEvery,
  updateClasses,
  bindEl,
  domAddClass,
  domRemClass,
  dQ,
  dQAll,
  timeoutElOp,
  parseYTVideoId,
  htmlToElement
} = utils({from: "player"});

function ABCPlayer({
  abcjs,
  songs,
  ioc,
  stateMgr,
  options
}) {

  this.abcjs = abcjs;

  this.songs = songs;

  this.ioc = ioc;

  this.ldCover = new ioc.ldCover({root: ".ldcv"});

  this.storage = new ioc.Storage({namespace: "player"});

  this.stateMgr = stateMgr;

  //stores and instance to vaniallljsdropdown
  //available after player is loaded
  this.songSelector = null;

  this.options = options;
  this.playerOptions = options.player;
  this.instrumentOptions = options.instrument;
  this.instrumentOptions.pitchToNoteName = abcjs.synth.pitchToNoteName;
  this.hpsOptions = options.hps;
  this.hpsOptions.disableScrolling = this.disableScrolling.bind(this);

  this.isSettingTuneByIndex = undefined;
  this.currentTuneIndex = 0;
  this.transposition = 0;
  this.tempo = 0;

  //stores boolean flags of whether things are enabled
  this.isEnabled = {
    scrolling: false,//overflow scroll is disabled by default for HPS
    pageView: false,
    disableRepeatingSegments: false,
    disableDuationalMargings: false,
  };

  //stores how many times the player was reloaded due to an error
  this.errorReloadCount = 0;

  //used to store events to dispatch when play button is fired
  this.onStartCbQueue = [];

  this.domBinding = {};

  this.domButtonSelectors = [
    "start",
    "stop",
    "songNext",
    "songPrev",
    "transposeUp",
    "transposeDown",
    "tempoUp",
    "tempoDown",
    "tuningUp",
    "tuningDown",
    "unsetUrlTempo",
    "unsetUrlTransposition",
    "unsetUrlTuning",
    //playercontrols,
    //"enableMobileView",
    //"disableMobileView",
    "enableFullscreen",
    "disableFullscreen",
    "enablePageView",
    "disablePageView",
    "enableDurationalMargins",
    "disableDurationalMargins",
    "enableRepeatingSegments",
    "disableRepeatingSegments",
    "compatibility",
    "createSong",
    "editSong",
  ];

  this.domBindingKeys = [
    ...this.domButtonSelectors,
    "currentTransposition",
    "currentTempo",
    "currentSong",
    "currentBeat",
    "currentTuning",
    "currentKeySig",
    "playernotes",
    "playercontrols",
    "audio",
    "noteDiagram",
    "scrollingNotesWrapper",
    "YtLiteLoader"
  ]

  this.clientParamNames = [
    "cci",//currentTuningIndex
    "cti",//currentTuneIndex
    "ctp",//currentTransposition
    "ct",//currentTempo
    "cni",//currentNoteIndex
    "erc",//error reload count,
    "imb",//isMobileBuild,
    "pve",//pageViewEnabled
    "drs",//disableRepeatingSegments
    "ddm",//disableDurationalMargins
  ];

  this.clientParams = {};

  this.synthControl = null;

  this.audioContext = new AudioContext();

  this.abcOptions = {
    ...options.player.abcOptions,
    clickListener: (abcElem, tuneNumber, classes, analysis, drag, mouseEvent) => {
      
      /*
      var output = "currentTrackMilliseconds: " + abcElem.currentTrackMilliseconds + "<br>" +
        "midiPitches: " + JSON.stringify(abcElem.midiPitches, null, 4) + "<br>" +
        "gracenotes: " + JSON.stringify(abcElem.gracenotes, null, 4) + "<br>" +
        "midiGraceNotePitches: " + JSON.stringify(abcElem.midiGraceNotePitches, null, 4) + "<br>";
      dQ(".clicked-info").innerHTML = "<div class='label'>Clicked info:</div>" +output;
      */

      var lastClicked = abcElem.midiPitches;
      if (!lastClicked) return;

      this.abcjs.synth.playEvent(lastClicked, abcElem.midiGraceNotePitches, this.synthControl.visualObj.millisecondsPerMeasure()).then((response) => {
        const { cmd, pitch, duration, ensIndex } = lastClicked[0];
        if (cmd == "note") {
          this.setNoteDiagram({pitchIndex: pitch, duration});
          const firstPitch = _.get(abcElem, "midiPitches[0]");
          if (firstPitch) {
            const currentNoteIndex = _.get(firstPitch, "ensIndexes[0]");
            if (currentNoteIndex >= 0) 
              this.noteScrollerItemOnClick(undefined, {currentNoteIndex});
              this.assessState({currentNoteIndex});
          }
        }
      }).catch((error) => {
        debugErr("error playing note", error);
      });
    }
  };


  this.audioParams = {
    audioContext: this.audioContext,
    //visualObj,
    // sequence: [],
    // millisecondsPerMeasure: 1000,
    // debugCallback: function(message) { debug(message) },
    options: {
      soundFontUrl: this.playerOptions.getSoundFontUrl(this.options), 
      program: this.playerOptions.currentInstrumentIndex,
      // soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/" ,
      // sequenceCallback: function(noteMapTracks, callbackContext) { return noteMapTracks; },
      // callbackContext: this,
      // onEnded: function(callbackContext),
      // pan: [ -0.5, 0.5 ]
      //qpm,
      //defaultQpm: qpm,
      chordsOff: true,
      voicesOff: true
    }
  }

}

export default ABCPlayer;

ABCPlayer.prototype.disableScrolling = function disableScrolling() {
  dQ('body').style["overflow"] = "hidden";
  dQ('html').style["overflow"] = "hidden";
  this.isEnabled.scrolling = false;
}

ABCPlayer.prototype.isScrollingEnabled = function isScrollingEnabled() {
  return (dQ('body').style["overflow"] == "visible" && this.isEnabled.scrolling == true);
}

ABCPlayer.prototype.enableScrolling = function enableScrolling() {
  dQ('body').style["overflow"] = "visible";
  dQ('html').style["overflow"] = "visible";
  this.isEnabled.scrolling = true;
}

ABCPlayer.prototype.enablePageView = function enablePageView({withReset = false} = {}) {
  this.isEnabled.pageView = true;
  domAddClass({el: dQ("main"), className: "pageView"})
  this.enableScrolling();
  this.domBinding.enablePageView.hide();
  this.domBinding.disablePageView.show("inline-flex");
  this.domBinding.scrollingNotesWrapper.show("inline");
  if (withReset) {
    setTimeout(() => {
      setTimeout(() => {
        dQ("main").style["display"] = "block";
      }, 25);
      dQ("main").style["display"] = "none";
    }, 1000);
  }
}

ABCPlayer.prototype.disablePageView = function disablePageView() {
  domRemClass({el: dQ("main"), className: "pageView"})
  this.isEnabled.pageView = false;
  this.disableScrolling();
  this.domBinding.enablePageView.show("inline-flex");
  this.domBinding.scrollingNotesWrapper.show("inline-block");
  this.domBinding.disablePageView.hide();
}

ABCPlayer.prototype.disableRepeatingSegments = function disableRepeatingSegments() {
  this.isEnabled.disableRepeatingSegments = true;
  this.updateState({
    isEnabled: {
      ...this.isEnabled,
      disableRepeatingSegments: true
    },
    onFinish: () => {
      window.location.reload();
    }
  });
}

ABCPlayer.prototype.enableRepeatingSegments = function enableRepeatingSegments() {
  this.isEnabled.disableRepeatingSegments = false;
  //this url appension acts as a failover for state updates lag
  this.updateState({
    isEnabled: {
      ...this.isEnabled,
      disableRepeatingSegments: false
    },
    onFinish: () => {
      window.location.reload();
    }
  });
}

ABCPlayer.prototype.enableFullscreen = function enableFullscreen() {
  document.body.requestFullscreen().then(() => {
    this.isEnabled.fullscreen = true;
    this.domBinding.enableFullscreen.hide();
    this.domBinding.disableFullscreen.show("inline-flex");
  }).catch(debugErr);
}

ABCPlayer.prototype.disableFullscreen = function enableFullscreen() {
  this.isEnabled.fullscreen = false;
  this.domBinding.enableFullscreen.show("inline-flex");
  this.domBinding.disableFullscreen.hide();
  document.exitFullscreen();
}

ABCPlayer.prototype.enableDurationalMargins = function enableDurationalMargins() {
  this.isEnabled.disableDurationalMargins = false;
  this.domBinding.enableDurationalMargins.hide();
  this.domBinding.disableDurationalMargins.show("inline-flex");
  const sections = dQAll(".scrollingNotesWrapper section");
  let totalMarginPixels = 0;
  sections.forEach(s => {
    let duration = s.getAttribute("data-duration");
    if (duration) {
      duration = parseFloat(duration);
      const pixels = _.round(duration * 130);
      totalMarginPixels += pixels;
      s.style["margin-right"] = `${pixels}px`;
      s.outerHTML = `<div class="pnWrapper">${s.outerHTML}</div>`
    }
    //applying the listener directly after setting the outHTML has no effect hence this conditional block
    else if(s.className.includes("lastItem ")) {
      s.outerHTML = `<div class="pnWrapper">${s.outerHTML}</div>`
      setTimeout(() => {
        let scrollerCurrentWidth = parseInt(this.domBinding?.scrollingNotesWrapper.style.width, 10);
        scrollerCurrentWidth = parseInt(scrollerCurrentWidth + totalMarginPixels);
        this.domBinding.scrollingNotesWrapper.style.width = `${scrollerCurrentWidth}px`;
        const wrappers = dQAll("div.pnWrapper");
        wrappers.forEach(w => {
          w.addEventListener("click", this.noteScrollerItemOnClick.bind(this));
        })
      });
    }
  });
}

ABCPlayer.prototype.disableDurationalMargins = function disableDurationalMargins() {
  this.isEnabled.disableDurationalMargins = true;
  this.domBinding.enableDurationalMargins.show("inline-flex");
  this.domBinding.disableDurationalMargins.hide();
  const wrappers = dQAll("div.pnWrapper");
  wrappers.forEach(w => {
    const s = w.querySelector("section");
    const duration = s.getAttribute("data-duration");
    if (duration) {
      s.style["margin-right"] = `0px`;
      w.outerHTML = s.outerHTML;
    }
    //applying the listener directly after setting the outHTML has no effect hence this conditional block
    else if(s.className.includes("lastItem ")) {
      setTimeout(() => {
        const sections = dQAll(".scrollingNotesWrapper section");
        sections.forEach(s => {
          s.addEventListener("click", this.noteScrollerItemOnClick.bind(this));
        })
      });
    }
  });
}

ABCPlayer.prototype.createSong = function createSong() {
  dQ("textarea.createSongTextarea").value = this.playerOptions.abcSongEditorDefaultText; 
  this.ldCover.get().then((res) => {
    if (res === "add") {
      const newSong = dQ("textarea.createSongTextarea").value;
      this.songs.addSong({song: newSong, changeSong: true});
    }
  }).catch(debugErr);
}

ABCPlayer.prototype.editSong = function editSong() {
  let _song;
  const songIndex = this.currentTuneIndex;
  if (this.songs.isRuntimeSong({songIndex: this.currentTuneIndex})) {
    const {filename, song} = this.songs.getFromRuntime({songIndex});
    _song = song;
    if (!filename) return;
  }
  else {
    _song = this.currentSong.abc;
  }
  dQ("textarea.createSongTextarea").value = _song; 
  this.ldCover.get().then((res) => {
    if (res === "add") {
      const editedSong = dQ("textarea.createSongTextarea").value;
      this.songs.editSong({song: editedSong, songIndex, changeSong: true});
    }
  }).catch(debugErr);
}

ABCPlayer.prototype.setSongSelector = function(songSelector) {
  this.songSelector = songSelector;
}

ABCPlayer.prototype.onNoteChange = function onNoteChange({event, midiPitch: {
  cmd,
  pitch,
  //volume,
  //start,
  duration,
  //instrument,
  //endType,
  //gap,
}}) {
  const scrollingNotesWrapper = this.domBinding?.scrollingNotesWrapper;
  debug("onNoteChange:", {pitch, cmd, event});
  if (scrollingNotesWrapper) {
    const index = event.ensIndex;
    if (_.isNaN(index)) return;
    this.currentNoteIndex = index;
    this.updateState();
    if (!this.isEnabled.pageView) {
      const snItem = this.getNoteScrollerItem({currentNoteIndex: index});
      try {
        const firstLeft = scrollingNotesWrapper.getBoundingClientRect();
        const snItemRect = snItem.getBoundingClientRect();
        const offset = (snItemRect.left - firstLeft.left - this.hpsOptions.sectionOffset) * -1;
        const targetXPos = ((this.hpsOptions.sectionWidth * index) * -1);
        //debug({offset, targetXPoos});
        this.noteScroller.setScrollerXPos({xpos: offset});
      }
      catch (err) {
        debugErr(`Could not calculate offset`);
      }
    }
    const scrollingNoteDivs = dQAll(".scrollingNotesWrapper section") || [];
    const currEl = scrollingNoteDivs[index];
    let i, snd;
    if (currEl && !currEl.className.includes("currentNote")) {
      currEl.className = currEl.className.concat(" currentNote");
    }
    Array.from(scrollingNoteDivs).map((snd, i) => {
      if (i !== index && snd.className && snd.className.includes("currentNote")) {
        snd.className = snd.className.replace("currentNote","");
      }
    });
  }
  return this.setNoteDiagram({pitchIndex: pitch, duration});
}

ABCPlayer.prototype.onChangeSong = function() {
  if (this.isEnabled.pageView) {
    setTimeout(() => {//to wait for the song to load
      this.enablePageView({withReset: true});
    });
    setTimeout(() => {//to wait for the song to load
      this.enablePageView({withReset: false});
    }, 2000);
    this.domBinding.scrollingNotesWrapper.show("inline");
  }
  else {
    debug("Closed called -> disable scrolling");
    this.disableScrolling();
    this.domBinding.scrollingNotesWrapper.show("inline-block");
  }
  if (this.currentSong.media) {
    const videoId = parseYTVideoId(this.currentSong.media);
    this.domBinding.YtLiteLoader.innerHTML = `<lite-youtube videoid="${videoId}" playlabel="${this.currentSong.name}"></lite-youtube>`;
  }
  else {
    this.domBinding.YtLiteLoader.innerHTML = ``; 
  }
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  });
}

ABCPlayer.prototype.reloadSongSelector = function({playerInstance: player}) {
  const elem = dQ(".js-Dropdown");
  elem && elem.parentNode.removeChild(elem);
  this.songs.loadPlayerDropdown({
    playerInstance: player,
    onFinish: () => {
      const selector = new player.ioc.CustomSelect({
        elem: player.domBinding.currentSong,
        onChange: (songIndex) => {
          player.currentTuneIndex = songIndex;
          player.changeSong({currentTuneIndex: songIndex});
        },
        onOpen: () => {
          player.enableScrolling();
          player.domBinding.scrollingNotesWrapper.hide();
          player.domBinding.YtLiteLoader.hide();
        },
        onClose: ({instance}) => {
          debug("Closed called");
          player.onChangeSong();
          player.domBinding.YtLiteLoader.show("block");
        },
        onFinish: (selector) => {
          debug("CustomSelect", selector);
          player.setSongSelector(selector);
          selector.selectByIndex(player.currentTuneIndex);
        }
      });
    }
  });
}

ABCPlayer.prototype.load = function() {
  return new Promise((resolve) => {
    const _domBinding = {};
    this.domBindingKeys.map((className) => {
      const el = bindEl({className});
      if (el) _domBinding[className] = el;
    });
    this.domBinding = new Proxy(_domBinding, {
      get(target, prop) {
        if (prop in target) {
          return target[prop]
        }
        else {
          debug("RETRY", prop);
          const el = bindEl({className: prop});
          if (el) target[prop] = el;
          return el;
        }
      }
    });
    this.domButtonSelectors.map((elName) => {
      try {
        clickBinder({
          el: this.domBinding[elName], 
          eventCb: this[elName].bind(this)
        });
      } 
      catch(err) {
        debugErr(`Error attetmping to bind ${elName} to dom selectors`, err);
      }
    });

    this.clientParamNames.map((clientParamName) => {
      let paramValue = location_getParameterByName(clientParamName);
      if (!paramValue) {
        const storage = this.storage.get();
        paramValue = storage?.[clientParamName];
      }
      this.clientParams[clientParamName] = paramValue;
    });

    debug({clientParams: this.clientParams})
      
    if (this.abcjs.synth.supportsAudio()) {
      this.synthControl = new this.abcjs.synth.SynthController();
      const cursorControl = new CursorControl({
        playerInstance: this,
        onBeatChange: ({beatNumber, totalBeats, totalTime}) => {
          this.domBinding["currentBeat"].innerText = `Beat: ${beatNumber}/${totalBeats}`;
        }
      });
      this.synthControl.load("#audio", cursorControl, this.playerOptions.visualOptions);
    } else {
      this.domBinding.audio.innerHTML = "<div class='audio-error'>Audio is not supported in this browser.</div>";
    }
    
    this.instrument = new this.ioc.Instrument(this.instrumentOptions);
    this.noteScroller = new this.ioc.HPS(this.hpsOptions.wrapperName, this.hpsOptions);
    this.songs.setPlayerInstance(this);
    //@TODO ensure this is not needed here
    this.setCurrentSongFromClientParam();

    const _handleErr = (err) => {
      debugErr(err);
      const error = err?.message || err?.error?.mesage || err;
      debugErr(`Error occurred: ${error}`);
      if (this.errorReloadCount < this.options?.errorReloadLimit) {
        setTimeout(() => {
          if (error?.reason?.message?.includes("Failed to set the 'buffer' property on 'AudioBufferSourceNode'")) {
            return debugErr(`Skipping reload when error matching 'AudioBufferSourceNode'`);
          }
          else {
            if (!this.options?.errorReloadDisabled) {
              this.updateState({
                errorReloadCount: this.errorReloadCount + 1,
                onFinish: () => {
                  window.location.reload();
                }
              });
            }
          }
        }, 2000);
      }
      else if (this.errorReloadCount >= this.options?.errorReloadLimit) {
        setTimeout(() => {
          this.errorReloadCount = 0;
        }, this.errorReloadResetDuration);
      }
    };
    
    const urlProcessing = this.evaluateClientParams();

    const shouldEnablePageView = this.isEnabled.pageView;

    if (!shouldEnablePageView && isMobileUserAgent()) {
      //requires a user gesture
      this.options.isMobileBuild = true;
      this.onStartCbQueue.push(() => {
        //fires after player.start is called
        this.enableFullscreen();
      });
    }
    
    const onSuccesses = [];
    
    if (!shouldEnablePageView && this.options.isMobileBuild) {
      this.playerOptions.showSheetMusic = false;
      this.playerOptions.showNoteDiagram = false;
      this.stateMgr.activityQueue.push(() => {
        //fires when an activity is detected
        debug("First Activity");
      });
      //decrese the width of the section
      onSuccesses.push(() => domAddClass({el: dQ("main"), className: "mobile"}));
      timeoutElOp({
        el: this.domBinding.playercontrols,
        fn: (el) => el.style.transform = "scale(0.8)",
      });
    }
    else if(shouldEnablePageView) {
      this.playerOptions.showSheetMusic = false;
      this.playerOptions.showNoteDiagram = false;
    }

    if(!this.playerOptions.showSheetMusic) {
      this.domBinding.playernotes.hide();
    }

    this.setTune({userAction: true, onSuccess: onSuccesses, calledFrom: "load"}).then(({playerInstance: player}) => {
      debug("URL Processing", urlProcessing);
      this.processClientParams(urlProcessing);
      if (this.isEnabled.pageView) {
        timeoutElOp({
          el: dQ("section.lastItem"),
          fn: () => this.enablePageView({withReset: true}),
          waitStart: 2000,
        });
      }
      this.reloadSongSelector({playerInstance: player});
      window.onerror = function (message, file, line, col, error) {
        _handleErr(error);
      };
      window.addEventListener("error", function (e) {
        _handleErr(e);
      })
      window.addEventListener('unhandledrejection', function (e) {
        _handleErr(e);
      })
      this.stateMgr.idleWatcher({
        playerInstance: this,
        inactiveTimeout: this.playerOptions.stateAssessmentInactivityTimeout,
        onInaction: () => {
          debug("My inaction function"); 
        },
        onReactivate: () => {
          debug("my reactivate function");
          this.reloadWindow();
        }
      });
      setInterval(() => {
        this.updateState();
      }, this.playerOptions.stateAssessmentLoopInterval);

      this.songs.load({playerInstance: this, songIndex: urlProcessing.currentTuneIndex});
    });
    document.onkeydown = (evt) => {
      evt = evt || window.event;
      const { keyCode } = evt;
      const { keyCodes } = this.playerOptions;
      if (!keyCodes) return;
      //if the song editor is on we won't listen to shortcuts
      if (this.ldCover.isOn()) return;
      if (keyCode === keyCodes.esc) { 
        this.reloadWindow({cti: this.currentTuneIndex});
      }
      else if (keyCode === keyCodes.prev) {
        this.songPrev();
      }
      else if (keyCode === keyCodes.play) {
        this.start();
      }
      else if (keyCode === keyCodes.next) {
        this.songNext();
      }
      else if (keyCode === keyCodes.refresh) {
        this.reloadWindow();
      }
      else if (keyCode === keyCodes.fullscreen) {
        this.enableFullscreen();
      }
    };

    resolve({player: this});
  });
}

ABCPlayer.prototype.reloadWindow = function(appendingObject) {
  fadeEffect({fadeIn: true});
  if (appendingObject) {
    const appendingLocation = Object.keys(appendingObject).map((key) => {
      return key + '=' + appendingObject[key];
    }).join('&');
    try {
      this.storage.set(appendingObject);
      let url = window.location.origin;    
      url += `?${appendingLocation}`;
      window.location.href= url;
    } catch(err) {
      console.error(err);
    }
  }
  else {
    setTimeout(() => {
      this.updateState({onFinish: () => (window.location.reload())});
    }, 100);
  }
}

ABCPlayer.prototype.instrumentReload = function(options = {}) {
  this.instrumentOptions = _.merge(this.instrumentOptions,options);
  this.instrument = new this.ioc.Instrument(this.instrumentOptions);
  if (options.skipUpdate) return;
  this._updateTuning();
  this.updateState();
}

//this is called before URL parsing and once after
ABCPlayer.prototype.setCurrentSongFromClientParam = function() {
  this.enablePageViewFromClientParam();
  this.disableRepeatingSegmentsFromClientParam();
  const clientParam = parseInt(this.clientParams["cti"]);
  if (isNumber(clientParam)) {
    this.currentTuneIndex = clientParam;
    let song = this.songs.loadSong({songIndex: this.currentTuneIndex});
    if (song) {
      this.currentSong = song;
    }
    else {
      debugErr(`Could not get song from index ${this.currentTuneIndex}`);
      this.currentTuneIndex = 0;
      song = this.songs.loadSong({songIndex: 0});
      if (song) this.currentSong = song;
    }
  }
}

ABCPlayer.prototype.disableRepeatingSegmentsFromClientParam = function() {
  const clientParam = parseInt(this.clientParams["drs"]);
  if (clientParam === 1) {
    this.isEnabled.disableRepeatingSegments = true;
    this.domBinding.disableRepeatingSegments.hide();
    this.domBinding.enableRepeatingSegments.show("inline-flex");
  }
}

ABCPlayer.prototype.enablePageViewFromClientParam = function() {
  const clientParam = parseInt(this.clientParams["pve"]);
  if (clientParam === 1) {
    this.isEnabled.pageView = true;
  }
}

ABCPlayer.prototype.evaluateClientParams = function() {

  let clientParam = false;

  const toSet = {};//stores a set of properties to perform logic on

  clientParam = parseInt(this.clientParams["cti"]);
  if (isNumber(clientParam)) {
    toSet["currentTuneIndex"] = clientParam;
  }

  clientParam = parseInt(this.clientParams["erc"]);
  if (isPositiveNumber(clientParam)) {
    toSet["errorReloadCount"] = clientParam;
  }

  clientParam = parseInt(this.clientParams["imb"]);
  if (clientParam === 1) {
    this.options.isMobileBuild = true;
  }

  clientParam = parseInt(this.clientParams["cci"]);
  if (isNumber(clientParam)) {
    const currentTuningIndex = this.getCurrentTuningIndex();
    const urlTuningIndex = clientParam;
    debug("URL TUNING", currentTuningIndex, urlTuningIndex);
    if (currentTuningIndex !== urlTuningIndex && urlTuningIndex !== 0) {
      toSet.tuningIndex = urlTuningIndex;
      toSet.from_tuningIndex = currentTuningIndex;
      const tuning = this.instrument.getTuningKeyByIndex(urlTuningIndex);
      toSet["instrument.tuning"] = tuning;
    }
  }

  clientParam = parseInt(this.clientParams["ctp"]);
  if (isNumber(clientParam)) {
    const currentTransposition = this.currentSong?.transposition || this.transposition;
    const urlTransposition = clientParam;
    debug("URL TRANSPOSITION", currentTransposition, urlTransposition);
    if (currentTransposition !== urlTransposition && urlTransposition !== 0) {
      toSet.transposition = urlTransposition;
      toSet.from_transposition = currentTransposition;
    }
  }

  clientParam = parseInt(this.clientParams["ct"]);
  if (isNumber(clientParam)) {
    const currentTempo = this.currentSong?.tempo || this.tempo;
    const urlTempo = clientParam;
    debug("URL TEMPO", currentTempo, urlTempo, this.currentSong);
    if (currentTempo !== urlTempo && urlTempo !== 0) {
      toSet.tempo = urlTempo;
      toSet.from_tempo = currentTempo;
    }
  }

  clientParam = parseInt(this.clientParams["cni"]);
  if (isNumber(clientParam)) {
    const currentNoteIndex = clientParam;
    if (isNumber(currentNoteIndex)) {
      toSet["setNoteScrollerItem"] = currentNoteIndex;
    }
  }

  return toSet;
}

ABCPlayer.prototype.processClientParams = function(toSet) {
  
  if (toSet["errorReloadCount"]) {
    this.errorReloadCount = toSet["errorReloadCount"];
  }

  if (toSet["instrument.tuning"]) {
    this.instrumentReload({tuning: toSet["instrument.tuning"]});
  }
  else {
    this.instrumentReload();
  }
 
  this.setCurrentSongFromClientParam();

  const queueCallbacks = [];
  queueCallbacks.push(() => {
    if (isNumber(toSet.tuningIndex)) {
      //this needs to execute later in the stack due to some race condition
      setTimeout(() => {
        this._updateTuning(toSet.tuningIndex, {from: toSet.from_tuningIndex});
      });
    }
    if (isNumber(toSet.tempo)) {
      setTimeout(() => {
        this.setTempo(toSet.tempo, {from: toSet.from_tempo});
      });
    }
    if (isNumber(toSet.transposition)) {
      setTimeout(() => {
        this.setTransposition(toSet.transposition, {from: toSet.from_transposition});
      });
    }
  });

  if (toSet["setNoteScrollerItem"]) {
    const currentNoteIndex = toSet["setNoteScrollerItem"];
    const clickItem = () => {
      const nsItem = this.getNoteScrollerItem({currentNoteIndex});
      nsItem && simulateClick(nsItem);
    }
    //this will be fired when the user clicks play is needed in addtion to the call below
    //this will be fired first to set the note before clicking play
    queueCallbacks.push({
      fn: clickItem.bind(this),
      timeout: 2000
    });
  }

  callEvery(queueCallbacks);
}


ABCPlayer.prototype.setNoteDiagram = function({pitchIndex, currentNote}) {
  if (!this.playerOptions.showNoteDiagram) return;

  if (!currentNote) {
    currentNote = this.abcjs.synth.pitchToNoteName[pitchIndex];
  }
  const tuningKey = this.instrument.getTuningKeyAbbr();
  if ((pitchIndex < this.currentSong?.compatibility?.pitchReached.min ||
    (pitchIndex > this.currentSong?.compatibility?.pitchReached.max))) {
    this.domBinding.noteDiagram.innerHTML = `<div class="playable_tuning-${tuningKey} unplayable-note"><h1>${currentNote}</h1></div>`;
  }
  else {
    this.domBinding.noteDiagram.innerHTML = `<div class="playable_tuning-${tuningKey} playable_pitch-${pitchIndex}"><h1>${currentNote}</h1></div>`;
  }
}


ABCPlayer.prototype.setCurrentSongNoteSequence = function({visualObj, onFinish}) {
  this.currentSong.entireNoteSequence = [];
  const lines = this.audioParams.visualObj.noteTimings || [];
  const linesLength = lines.length;
  const totalDuration = _.get(this.midiBuffer, "flattened.totalDuration") * 1000;
  let durationReached = 0;
  if (lines?.length === 0) return onFinish?.(0)
  lines.map((line, lKey) => {
    const cmd = _.get(line, "midiPitches[0].cmd");
    /*
    if (cmd == "tempo") {
      const duration = line.duration;
      const percentage = _.round((durationReached * 1000 / totalDuration), 5);
      const ensIndex = this.currentSong.entireNoteSequence.push({
        duration,
        durationReached,
        _percentage: percentage,
        percentage: percentage.toString().replace(".","_"),
      }) - 1;
      this.audioParams.visualObj.noteTimings[lKey].ensIndex = ensIndex;
      this.currentSong.entireNoteSequence[ensIndex].noteTimingIndex = lKey;
      this.currentSong.entireNoteSequence[ensIndex].ensIndex = ensIndex;
      durationReached += duration;
    } else
    */
    if (["rest", "note"].includes(cmd)) {
      const pitchIndex = line.midiPitches[0].pitch;
      const noteName = this.abcjs.synth.pitchToNoteName[pitchIndex];
      const duration = line.duration;
      const percentage = _.round((durationReached * 1000 / totalDuration), 5);
      const ensIndex = this.currentSong.entireNoteSequence.push({
        noteName,
        pitchIndex,
        duration,
        durationReached,
        _percentage: percentage,
        percentage: percentage.toString().replace(".","_"),
        measureStart: line.measureStart
      }) - 1;
      this.audioParams.visualObj.noteTimings[lKey].ensIndex = ensIndex;
      this.currentSong.entireNoteSequence[ensIndex].noteTimingIndex = lKey;
      this.currentSong.entireNoteSequence[ensIndex].ensIndex = ensIndex;
      durationReached += duration;
    }
    else {
      if (line.type == "end") {
        onFinish?.(lKey + 1);
      }
    }
  });
}

ABCPlayer.prototype.start = function() {
  if (this.isSettingTune()) return;
  if (!dQ("section.lastItem")) {
    //the loader didn't load properly
    const q = this.stop();
    setTimeout(() => {
      if (q) {
        q.then(this.start.bind(this));
      }
      else {
        this.start();
      }
    }, 2000);
  }
  else {
    if (this.synthControl) {
      this.synthControl.play();
      if (this.onStartCbQueue.length) {
        this.synthControl?.pause();
        _.each(this.onStartCbQueue, (cq, i) => {
          _.isFunction(cq) && cq();
          delete this.onStartCbQueue[i];
        });
      }
    }
  }
}

ABCPlayer.prototype.stop = function(args = {}) {
  this.synthControl?.destroy?.();
  this.synthControl?.stop?.();
  if (args.changeSong) {
    this.instrumentReload({
      skipUpdate: true,
    });
    this.transposition = 0;
    this.currentNoteIndex = 0;
  }
  if (this.playerOptions.refreshWhenPossible) {
    this.updateState({
      playerInstance: {
        currentNoteIndex: 0,
        currentTuneIndex: args.currentTuneIndex || this.currentTuneIndex,
        ...args
      },
      onFinish: this.reloadWindow.bind(this),
      changeSong: args.changeSong,
    });
  }
  else {
    this.updateState({
      playerInstance: {
        currentNoteIndex: 0,
        currentTuneIndex: args.currentTuneIndex || this.currentTuneIndex,
        tempo: this.currentTempo,
        transposition: this.transposition,
        ...args
      },
      changeSong: args.changeSong,
    });
    return Promise.resolve(this.setTune({userAction: true, calledFrom: args.changeSong ? "song" : "stop"}));
  }
}

ABCPlayer.prototype.changeSong = function(args) {
  this.synthControl?.stop?.();
  this.unsetUrlTransposition();
  this.unsetUrlTempo();
  this.unsetUrlTuning();
  this.stop({changeSong: true, ...args});
  this.songSelector.selectByIndex(this.currentTuneIndex);
  this.onChangeSong();
  //in case we do no refresh, unset these functions set by clientparam eveluation
}


ABCPlayer.prototype.songPrev = function() {
  if (this.isSettingTune()) return;
  if (this.currentTuneIndex > 0)
    this.currentTuneIndex = this.currentTuneIndex - 1;
  else
    this.currentTuneIndex = this.songs.getCount() - 1;
  this.changeSong({currentTuneIndex: this.currentTuneIndex});
}

ABCPlayer.prototype.songNext = function() {
  if (this.isSettingTune()) return;
  this.currentTuneIndex = this.currentTuneIndex + 1;
  if (this.currentTuneIndex >= this.songs.getCount()) this.currentTuneIndex = 0;
  this.changeSong({currentTuneIndex: this.currentTuneIndex});
}


ABCPlayer.prototype.transposeUp = function() {
  if (this.isSettingTune()) return;
  if (this.transposition < this.playerOptions.transpositionLimits.max) {
    this.setTransposition(this.transposition + 1, {from: this.transposition});
  }
}

ABCPlayer.prototype.transposeDown = function() {
  if (this.isSettingTune()) return;
  if (this.transposition > this.playerOptions.transpositionLimits.min) {
    this.setTransposition(this.transposition - 1, {from: this.transposition});
  }
}

ABCPlayer.prototype.tempoUp = function(by = 1) {
  if (this.isSettingTune()) return;
  if ((this.tempo + by) <= this.playerOptions.tempoLimits.max) {
    const from = this.tempo;
    this.tempo += by;
    this.setTempo(undefined, {from});
  }
}

ABCPlayer.prototype.tempoDown = function(by = 1) {
  if (this.isSettingTune()) return;
  if ((this.tempo - by) >= this.playerOptions.tempoLimits.min) {
    const from = this.tempo;
    this.tempo -= by;
    this.setTempo(undefined, {from});
  }
}

ABCPlayer.prototype.tuningDown = function() {
  if (this.isSettingTune()) return;
  const { tuningKey, possibleTunings } = this.instrument;
  const currentIndex = this.getCurrentTuningIndex();
  let nextIndex;
  if (currentIndex >= possibleTunings.length) {
    nextIndex = 0;
  }
  else if (currentIndex === 0 || currentIndex) {
    nextIndex = currentIndex + 1;
  }
  this._updateTuning(nextIndex, {from: currentIndex});
}

ABCPlayer.prototype.tuningUp = function() {
  if (this.isSettingTune()) return;
  const { tuningKey, possibleTunings } = this.instrument;
  const currentIndex = this.getCurrentTuningIndex();
  let nextIndex;
  if (currentIndex <= 0) {
    nextIndex = possibleTunings.length - 1;
  }
  else if (currentIndex)  {
    nextIndex = currentIndex - 1;
  }
  this._updateTuning(nextIndex, {from: currentIndex});
}

ABCPlayer.prototype.getCurrentTuningIndex = function() {
  if (!this.instrument) return 0;
  const { tuningKey, possibleTunings } = this.instrument;
  return _.indexOf(possibleTunings, tuningKey);
}

ABCPlayer.prototype._updateTuning = function updateTuning(tuningKeyIndex = 0, {from} = {}) {
  const { possibleTunings } = this.instrument;
  if (tuningKeyIndex < 0 || !isNumber(tuningKeyIndex)) tuningKeyIndex = 0;
  this.instrument.setTuningKey(possibleTunings[tuningKeyIndex]);
  this.setTune({
    userAction: true,
    isSameSong: true,
    currentSong: this.currentSong,
    abcOptions: {
      visualTranspose: this.transposition
    },
    onSuccess: () => {
      debug(`Updated the tuning to ${tuningKeyIndex}`);
      if ((tuningKeyIndex % possibleTunings.length) === 0) {
      }
      else {
      }
      if (isNumber(tuningKeyIndex) && tuningKeyIndex === this.currentSong?.original?.tuning) {
        delete this.onUnsetClientParamTuning;
        this.domBinding.unsetUrlTuning.hide();
      }
      else if (!this.onUnsetClientParamTuning && isNumber(from) && tuningKeyIndex !== from) {
        this.onUnsetClientParamTuning = () => {
          this._updateTuning(from);
        }
        this.domBinding.unsetUrlTuning.show();
      }
    },
    calledFrom: "tuning",
  });
}

ABCPlayer.prototype.unsetUrlTempo = function() {
  this.onUnsetClientParamTempo?.();
  this.domBinding.unsetUrlTempo.hide();
  this.updateState();
  delete this.onUnsetClientParamTempo;
}

ABCPlayer.prototype.unsetUrlTransposition = function() {
  this.onUnsetClientParamTransposition?.();
  this.domBinding.unsetUrlTransposition.hide();
  this.updateState();
  delete this.onUnsetClientParamTransposition;
}

ABCPlayer.prototype.unsetUrlTuning = function() {
  this.onUnsetClientParamTuning?.();
  this.domBinding.unsetUrlTuning.hide();
  this.updateState();
  delete this.onUnsetClientParamTuning;
}

ABCPlayer.prototype.updateControlStats = function updateControlStats() {
  this.domBinding.currentTransposition.innerText = this.transposition;
  this.domBinding.currentTempo.innerText = this.tempo;
  //this.domBinding.currentSong.innerText = this.currentSong.name;
  this.domBinding.currentTuning.innerText = _.get(this.instrument, "tuningKey", "");
  if (this.audioParams.visualObj) {
    const keySig = this.audioParams.visualObj.getKeySignature();
    if (keySig) {
      const { root, mode } = keySig;
      this.domBinding.currentKeySig.innerText = `${root}${mode}`;
    }
  }
}

ABCPlayer.prototype.setTransposition = function(semitones, {shouldSetTune = true, from} = {}) {
  this.transposition = semitones;
  this.currentSong.setTransposition(semitones, ({isSet}) => {
    if (!isSet) {
      debugErr(`Could not set transposition by ${semitones}`)
      return;
    }
    else {
      this.updateState();
      shouldSetTune && this.setTune({
        userAction: true,
        isSameSong: true,
        currentSong: this.currentSong,
        abcOptions: {
          visualTranspose: semitones
        },
        onSuccess: () => {
          debug(`Set transposition by ${semitones} half steps.`);
          if (isNumber(semitones) && semitones === this.currentSong?.original?.transposition) {
            this.domBinding.unsetUrlTransposition.hide();
            delete this.onUnsetClientParamTransposition;
          }
          else if (!this.onUnsetClientParamTransposition && isNumber(from) && semitones !== from) {
            this.onUnsetClientParamTransposition = () => {
              this.setTransposition(from);
            }
            this.domBinding.unsetUrlTransposition.show();
          }
        },
        calledFrom: "transposition"
      });
    }
  }); 
}

ABCPlayer.prototype.setTempo = function(tempo, {shouldSetTune = true, from} = {}) {
  if (!tempo) {
    tempo = this.tempo;
  }
  else if (tempo) {
    this.tempo = tempo;
  }
  //difference between QPM and BPM?
  this.audioParams.options.qpm = tempo;
  this.audioParams.options.defaultQpm = tempo;
  this.currentSong.setTempo(tempo);
  shouldSetTune && this.setTune({
    userAction: true,
    isSameSong: true,
    currentSong: this.currentSong,
    abcOptions: {
      visualTranspose: this.transposition
    },
    onSuccess: () => {
      this.domBinding.currentTempo.innerText = tempo;
      debug(`Set tempo to ${tempo}.`);
      if (isNumber(tempo) && tempo === this.currentSong?.original?.tempo) {
        delete this.onUnsetClientParamTempo;
        this.domBinding.unsetUrlTempo.hide();
      }
      else if (!this.onUnsetClientParamTempo && isNumber(from) && tempo !== from) {
        this.onUnsetClientParamTempo = () => {
          this.setTempo(from);
        }
        this.domBinding.unsetUrlTempo.show();
      }
    },
    calledFrom: "tempo"
  });
}


ABCPlayer.prototype.assessState = function(args = {}) {
  let i, j;
  for (i in args) {
    this[i] = args[i];
  }
  this.stateMgr.onAssessState({playerInstance: this});
}

ABCPlayer.prototype.updateState = function(args) {
  return this.stateMgr.onAssessState({playerInstance: this, ...args});
}

const fadeEffect = ({fadeIn} = {}) => {
  const feInterval = setInterval(() => {
    const preloader = dQ('.preloader');
    preloader.style["display"] = "flex";
    // if we don't set opacity 1 in CSS, then
    // it will be equaled to "" -- that's why
    // we check it, and if so, set opacity to 1
    if (!preloader.style.opacity || fadeIn) {
      preloader.style.opacity = 1;
      fadeIn = false;
    }
    if (preloader.style.opacity > 0 && !fadeIn) {
      preloader.style.opacity -= 0.1;
    } 
    else {
      clearInterval(feInterval);
      preloader.style["display"] = "none";
    }
  }, 100);
};

ABCPlayer.prototype.settingTuneStart = function settingTuneStart(tuneIndex) {
  this.isSettingTuneByIndex = tuneIndex;
  fadeEffect({fadeIn: true});
}

ABCPlayer.prototype.settingTuneFinish = function settingTuneFinish() {
  this.isSettingTuneByIndex = undefined;
  this.enableDurationalMargins();
  fadeEffect();
}


ABCPlayer.prototype.isSettingTune = function isSettingTune() {
  return this.currentTuneIndex && this.isSettingTuneByIndex === this.currentTuneIndex;
}

ABCPlayer.prototype.setTune = function setTune({userAction, onSuccess, abcOptions, currentSong, isSameSong, calledFrom = null}) {
  return new Promise((resolve, reject) => {
    this.settingTuneStart(this.currentTuneIndex);
    if (!currentSong) {
      this.currentSong = this.songs.loadSong({songIndex: this.currentTuneIndex});
    }
    else {
      this.currentSong = currentSong;
    }
   
    const { tempo, transposition, tuning } = this.currentSong;

    function prepareOnSuccess(setEm) {
      if (onSuccess && _.isFunction(onSuccess)) {
        onSuccess = [
          onSuccess,
          setEm
        ];
      }
      else if (onSuccess && _.isArray(onSuccess)) { 
        onSuccess.push(setEm);
      }
      else if (!onSuccess) {
        onSuccess = [setEm];
      }
    }


    if (!isSameSong) {
      this.noteScroller?.setScrollerXPos({xpos: 0});
      const { tempo, transposition, tuning } = this.currentSong;
      //the shouldSetTune flag ensures that it will not call setTune, were already here!
      if (tempo) {
        this.setTempo(tempo, {shouldSetTune: false});
      }
      //We want to set the transposition every call (not only !isSameSong)
      //this is due to a bug with transposition in the ABC library that randomly
      //transposes a half step lower than expected if called to early
      if (isNumber(transposition) //can contain zero
          && transposition !== this.transposition //song trans. doesnt match player trans.
          && !this.onUnsetClientParamTransposition) {//the trans. was not set by clientparams
        prepareOnSuccess(() => {
          //altough were already here well need to set the tune again...
          setTimeout(() => {
          this.setTransposition(transposition, {shouldSetTune: true});
          }, 1200);//dont call it too early, will result in transposition possibly a half step lower 
          //needed to set tranposition to zero if it is zero
        });
      }
      //this will override URLPARAMS
      if (isNumber(tuning) && !this.onUnsetClientParamTuning) {
        prepareOnSuccess(() => {
          this._updateTuning(tuning);
        });
      }
      //_.set(this.domBinding, "currentSong.innerText", this.currentSong.name);
    }
    
    const { abc } = this.currentSong;
    
    var midi, midiButton;
    try {

      if (shouldReuseInstances(calledFrom) && this.audioParams.visualObj) { 
        debug(`reusing visual obj`);
      }
      else {
        const selector = this.playerOptions.showSheetMusic ? "paper" : "*";
        const rendered = this.abcjs.renderAbc(selector, abc, {
          ...this.abcOptions,
          ...abcOptions
        });
        this.audioParams.visualObj = rendered?.[0];
        debug(`recreating visual obj on selector ${selector}`, this.audioParams.visualObj, calledFrom);
      }
    } catch(err) {
      debugErr(err);
      this.settingTuneFinish();
      reject(err);
      return debug("Couldn't get midi file", {err});
    }
    this.updateControlStats();
    const tuneArgs = arguments[0];
    tuneArgs.onSuccess = (response) => {
      this.setNoteScroller({calledFrom}).then((noteScrollerInit) => {
        this.updateControlStats();
        if (this.options.isMobileBuild) {
          this.domBinding.scrollingNotesWrapper.style.transform = "translateX(0px)";
        }
        debug("Audio successfully loaded.", this.synthControl);
        callEvery(onSuccess, {callbackArgs: this});
      });
    }
    //only reuse if the tuning chnaged
    if (shouldReuseInstances(calledFrom) && this.midiBuffer) { 
      debug(`resuing midiBuffer instance`);
      this._setTune({...tuneArgs, resolve, reject}); 
    } 
    else {
      this.createMidiBuffer().then((response) => {
        debug(`creating new midiBuffer instance`, this.midiBuffer);
        this._setTune({...tuneArgs, resolve, reject}); 
      }).catch(reject);
    }
  });
}

ABCPlayer.prototype._setTune = function _setTune({calledFrom, userAction, onSuccess, onError, resolve, reject} = {}) {
  this.settingTuneStart(this.currentTuneIndex);
  this.synthControl?.setTune?.(this.audioParams.visualObj, userAction, this.audioParams.options).then((response) => {
    debug("setTune 1:", response);
    //if its called by anything other than  tempo
    this.setCurrentSongNoteSequence({visualObj: this.audioParams.visualObj, onFinish: (result) => {
      debug(`Set current note sequence ${result}`);
      const compatiblePitches = this.instrument?.getCompatiblePitches({abcSong: this.currentSong});
      const pitches = this.currentSong.getDistinctPitches();
      this.currentSong.compatibility = {
        playableNotes: this.currentSong.getDistinctNotes(),
        playablePitches: this.currentSong.getDistinctPitches(),
        compatibleNotes: this.instrument?.getCompatibleNotes({abcSong: this.currentSong}),
        compatiblePitches,
        pitchReached: {
          min: _.min(compatiblePitches.compatible),
          max: _.max(compatiblePitches.compatible),
        }
      };
      this.domBinding.compatibility.dataset.tooltip = `Playable: ${this.currentSong.compatibility.compatibleNotes?.compatible.join(" ")} -  Unplayable: ${this.currentSong.compatibility.compatibleNotes?.unplayable.join(" ")} - Incompatible: ${this.currentSong.compatibility.compatibleNotes?.incompatible.join(" ")}`;
      debug("setTune 2:", this.currentSong);
      onSuccess && onSuccess({response});
      resolve?.({response, playerInstance: this});
      this.settingTuneFinish();
    }});
  })
  .catch((error) => {
    this.settingTuneFinish();
    reject(error);
    onError && onError(error); 
    console.warn("Audio problem:", error);
  });
}

ABCPlayer.prototype.setNoteScroller = function setNoteScoller({calledFrom}) {
  return new Promise((resolve, reject) => {
    if (!["tempo"].includes(calledFrom)) {
      //set the current scrolling tuning css and html element if eniteNoteSequence 
      if (_.get(this.domBinding, "scrollingNotesWrapper") && _.get(this.currentSong, "entireNoteSequence")) {
        const cK = this.instrument.getTuningKeyAbbr();
        updateClasses(this.domBinding, "scrollingNotesWrapper", [`scrolling_notes-playable_tuning-${cK}`]);
        this.noteScrollerClear({
          onFinish: () => {
            debug("clear onFinish");
            this.noteScrollerAddItems({
              onFinish: (noteScrollerInit) => {
                resolve(noteScrollerInit);
              }
            });
          }
        });
      }
      else {
        //either the scroller dom was missing or the entireNoteSequence is empty
        resolve();
      }
    }
    else {
      //its called from something we're not interested in.
      resolve();
    }
  });
}

function shouldReuseInstances(calledFrom, from = ["tuning"]) {
  return from.includes(calledFrom);
}

ABCPlayer.prototype.createMidiBuffer = function createMidiBuffer() {
  this.audioParams.visualObj.formatting.bagpipes = true;
  this.midiBuffer = new this.abcjs.synth.CreateSynth();
  return this.midiBuffer.init(this.audioParams);
}

//This is called whenever a note is added to the scroller
function scrollingNoteItemIterator({section, item}) {
  const { 
    duration, 
    noteName, 
    pitchIndex, 
    ensIndex, 
    noteTimingIndex, 
    percentage, 
    measureStart 
  } = item;
  if (!pitchIndex) return;
  const dur = _.ceil(duration * 100);
  const durr = _.ceil(duration, 4);
  if (((pitchIndex < _.get(this.currentSong, "compatibility.pitchReached.min") && pitchIndex < this.instrument.getLowestPlayablePitch()) || 
  (pitchIndex > _.get(this.currentSong, "compatibility.pitchReached.max") && pitchIndex > this.instrument.getHighestPlayablePitch()))) {
    section.classList.add(`unplayable_note`);
    section.classList.add(`exceeds_pitch_range`);
    section.classList.add(`exceeded-pitch-${pitchIndex}`);
    section.innerHTML = `<h4>${noteName}</h4>`;
  }
  else if (_.get(this.currentSong, "compatibility.compatiblePitches.incompatible")?.includes?.(pitchIndex)) {
    section.classList.add(`unplayable_pitch-${pitchIndex}`);
    section.classList.add(`unplayable_note`);
    section.classList.add(`incompatible_pitch`);
    section.innerHTML = `<h4>${noteName}</h4>`;
  }
  else {
    section.classList.add(`playable_pitch-${pitchIndex}`);
    section.classList.add(`playable_duration-${dur}`);
    if (this.playerOptions.showPlayableNoteNamesInScroller) { 
      section.innerHTML = `<h4>${noteName}</h4><div></div>`;
    }
    else {
      section.innerHTML = `<div></div>`;
    }
  }
  section.setAttribute("data-ensindex", ensIndex);
  section.setAttribute("data-notetimingindex", noteTimingIndex);
  section.setAttribute("data-percentage", percentage);
  section.setAttribute("data-duration", `${durr}`);
  if (measureStart) section.setAttribute("data-measureStart", "true");
  section.addEventListener("click", this.noteScrollerItemOnClick.bind(this));
}

ABCPlayer.prototype.getNoteScrollerItem = function getNoteScrollerItem({currentNoteIndex} = {}) {
  return dQ(`[data-ensindex="${currentNoteIndex}"]`);
}

ABCPlayer.prototype.noteScrollerItemOnClick = function noteScrollerItemOnClick(e, {currentNoteIndex} = {}) {
  if (!e && isNumber(currentNoteIndex)) {
    const target = this.getNoteScrollerItem({currentNoteIndex});
    e = {target};
  }
  if (!e) return;
  if (e.target.localName !== "section") {
    e = {target: e.target.querySelector("section")};
  }
  if (!e) return;
  this.assessState({currentNoteIndex});
  const noteTimingIndex = _.get(e, "target.dataset.notetimingindex");
  const percentage = _.get(e, "target.dataset.percentage", 0);
  if (noteTimingIndex && percentage) {
    const noteEvent = _.get(this.audioParams, `visualObj.noteTimings[${noteTimingIndex}]`);
    if (noteEvent) {
      const percent = parseFloat(percentage.replace("_","."));
      this.synthControl.randomAccessBy({percent});
    }
    else {
      debugErr(`Both noteTimingIndex and percentage required ${noteTimingIndex} ${percentage}`, noteEvent);
    }
  }
}

ABCPlayer.prototype.noteScrollerAddItems = function noteScrollerAddItems({onFinish} = {}) {
  this.noteScroller && this.noteScroller.addItems({
    lastEl: `<section style="display: none" class="lastItem"><section>`,
    items: this.currentSong.entireNoteSequence, 
    itemIterator: scrollingNoteItemIterator.bind(this),
    onFinish: () => {
      const init = this.noteScroller?.init?.();
      onFinish?.(init);
    }
  });
}

ABCPlayer.prototype.noteScrollerClear = function noteScrollerClear({onFinish}) {
  const scrollingNoteDivs = Array.from(_.get(this.domBinding,"scrollingNotesWrapper.children", []));
  const scrollingNoteDivsLength = scrollingNoteDivs.length;//declared to constantize
  if (scrollingNoteDivsLength) {
    let i, noteDiv;
    for (i in scrollingNoteDivs) {
      noteDiv = scrollingNoteDivs[i];
      const firstChild = _.get(this.domBinding,"scrollingNotesWrapper.firstChild");
      if (firstChild) {
        this.domBinding.scrollingNotesWrapper.removeChild(firstChild);
      } 
      if (parseInt(i) === scrollingNoteDivsLength - 1) {
        onFinish && onFinish();
      }
    }
  }
  else {
    onFinish && onFinish();
  }
}

function CursorControl({
  onBeatChange,
  playerInstance,
}) {
  var self = this;
  const shouldShowSheetMusic = playerInstance?.playerOptions?.showSheetMusic;
  if (shouldShowSheetMusic) {
    self.onStart = onStart;
    self.onFinished = onFinished;
  }
  self.beatSubdivisions = 2;
  self.onBeat = function(beatNumber = 0, totalBeats = 0, totalTime = 0) {
    if (onBeatChange) onBeatChange({beatNumber, totalBeats, totalTime});
  };
  self.onEvent = function(ev) {
    if (ev.measureStart && ev.left === null)
      return; // abcPlayer was the second part of a tie across a measure line. Just ignore it.
    if(ev.midiPitches && ev.midiPitches.length && ev.midiPitches[0].cmd == "note") {
      playerInstance?.onNoteChange({event: ev, midiPitch: ev.midiPitches[0]});
    }
    
    if (!shouldShowSheetMusic) return; 

    var lastSelection = dQAll("#paper svg .highlight");
    for (var k = 0; k < lastSelection.length; k++)
      lastSelection[k].classList.remove("highlight");

    //var el = dQ(".feedback").innerHTML = "<div class='label'>Current Note:</div>" + JSON.stringify(ev, null, 4);
    for (var i = 0; i < ev.elements.length; i++ ) {
      var note = ev.elements[i];
      for (var j = 0; j < note.length; j++) {
        note[j].classList.add("highlight");
      }
    }

    var cursor = dQ("#paper svg .abcjs-cursor");
    if (cursor) {
      cursor.setAttribute("x1", ev.left - 2);
      cursor.setAttribute("x2", ev.left - 2);
      cursor.setAttribute("y1", ev.top);
      cursor.setAttribute("y2", ev.top + ev.height);
    }
  };
  function onStart() {
    var svg = dQ("#paper svg");
    if (!svg) return;
    var cursor = document.createElementNS("https://www.w3.org/2000/svg", "line");
    cursor.setAttribute("class", "abcjs-cursor");
    cursor.setAttributeNS(null, 'x1', 0);
    cursor.setAttributeNS(null, 'y1', 0);
    cursor.setAttributeNS(null, 'x2', 0);
    cursor.setAttributeNS(null, 'y2', 0);
    svg.appendChild(cursor);
  }
  function onFinished() {
    var els = dQAll("svg .highlight");
    for (var i = 0; i < els.length; i++ ) {
      els[i].classList.remove("highlight");
    }
    var cursor = dQ("#paper svg .abcjs-cursor");
    if (cursor) {
      cursor.setAttribute("x1", 0);
      cursor.setAttribute("x2", 0);
      cursor.setAttribute("y1", 0);
      cursor.setAttribute("y2", 0);
    }
  };
}
