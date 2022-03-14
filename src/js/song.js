import _ from 'lodash';
import { possibleTunings } from "./instrument";
import utils from "./utils";
const {
  debug,
  debugErr,
} = utils({from: "song"});

function ABCSong(song) {
  //prevent reloading twice
  if (song instanceof ABCSong) {
    debug(`preventing ${song.abc} from loading twice`);
    return song
  }
  if (!song) throw new Error("Song object is required ");
  this.name = song.name;
  this.tempo = song.tempo;
  this.abc = song.abc;
  this.transposition = song.transposition || 0;
  this.tuning = song.tuning || 0;//the chnater key index
  this.allNotes = [];
  this.entireNoteSequence = [];
  this.playerInstance = song.playerInstance;
  this.original = {
    tempo: this.tempo,
    transposition: this.transposition,
    tuning: this.tuning
  };
  debug("ORIG", song, this.original);
  /**
   *  //loaded when the tune is set,
   *    used to peform various analytics and calculations
   *
   * this.entireNoteSequence;
   */
  this.options = {
    "infoFieldMapping": getInfoFieldMapping(),
    "infoFieldKeyMapping": swap(getInfoFieldMapping())
  };

  this.load();
}

function getInfoFieldMapping({key} = {}) {
  const mapping = {
    "X": "Reference Number",
    "T": "Tune Title",
    "C": "Composer",
    "O": "Origin",
    "A": "Area",
    "M": "Meter",
    "L": "Unit Note Length",
    "Q": "Tempo",
    "P": "Parts",
    "Z": "Transcription",
    "N": "Notes",
    "G": "Group",
    "H": "History",
    "K": "Key",
    "R": "Rhythm",
    "F": "Media",
  };
  if (key) {
    return mapping[key];
  }
  else {
    return mapping;
  }
}


function swap(json){
  var ret = {};
  var field;
  for(var key in json){
    field = json[key];
    field = field.replace(/\s/g, '_');
    field = field.toLowerCase();
    ret[field] = key;
  }
  return ret;
}

ABCSong.prototype.lineIterator = function(perform) {
  const newLineDelimited = this.abc.split("\n");
  return newLineDelimited.map((line, key) => {
    perform(line, {
      key,
      isLastLine: (key == newLineDelimited.length - 1)
    });
  });
}

ABCSong.prototype.load = function() {
  let _tmpAbc = [];
  let abcWasModified = false;
  this.lineIterator( (line, {key, isLastLine}) => {
    const infoFieldKey = line.isInfoField();
    let matched = false, lineWasModified = false;
    switch (infoFieldKey) {
      case "Media": 
        this.media ??= line.substring(2);
        break;
      case "Tune Title":
        if (this.name) {
          this.name = this.name + " " + line.substring(2);
        }
        else {
          this.name = line.substring(2);
        }
        break;
      case "Key":
        if (this.transposition) return;
        //note, this is not to be confused with the native directive
        //for transposition which is spelled "transpose=[integer]"
        //this allows leveraging of both simultaneously or one or 
        //the other exclusively. trust that you will need to experiment
        //with all different permutations depending on the song and
        //its musical composition
        matched = line.match(/transposition=(0|-?[1-9])/);
        let transposition = 0;
        if (matched?.[1]) {
          transposition = parseInt(matched[1]);
          this.transposition = transposition
          this.original.transposition ??= transposition;
        }
        
        matched = line.match(/fgp=(0|1)/);
        let fgp = 0;
        if (matched?.[1]) {
          fgp = parseInt(matched[1]);
          this.fgp = fgp;
          this.original.fgp ??= fgp;
        }

        matched = line.match(/sgp=(0|1)/);
        let sgp = 0;
        if (matched?.[1]) {
          sgp = parseInt(matched[1]);
          this.sgp = sgp;
          this.original.sgp ??= sgp;
        }

        matched = line.match(/tuning=(0|1|2)/);//@TODO make dynamic to match any tuning key
        let tuning = 0;
        if (matched?.[1]) {
          tuning = parseInt(matched[1]);
          this.tuning = tuning;
          this._tuning = possibleTunings[tuning];
          this.original.tuning = tuning;
        }

        break;
      case "Tempo":
        //we already set the custom tempo for this song
        if (this.hasCustomTempo) return;
        //this is not to be confused with the native directive
        //for tempo which uses meters and allows arbitrary comments 
        //wrapped in double-qoutes which we utilize for parsing
        //the BPM we desire.
        matched = line.match(/"BPM=(\d+)/);
        let tempo = this.tempo;
        if (matched?.[1]) {
          this.hasCustomTempo = true;
          tempo = parseInt(matched[1]);
          this.tempo = tempo;
          this.original.tempo = tempo;
        }
        break;
    }
    
    if(!infoFieldKey) {
      if(this.playerInstance?.isEnabled.disableRepeatingSegments) {
        if (line.includes("|:")) {
          _tmpAbc[key] = line = line.replace("|:", "|");
          lineWasModified = true;
        }
        if (line.includes(":|")) {
          _tmpAbc[key] = line = line.replace(":|", "|");
          lineWasModified = true;
        }
        if (lineWasModified) {
          debug(`load() - replacing repeating segments`);
          abcWasModified = true;
        }
      }
    }

    if (!lineWasModified) _tmpAbc[key] = line;

    if (isLastLine && abcWasModified) {
      this.abc = _tmpAbc.join("\n");
    }
  });
}

String.prototype.isCharsetHeader = function() {
  return this.toString().includes("abc-charset");
}

String.prototype.isInfoField = function() {
  const infoFieldPrefix = this.toString().substr(0, 2);
  const fieldMapping = getInfoFieldMapping();
  return ((infoFieldPrefix && infoFieldPrefix[1] == ":") && fieldMapping[infoFieldPrefix[0]]);
}

String.prototype.containsPrefix = function(prefix) {
  return this.toString().indexOf(`${prefix}:`) == 0;
}

String.prototype.withoutPrefix = function(prefix) {
  return this.toString().replace(`${prefix}:`, "");
}

String.prototype.isEmpty = function() {
  return _.isEmpty(_.trim(this.toString()));
}

ABCSong.prototype.insertInformationField = function({line}) {
  if (!line.isInfoField()) {
    return false;
    debugErr(`prefix is malformed and requires a : delimiter: ${line}`);
  }
  
  const key = line[0];
  const mappingValue = getInfoFieldMapping({key});

  if (!mappingValue) {
    debugErr(`Could not get mapping from prefix: ${key}`); 
  }
  const newLineDelimited = this.abc.toString().split("\n");
  const newLineDelimitedLength = newLineDelimited.length; 
  let i, _line, infoFields, songLines;
  for (i in newLineDelimited) {
    _line = newLineDelimited[i];
    if (!_line.isInfoField() && !_line.isCharsetHeader() && !_line.isEmpty()) {
      infoFields = newLineDelimited.slice(0, i);
      songLines = newLineDelimited.slice(i);
      break;
    }
  }
  infoFields.push(line);
  debug({infoFields, songLines});
  this.abc = [
    ...infoFields,
    ...songLines
  ].join("\n");
  return this.abc.includes(line);
}

/*
   noteName,
   pitchIndex,
   duration,
   durationReached,
   _percentage: percentage,
   percentage: percentage.toString().replace(".","_"*
*/

//@TODO MEmoize as an instance of currentSong
ABCSong.prototype.getDistinctNotes = function() {
  if (!this.entireNoteSequence) return;
  return _.reject(_.uniq(this.entireNoteSequence.map(({noteName}) => {
    if (!noteName) return;
    const strippedPitchNote = noteName.match(/^[A-Za-z]+/);
    return strippedPitchNote[0];
  })), _.isUndefined);
}

//@TODO MEmoize as an instance of currentSong
ABCSong.prototype.getDistinctPitches = function() {
  if (!this.entireNoteSequence) return;
  return _.reject(_.uniq(this.entireNoteSequence.map(({pitchIndex}) => {
    if (!pitchIndex) return;
    return pitchIndex
  })), _.isUndefined);
}

ABCSong.prototype.getInformationByFieldName = function({fieldName, flatten = true}) {
  const fieldKey = this.options.infoFieldKeyMapping[fieldName];
  const found = [];
  this.lineIterator((line, {isLastLine}) => {
    if (line.containsPrefix(fieldKey)){
      found.push(line.withoutPrefix(fieldKey));
    }
    else if (isLastLine) {
      
    }
  });
  if (flatten) {
    return found.join(" ");
  }
  else {
    return found;
  }
}

ABCSong.prototype.setTempo = function(tempo) {
  this.tempo = tempo;
  const fieldKey = this.options.infoFieldKeyMapping["tempo"];
  let tempoFound = false;
  this.lineIterator((line, {isLastLine}) => {
    if (line.containsPrefix(fieldKey)){
      debug(`Replacing existing tempo ${line}`);
      this.abc = this.abc.replace(line, `${fieldKey}: ${tempo}`);
      tempoFound = true;
    }
    else if (isLastLine && !tempoFound) {
      debug(`Inserting info field for tempo: ${tempo}`);
      const inserted = this.insertInformationField({line: `${fieldKey}: ${tempo}`});
      debug({inserted});
    }
  });
}

ABCSong.prototype.setTransposition = function(semitones, cb) {
  const fieldKey = this.options.infoFieldKeyMapping["key"];
  const stringReplacement = `transpose=${semitones}`;
  let isSet = false;
  this.lineIterator((line, {isLastLine}) => {
    if (line.containsPrefix(fieldKey)){
      const transpoisitionMatched = line.match(/transpose=(?:-?\d+)?$/);
      if (transpoisitionMatched) {//transposition already exists
        debug(`Replacing existing transposition ${line}`);
        this.abc = this.abc.replace(transpoisitionMatched[0], stringReplacement);
        isSet = true;
      }
      else {//transpoisition doesnt exist so we simply add it
        debug(`Transposition doesnt exist so well add it to ${line}`);
        const stripped  = line.replace(/(\r\n|\n|\r)/gm, "");
        this.abc = this.abc.replace(line, `${stripped} ${stringReplacement}`);
        isSet = true;
      }
    }
    else if (isLastLine && !isSet) {//last line and doesnt contain prefix
      debug(`Transposition nor Key exists so well insert a line`);
      this.insertInformationField({line: `${fieldKey}: ${stringReplacement}`});
    }

    if (isLastLine && cb) {
      cb({isSet, abc: this.abc});
    }
  });
}


export default ABCSong;
