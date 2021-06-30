# Tagelharpa Player

## Features

* Bootstrapped with [Webpack4 Boiler Plate](https://weareathlon.github.io/frontend-webpack-boilerplate/)
* Built on top of a customized version of [ABCJS](https://paulrosen.github.io/abcjs/)
* Build with local ABC files and add more ABC songs at runtime.
* Page View Mode to view the entire song in portait view instead of in a sliding scroller.
* Full Screen Mode with mobile compatibility in mind.
* Disable Repeating Segments to remove any repeating bars. This helps when you need to learn the song without scrolling everywhere.
* Realtime compatibility shows which notes are incompatible with the selected chanter.
* **Simple setup** instructions
  * Start development of a project right away with *simple*, *configured*, *browser synced*, *linter monitored* asset files.
* Example assets directory for reference and **demo** building of:
  * *JavaScript*
  * *SASS*
  * *Images*
  * *Fonts*
* Support for **assets optimization** for production:
  * **Minification** of *JavaScript* and *CSS* files.
  * **Inline** **images** / **fonts** files having file size below a *configurable* threshold value.
* Code style and formatting **linters** configuration and setup for:
  * *SASS*
  * *JavaScript*
* Latest [Webpack 4](https://github.com/webpack/webpack) - *JavaScript* module bundler.
* Latest [SASS/CSS](https://github.com/sass/node-sass) compiler based on `node-sass` which provides bindings to `libsass`.
* Latest [Babel 7](https://github.com/babel/babel) (`@babel/core`) - JavaScript compiler - _Use next generation JavaScript, today._
* Configured and ready to use **BrowserSync** plugin - `browser-sync-webpack-plugin`

## Custom ABC Directives

### BPM

* The BPM can be controlled using native abcjs implementation with major difficulties. A convenience directive was added to simplify this.
* The directive must be wrapped in double qoutes
```
Q: "BPM=100"
```

### Transposition

* Not reccomended, it's instead ideal to transpose the song to your preference before adding it to the player. 
* This will add additional steps to the rendering process which could introduce bugs and slower load times.
* This can be added to the Key header (K:) but do not specify this header twice or one will be ignored (as with all headers).
```
K: Amin transpose=1
```
### Setting the instrument tuning

* You can specify an interger value for tuning.
- `0` gCG

```
K: Amin tuning=1
```

### Ommiting DMCA protected Songs

This is useful when you want to load a song in the loader without both committing it to git and deploying it to your production environment. I have several songs that are copyrighted and would otherwise feel best not making them available to the general public, yet still want it to load in my non-production environment:

> simply prefix the filename with `dmca-{songnamehere}.abc`

### Disabling Songs

This is useful when you want to disable a song without completely removing it from your project directory. Any file matching this criteria won't load in any environment(prod, dev or mobile) nor be commited to version control.

> simply prefix the filename with `disabled-{songnamehere}.abc` or put it in the `src/abc/disabled` folder.

## Requirements

* `node` : `^10 || ^12 || >=14`
* `npm`

# Setup

## Installation

1. Install all dependencies using `npm` clean install. 

```sh 
$ npm ci
```

> More on the clean install npm command can be read here [`npm ci`](https://docs.npmjs.com/cli/ci.html)

> You can still use `npm install` in cases the `npm ci` raises system error due to specific platform incompatibilities.

## Development / Build Assets

### Assets Source

* ABC files are located under `/src/abc/`
* _SASS_ files are located under `/src/scss/`
* _JavaScript_ files with support of _ES6 / ECMAScript 2016(ES7)_ files are located under `/src/js/`
* _Image_ files are located under `/src/images/`
* _Font_ files are located under `/src/fonts/`
* _HTML_ files are located under `/src/`

### Build Assets

```sh
$ npm run build
```

### Enable Source Files Watcher

```sh
$ npm run watch
```

> Define any other files that needs syncing in `files:[]` section under `BrowserSyncPlugin` in `webpack.config.js`

*BrowserSync UI* can be reached by default on this location: http://localhost:3001


