export const _base = {
  soundFontDir: "midi-js-soundfonts/FluidR3_GM/",
  errorReloadLimit: 5,
  errorReloadResetDuration: 20000,//in milliseconds
  shouldDebug: true,
  debugDisabledModules: [],//"state"],//disable debugging in these modules,
  mobileMaxWidth: 555//width exceeding beyond are not considered mobile
}

export const player = {
  currentInstrumentIndex: 41,//41 = viola, 42 = cello
  refreshWhenPossible: false,
  getSoundFontUrl: (config) =>  window.location.hostname.includes(config.prodDomain) ? `https://${config.prodDomain}/${config.soundFontDir}` : `http://localhost:3000/${config.soundFontDir}`,
  keyCodes: {
    prev: 118,
    next: 120,
    play: 119,
    esc: 27,
    refresh: 116,
    fullscreen: 70,
  },
  showPlayableNoteNamesInScroller: true,
  showSheetMusic: true,
  showNoteDiagram: true,
  stateAssessmentLoopInterval: 5000,//how often to check the state,
  stateAssessmentInactivityTimeout: 60000 * 60,
  tempoLimits: {
    min: 20,
    max: 180,
  },
  transpositionLimits: {
    min: -12,
    max: 12
  },
  visualOptions: {
    displayWarp: false,
    displayLoop: false,
    displayRestart: false,
    displayPlay: false,
    displayProgress: false
  },
  abcOptions: {
    bagpipes: true,
    add_classes: true,
    responsive: "resize",
  },
  abcSongEditorDefaultText: `%%abc-charset utf-8
X: Reference Number
T: Title
S: Subtitle
R: Rhythm
Z: Transcriber
M:3/4
L:1/8
Q: "BPM=100"
K: Am transpose=0 tuning=0
G, _A, =A, _B, =B, C _D =D _E =E F _G =G _A =A _B =B c _d =d _e =e f _g =g`
};

export const instrument = {
  tuningKey: "gCG",
  playableExtraNotes: {
    0: {}
  }
}

export const hps = {
  ease: 0.025,
  sectionWidth: 58,
  sectionOffset: 0,
  wrapperName: ".scrollingNotesWrapper"
}
