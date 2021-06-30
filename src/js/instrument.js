import _ from 'lodash';
import utils from "./utils";
const { isNumber, debug } = utils({from: "instrument"});
export const possibleTunings = ["gCG"];

function Instrument({
  tuningKeyIndex = 0,//the key of the tuning 
  playableExtraNotes = {},//an array of playable notes because some instruments can play more notes,
  dronesEnabled = [],//an array of notes for the drones enabled, uses ABC for pitches
  pitchToNoteName,//utility function to do what it says
}) {
  this.possibleTunings = possibleTunings;
  this.playableExtraNotes = playableExtraNotes[tuningKeyIndex];
  this.tuningKeyIndex = tuningKeyIndex;
  this.tuningKey = this.possibleTunings[tuningKeyIndex];
  this.pitchToNoteName = pitchToNoteName;
}

export default Instrument;

Instrument.prototype.getTuningKeyAbbr = function getTuningKeyAbbr() {
  switch (this.tuningKey) {
    case "gCG": 
      return _.replace(_.lowerCase(this.tuningKey)," ","");
    default:
      return "invalidTuningKey";
  }
}

Instrument.prototype.getLowestPlayablePitch = function() {
  const notes = this.getPlayableNotes({pitchesOnly: true});
  return _.min(notes);
}

Instrument.prototype.getHighestPlayablePitch = function() {
  const notes = this.getPlayableNotes({pitchesOnly: true});
  return _.max(notes);
}

Instrument.prototype.getPlayableNotes = function getPlayableNotes({tuningKey, notesOnly, pitchesOnly} = {}) {
  if (!tuningKey) tuningKey = this.tuningKey;
  let notes = {};
  let pitches = [];
  switch (tuningKey) {
    case "gCG": {
            // 0 |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |  9  |  10 |  11 |  12 | 
            // G    Ab    A     Bb    B     C↩ 
            // C    Db    D     Eb    E     F     Gb    G↩
            // G    Ab    A     Bb    B     C     Db    D     Eb    E     F     Gb    G
            
            // 0 |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |  9  |  10 |  11 |  12 | 
            // 55   56    57    58    59    60↩ 
            // 60   61    62    63    64    65    66    67↩
            // 67   68    69    70    71    72    73    74    75    76    77    78    79

      notes = {
        "G": [55,67,79],
        "Ab": [56,68],
        "A": [57,69],
        "Bb": [58,70], 
        "B": [59,71], 
        "C": [60,72],
        "Db": [61,73],
        "D": [62,74],
        "Eb": [63,75],
        "E": [64,76],
        "F": [65,77],
        "Gb": [66,78]
      };
      break;
    }
  }
  if (_.keys(this.playableExtraNotes)?.length > 0) {
    if (notesOnly) {
      notes = [
        ..._.keys(notes),
        ..._.keys(this.playableExtraNotes),
      ]
    }
    else if (pitchesOnly) {
      notes = [
        ..._.flatten(_.values(notes)),
        ..._.flatten(_.values(this.playableExtraNotes))
      ]
    }
  }
  else {
    if (notesOnly) {
      notes = _.keys(notes)
    }
    else if (pitchesOnly) {
      notes = _.flatten(_.values(notes));
    }
  }
    
  return notes;
}


//@TODO this need  to use pitch comparison, note string comparison by note name
Instrument.prototype.getCompatibleNotes = function getCompatibleNotes({abcSong}) {
  const mapToNoteNames = (arr) => {
    return arr.map((a) => this.pitchToNoteName[a]);
  }
  /*
  const playableSong = abcSong.getDistinctNotes();
  const playableTuning = this.getPlayableNotes({"notesOnly": true});
  const compatible = _.intersection(playableSong, playableTuning);
  const _incompatible = _.xor(playableSong, playableTuning)
  return {
    compatible,//notes in the song playable on the chnater
    _incompatible,//notes only in the song OR the playlist
    incompatible: _.difference(playableSong, playableTuning),
    unplayable: _.difference(playableTuning, playableSong),//these are notes that exist in the tuning but not the song
  }
  */
  const {compatible, _incompatible, incompatible, unplayable} = this.getCompatiblePitches({abcSong});
  return {
    compatible: mapToNoteNames(compatible),//notes in the song playable on the chnater
    _incompatible: mapToNoteNames(_incompatible),//notes only in the song OR the playlist
    incompatible: mapToNoteNames(incompatible),
    unplayable: mapToNoteNames(unplayable)
  }
}


//@TODO this need  to use pitch comparison, note string comparison by note name
Instrument.prototype.getCompatiblePitches = function getCompatiblePitches({abcSong}) {
  const playableSong = abcSong.getDistinctPitches();
  const playableTuning = this.getPlayableNotes({"pitchesOnly": true});
  const compatible = _.intersection(playableSong, playableTuning);
  const _incompatible = _.xor(playableSong, playableTuning)
  return {
    compatible,//notes in the song playable on the chnater
    _incompatible,//notes only in the song OR the playlist
    incompatible: _.difference(playableSong, playableTuning),
    unplayable: _.difference(playableTuning, playableSong),//these are notes that exist in the tuning but not the song
  }
}


Instrument.prototype.setTuningKey = function setTuningKey(tuningKey = null) {
  if (!tuningKey) {
    this.tuningKey = this.possibleTunings[0];
  }
  if(this.possibleTunings.includes(tuningKey)) {
    this.tuningKey = tuningKey;
    this.tuningKeyIndex = _.indexOf(this.possibleTunings, tuningKey);
  }
}

Instrument.prototype.getTuningKeyByIndex = function getTuningKeyByIndex(tuningKeyIndex) {
  if (!isNumber(tuningKeyIndex)) throw new Error(`${tuningKeyIndex} is not numeric`);
  tuningKeyIndex = tuningKeyIndex % this.possibleTunings.length;
  return this.possibleTunings[tuningKeyIndex];
}

Instrument.prototype.getTuningKeyIndex = function getTuningKeyIndex({tuning}) {
  return _.indexOf(this.possibleTunings, tuning);
}
