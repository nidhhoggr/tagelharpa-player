import { player as _player, instrument, hps, _base } from './base';

const config = {
  ..._base,
  shouldDebug: false,
  debugDisabledModules: ["state"],//disable debugging in these modules
  prodDomain: "mobile.folktabs.com",
  isMobileBuild: true,
  environment: "mobile",
}

const player = {
  ..._player,
}

export default {
  ...config,
  player,
  instrument,
  hps,
};
