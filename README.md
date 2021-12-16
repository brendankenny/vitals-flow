# vitals-flow

A [Lighthouse](https://github.com/GoogleChrome/lighthouse) plugin and runner to experiment with Lighthouse [user flows](https://web.dev/lighthouse-user-flows/) to simulate user interactions and measure [Core Web Vitals](https://web.dev/vitals/) in the lab.

This repo is for iterating on user flow ergonomics and the new [responsiveness metric](https://web.dev/responsiveness/)—so feel free to file issues or PRs—but in the long term, changes will need to land in Lighthouse core.

This is not an officially supported Google product.

<p align="center">
<img width="500px" alt="Lighthouse user-flow report showing basic Web Vitals metrics" src="https://user-images.githubusercontent.com/316891/141843947-921a31af-c536-494c-aa6e-2530af2f19fa.png">
</p>

## Table of Contents

- [Getting Started](#getting-started)
- [Basic usage](#basic-usage)
- [Plugin with Lighthouse user flows](#plugin-with-lighthouse-user-flows)
- [Plugin with interaction runner](#plugin-with-interaction-runner)
- [Plugin with interaction runner and hacked perf section](#plugin-with-interaction-runner-and-hacked-perf-section)

## Quick start

- `git clone git@github.com:brendankenny/vitals-flow.git`
- `cd vitals-flow`
- `yarn`
- `yarn demo`

## Basic usage

The `lighthouse-plugin-web-vitals` plugin adds FID and responsiveness audits so that all the Core Wev Vitals are available in a lab setting. When run, these are found in a "Lab Web Vitals" section in the Lighthouse report.

The plugin is compatible with any Lighthouse run, for instance on the command line:

```sh
yarn lighthouse https://example.com --plugins lighthouse-plugin-web-vitals --view
```

However, because there's no FID or responsiveness without user input and Lighthouse doesn't simulate input by default, these audits won't show any results.

## Plugin with Lighthouse user flows

The plugin can be used in conjunction with Lighthouse [user flows](https://web.dev/lighthouse-user-flows/) to capture metrics while user input is being simulated. To run in a Lighthouse `timespan`, add the plugin to the step's config overrides:

```js
await flow.startTimespan({stepName: 'Interactions', configContext: {
  settingsOverrides: {
    // Bring in web-vitals plugin.
    plugins: ['lighthouse-plugin-web-vitals'],
    onlyCategories: [
      // To trim out the other categories.
      'lighthouse-plugin-web-vitals',
      'performance',
    ],
  },
}});

```

See a full example in [`examples/user-flow-report.js`](examples/user-flow-report.js).

[<img width="800px" alt="Lighthouse user-flow report showing basic Web Vitals metrics" src="https://user-images.githubusercontent.com/316891/141837210-828e878e-44cd-49d7-8f2d-d581692a0ccd.png">](https://googlechrome.github.io/lighthouse/viewer/?gist=ddcb125dbdec78a0a838140c9124e123)

[view live report](https://googlechrome.github.io/lighthouse/viewer/?gist=ddcb125dbdec78a0a838140c9124e123)

To run locally: `node examples/user-flow-report.js`

A few issues:
- it's difficult to set up throttling in this mode (`timespan` wasn't really meant for this)
- some metrics aren't available, e.g. LCP currently only works in the `navigation` mode since it is defined relative to a navigation, but we have to use `timespan` here

## Plugin with interaction runner

This repo also includes an "interaction runner", which creates a [custom config, gatherer, and audit](https://github.com/GoogleChrome/lighthouse/tree/master/docs/recipes/custom-audit), to allow using Lighthouse `navigation` mode but still yield to user code to interact with the page with puppeteer. Since this is a real Lighthouse `navigation`:
- all navigation metrics can run
- regular Lighthouse throttling schemes can be used
- Lighthouse criteria can be used to determine when page load is complete

```js
import {createRunner} from './runner/interaction-runner.js';

async function captureReport() {
  const runner = await createRunner();
  await runner.startNavigation({url: 'https://www.khanacademy.org/'});

  /* Interact with the page using `runner.page` pptr endpoint. */

  await runner.endNavigation();
  await runner.saveReport({filepath: 'khan-sample.report.html', view: true});
}

captureReport();
```

See a full example in [`examples/interaction-runner-report.js`](examples/interaction-runner-report.js).

[<img width="800px" alt="Lighthouse user-flow report showing a more complete look at Web Vitals metrics, including LCP, CLS, FID, and responsiveness" src="https://user-images.githubusercontent.com/316891/141839923-2dad61fa-28b5-4788-912b-3460c3df34d8.png">](https://googlechrome.github.io/lighthouse/viewer/?gist=886ccf783f07655f5baaa326ad50ecfb)

[view live report](https://googlechrome.github.io/lighthouse/viewer/?gist=886ccf783f07655f5baaa326ad50ecfb)

To run locally: `node examples/interaction-runner-report.js`

## Plugin with interaction runner and hacked perf section

With some knowledge of how the Lighthouse performance section is special-cased for rendering, the interaction runner can also make a web vitals output that replaces the normal Performance section with our lab-based "field" metrics. It requires only passing in an extra flag:

```diff
diff --git a/examples/interaction-runner-report.js b/examples/interaction-runner-report.js
index 1d29c71..ad25a8d 100644
--- a/examples/interaction-runner-report.js
+++ b/examples/interaction-runner-report.js
@@ -22,7 +22,7 @@ function sleep(time) {
 }
 
 async function captureReport() {
-  const runner = await createRunner();
+  const runner = await createRunner({useHackReport: true});
   await runner.startNavigation({url: 'https://www.khanacademy.org/'});
 
   try {
```

See a full example in [`examples/hack-runner-report.js`](examples/hack-runner-report.js).

[<img width="800px" alt="Lighthouse user-flow report showing a more complete look at Web Vitals metrics, including LCP, CLS, FID, and responsiveness" src="https://user-images.githubusercontent.com/316891/141842106-c1b7a3cc-3181-4e22-8735-23275cb6e5cd.png">](https://googlechrome.github.io/lighthouse/viewer/?gist=ccb2854814da5c5457377203a390efb1)

[view live report](https://googlechrome.github.io/lighthouse/viewer/?gist=ccb2854814da5c5457377203a390efb1)

To run locally: `node examples/hack-runner-report.js`

## TODO
- import [DevTools interaction recording](https://developer.chrome.com/docs/devtools/recorder/) (will require changes to their [Puppeteer export](https://developer.chrome.com/docs/devtools/recorder/#:~:text=of%20saved%20recordings.-,Export%20a%20recording,-.%20You%20can%20export))
