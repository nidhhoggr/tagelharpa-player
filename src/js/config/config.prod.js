import { player, instrument, hps, _base} from './base';

const config = {
  ..._base,
  shouldDebug: false,
  debugDisabledModules: ["state"],//disable debugging in these modules
  prodDomain: "tagelharpa.folktabs.com",
  isMobileBuild: false,
  environment: "prod",
}

export default {
  ...config,
  player,
  instrument,
  hps,
};
