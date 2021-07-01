import utils from "./utils";
import config from "config";

const {
  isNumber, 
  isPositiveNumber,
  debug,
  debugErr,
  debugAll,
  callEvery,
} = utils({from: "state"});

var idleInterval;
var state = {
  isActive: true,
  onReactivate: null,
};

function StateManagement({options} = {}) {
  this.options = options;
  this.activityQueue = [];
}

StateManagement.prototype.getState = () => (state);

StateManagement.prototype.onAssessState = function onAssessState({playerInstance, onFinish, changeSong}) {
   const { 
    tempo, 
    transposition, 
    currentTuneIndex, 
    currentNoteIndex,
    getCurrentTuningIndex,
    enableScrolling,
    isScrollingEnabled,
    instrumentOptions,
    errorReloadCount,
    isSettingTune,
    isEnabled,
    storage
  } = playerInstance;

  if (isSettingTune?.call(playerInstance)) return debugAll(`Cannot modify state when setting tune`);

  if (changeSong && isNumber(currentTuneIndex)) {
    if (this.options?.player?.refreshWhenPossible) {
      window.location.href = window.location.origin + window.location.pathname + `?cti=${currentTuneIndex}`
    }
    else {
      try {
        history.replaceState({}, null, `?cti=${currentTuneIndex}`);
        storage?.setMerge?.call(playerInstance, {key: "cti", val: currentTuneIndex}); 
      } catch(err) {
        console.error(err);
      }
      setTimeout(() => {
        onFinish && onFinish();
      }, 100);
    }
  }
  else if (!state.isActive) {
    debug("State isActive return early")
    return;
  }
  else {
    const stateArray = [];
    const currentTuningIndex = getCurrentTuningIndex?.call(playerInstance, undefined);
    isNumber(tempo) && stateArray.push(["ct", tempo]);//contains zero to reset for next initialization
    isNumber(transposition) && stateArray.push(["ctp", transposition]);//contains zero
    isNumber(currentTuneIndex) && stateArray.push(["cti", currentTuneIndex]);//contain zero
    isNumber(currentNoteIndex) && stateArray.push(["cni", currentNoteIndex]);
    isNumber(currentTuningIndex) && stateArray.push(["cci", currentTuningIndex]);//contains zero
    stateArray.push(["pve", isEnabled?.pageView  ? 1 : 0]);

    //sometimes the scroller is disabled when it shouldn't be
    if (isEnabled?.pageView && !isScrollingEnabled?.call(playerInstance)) {
      enableScrolling?.call(playerInstance);
    }

    stateArray.push(["drs", isEnabled?.disableRepeatingSegments ? 1 : 0]);
    stateArray.push(["ddm", isEnabled?.disableDurationalMargins ? 1 : 0]);
    
    if (isPositiveNumber(errorReloadCount)) {
      const errReload = parseInt(errorReloadCount);
      if (errReload < config.errorReloadLimit) {
        stateArray.push(["erc",  errorReloadCount]);
      }
      else if (errReload >= config.errorReloadLimit) {
        debugErr("ERROR RELOAD LIMIT REACHED");
        onFinish = undefined;
      }
    }
    const queryParams = new URLSearchParams(window.location.search);
    const qpOld = queryParams.toString();
    stateArray.forEach((sa, i) => {
      queryParams.set(sa[0], sa[1]);
      storage?.setMerge?.call(playerInstance, {key: sa[0], val: sa[1]});
      if (i == (stateArray.length - 1)) {
        const qpNew = queryParams.toString();
        if (qpNew !== qpOld) {
          debug("Updating state and url",{qpOld, qpNew, stateArray});
          try {
            history.replaceState(null, null, "?" + queryParams.toString());
          }
          catch(err) {
            console.error(err);
          }
          onFinish?.();
        }
        else if(qpNew == qpOld) {
          debug("State unchanged, nothing to do", onFinish);
          onFinish?.();
        }
      }
    });
  }
}

StateManagement.prototype.idleWatcher = function idleWatcher({onInaction, inactiveTimeout = 20000, onReactivate, playerInstance}) {
  const self = this;
  function resetTimer () {
    state.isActive = true;
    debug("activity detected", {onInaction, inactiveTimeout});
    clearTimeout(idleInterval);
    let i, aqcb;
    callEvery(self.activityQueue, {timeout: 100, dequeue: true});
    if (onReactivate && state.wasInactive) {
      onReactivate();
    }
    else {
      debug("reactivate was null");
    }
    idleInterval = setTimeout(() => {
      state.isActive = false;
      state.wasInactive = true;
      debug("inactivity detected");
      onInaction && onInaction();
    }, inactiveTimeout);  // time is in milliseconds
  }
  window.onload = resetTimer;
  window.onmousemove = resetTimer;
  window.onmousedown = resetTimer;  // catches touchscreen presses as well      
  window.ontouchstart = resetTimer; // catches touchscreen swipes as well 
  window.onclick = resetTimer;      // catches touchpad clicks as well
  window.onkeydown = resetTimer;   
  window.addEventListener('scroll', resetTimer, true); // improved; see comments
}

export default StateManagement;
