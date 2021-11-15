# vitals-flow

A Lighthouse plugin and runner to use user flows to simulate user interactions and measure CWV in the lab.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic usage](#basic-usage)
- [Plugin with Lighthouse user flows](#plugin-with-lighthouse-user-flows)
- [Plugin with interaction runner](#plugin-with-interaction-runner)
- [Plugin with interaction runner and hacked perf section](#plugin-with-interaction-runner-and-hacked-perf-section)

## Getting started

- `git clone git@github.com:brendankenny/vitals-flow.git`
- `cd vitals-flow`
- `yarn`
- `yarn demo`

## Basic usage

The `lighthouse-plugin-web-vitals` plugin adds FID and responsiveness audits to cover all the Core Wev Vitals in a lab setting. When run, these are found in a "Lab Web Vitals" section in the Lighthouse report.

The plugin is compatible with any Lighthouse run, for instance on the command line:

```sh
yarn lighthouse https://example.com --plugins lighthouse-plugin-web-vitals --view
```

However, because there is no FID or responsiveness without user input and Lighthouse doesn't simulate input by default, these audits won't show any results.

## Plugin with Lighthouse user flows

Somewhat trimmed version of the [user-flow-report example](examples/user-flow-report.js):

```js
import fs from 'fs';
import open from 'open';
import puppeteer from 'puppeteer';
import {getChromePath} from 'chrome-launcher';
import {startFlow} from 'lighthouse/lighthouse-core/fraggle-rock/api.js';

/** @param {number} time in ms */
function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function captureReport() {
  const browser = await puppeteer.launch({
    headless: false,
    // We need Chrome 97+ for now, not whatever pptr ships with.
    executablePath: getChromePath(),
  });
  const page = await browser.newPage();

  const flow = await startFlow(page, {name: 'Interactions with the test page'});
  await flow.startTimespan({stepName: 'Interactions', configContext: {
    settingsOverrides: {
      // Bring in web-vitals plugin.
      plugins: ['lighthouse-plugin-web-vitals'],
      onlyCategories: [
        'lighthouse-plugin-web-vitals',
        'performance',
      ],
    },
  }});

  /* Load and interact with page. */

  await page.goto('https://www.khanacademy.org/', {waitUntil: 'networkidle0'});

  try {
    // Dismiss "COVID" banner if visible.
    await page.click('[data-test-id="site-banner-dismiss"]');
    await sleep(500);
  } catch {}

  // Click search button.
  await page.click('[data-test-id="mobile-search-button"]');
  await sleep(500);

  // Maybe we're unusure textbox is selected, click to select.
  const searchBoxSelector = '#mobile-search-form-container input[name="page_search_query"]';
  await page.waitForSelector(searchBoxSelector);
  await page.click(searchBoxSelector);
  await sleep(500);

  // Type in search box.
  await page.type(searchBoxSelector, 'machine learning', {delay: 20});

  await sleep(500);

  /* Load and interaction complete. */

  await flow.endTimespan();
  await browser.close();

  const report = flow.generateReport();
  fs.writeFileSync('khan-sample.report.html', report);
  open('khan-sample.report.html', {wait: false});
}

captureReport();
```

To run: `node examples/user-flow-report.js`

[<img width="800px" alt="Lighthouse user-flow report showing basic Web Vitals metrics" src="https://user-images.githubusercontent.com/316891/141837210-828e878e-44cd-49d7-8f2d-d581692a0ccd.png">](https://googlechrome.github.io/lighthouse/viewer/?gist=ddcb125dbdec78a0a838140c9124e123)

[view live report](https://googlechrome.github.io/lighthouse/viewer/?gist=ddcb125dbdec78a0a838140c9124e123)

A few issues:
- it's difficult to set up throttling in this mode (`timespan` wasn't really meant for this)
- some metrics aren't available, e.g. LCP currently only works in the `navigation` mode since it is defined relative to a navigation, but we have to use `timespan` here

## Plugin with interaction runner

This repo also includes an "interaction runner", which creates a [custom config, gatherer, and audit](https://github.com/GoogleChrome/lighthouse/tree/master/docs/recipes/custom-audit), to allow using Lighthouse `navigation` mode but still yield to user code to interact with the page with puppeteer. Since this is a real Lighthouse `navigation`:
- all navigation metrics can run
- regular Lighthouse throttling schemes can be used
- Lighthouse criteria can be used to determine when page load is complete

Code from [interaction-runner-report example](examples/interaction-runner-report.js):

```js
import {createRunner} from './runner/interaction-runner.js';

/** @param {number} time in ms */
function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function captureReport() {
  const runner = await createRunner();
  await runner.startNavigation({url: 'https://www.khanacademy.org/'});

  try {
    // Dismiss "COVID" banner if visible.
    await runner.page.click('[data-test-id="site-banner-dismiss"]');
    await sleep(500);
  } catch {}

  // Click search button.
  await runner.page.click('[data-test-id="mobile-search-button"]');
  await sleep(500);

  // Maybe we're unusure textbox is selected, click to select.
  const searchBoxSelector = '#mobile-search-form-container input[name="page_search_query"]';
  await runner.page.waitForSelector(searchBoxSelector);
  await runner.page.click(searchBoxSelector);
  await sleep(500);

  // Type in search box.
  await runner.page.type(searchBoxSelector, 'machine learning', {delay: 20});

  await runner.endNavigation();
  await runner.saveReport({filepath: 'khan-sample.report.html', view: true});
}

captureReport();
```

To run: `node examples/interaction-runner-report.js`

[<img width="800px" alt="Lighthouse user-flow report showing a more complete look at Web Vitals metrics, including LCP, CLS, FID, and responsiveness" src="https://user-images.githubusercontent.com/316891/141839923-2dad61fa-28b5-4788-912b-3460c3df34d8.png">](https://googlechrome.github.io/lighthouse/viewer/?gist=886ccf783f07655f5baaa326ad50ecfb)

[view live report](https://googlechrome.github.io/lighthouse/viewer/?gist=886ccf783f07655f5baaa326ad50ecfb)


## Plugin with interaction runner and hacked perf section

With some knowledge of how the Lighthouse performance section is special-cased for rendering, we can also make a nice web vitals output that replaces the normal Performance section with our lab-based "field" metrics. It requires only passing in a flag:

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

To run: `node examples/hack-runner-report.js`

[<img width="800px" alt="Lighthouse user-flow report showing a more complete look at Web Vitals metrics, including LCP, CLS, FID, and responsiveness" src="https://user-images.githubusercontent.com/316891/141842106-c1b7a3cc-3181-4e22-8735-23275cb6e5cd.png">](https://googlechrome.github.io/lighthouse/viewer/?gist=ccb2854814da5c5457377203a390efb1)

[view live report](https://googlechrome.github.io/lighthouse/viewer/?gist=ccb2854814da5c5457377203a390efb1)

## TODO
- import [DevTools interaction recording](https://developer.chrome.com/docs/devtools/recorder/) (will require changes to their [Puppeteer export](https://developer.chrome.com/docs/devtools/recorder/#:~:text=of%20saved%20recordings.-,Export%20a%20recording,-.%20You%20can%20export))
- many samples from selector/command line
