import _ from "lodash";
import config from "config";
import utils from "./utils";
const {
  debug,
  debugErr,
} = utils({from: "storage"});

function Storage({namespace}) {
  this.get = () => {
    const storage = window.localStorage.getItem(namespace);
    if (storage) {
      let parsed;
      try {
        parsed = JSON.parse(storage);
      }
      catch(err) {
        return storage;
      }
      return parsed;
    }
  };
  this.set = (val) => window.localStorage.setItem(namespace, JSON.stringify(val));
  this.setMerge = ({key, val, obj}) => {
    const storage = this.get() || {};
    if (obj) {
      Object.assign(storage, obj);
    }
    else if(key) {
      storage[key] = val;
    }
    this.set(storage);
  };
  this.clear = window.localStorage.clear 
}

export default Storage;
