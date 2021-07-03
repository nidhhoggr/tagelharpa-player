import _ from 'lodash';
import abcTransposer from "abc-transposer";
import "../scss/app.scss";
import abcjs from "./abcjs";
import "./abcjs/abcjs-audio.css";
import "../scss/audio.css";
import "../scss/vanilla-js-dropdown.css";
import ABCSongs from "./songs";
import ABCSong from "./song";
import ABCPlayer from "./player";
import Instrument from "./instrument";
import Storage from "./storage";
import config from "config";
import HPS from "./hps";
import StateManagement from "./state";
import tippy from 'tippy.js';
import "tippy.js/dist/tippy.css";
import CustomSelect from "./vanilla-js-dropdown";
import "ldcover/dist/ldcv.min.css";
import ldCover from "ldcover/dist/ldcv.min.js";
import "lite-youtube-embed/src/lite-yt-embed.css";
import "lite-youtube-embed/src/lite-yt-embed.js";
const stateMgr = new StateManagement({options: config});
const songs = new ABCSongs({
  ioc: {
    ABCSong,
    Storage,
  }
});
const abcPlayer = new ABCPlayer({
  abcjs,
  abcTransposer,
  songs,
  ioc: {//classes that need instantation (inversion of control)
    Instrument, 
    HPS, 
    CustomSelect,
    ldCover,
    Storage
  },
  stateMgr, 
  options: config
});
abcPlayer.load().then(({player}) => {
  if (!player.options.isMobileBuild) tippy('[data-tooltip]', {
    onShow(instance) {
      const tooltip = _.get(instance, "reference.dataset.tooltip");
      tooltip && instance.setContent(tooltip);
      return !!tooltip;
    }
  });
});
