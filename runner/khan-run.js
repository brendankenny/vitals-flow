/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import open from 'open';
import puppeteer from 'puppeteer';
// @ts-expect-error - TODO(bckenny): we need some types for the API
import {startFlow} from 'lighthouse/lighthouse-core/fraggle-rock/api.js';

/** @param {number} time in ms */
function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const testUrl = 'https://www.khanacademy.org/';
const reportName = 'khan-sample.report.html';

async function captureReport() {
  const browser = await puppeteer.launch({
    headless: false,
    // TODO: generalize, but need Chrome 97+ for now.
    executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  });
  const page = await browser.newPage();

  // Get a session handle to be able to send protocol commands to the page.
  // const session = await page.target().createCDPSession();

  const flow = await startFlow(page, {name: 'Interactions with the test page'});
  // TODO(bckenny): use just a timespan, output report via `html` override
  await flow.startTimespan({stepName: 'Interactions', configContext: {
    settingsOverrides: {
      plugins: ['lighthouse-plugin-web-vitals'],
      onlyCategories: [
        'lighthouse-plugin-web-vitals',
        'performance',
      ],
    },
  }});

  await page.goto(testUrl, {waitUntil: 'networkidle0'});

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
  await page.type(searchBoxSelector, 'machine learning', {delay: 10});

  await sleep(400);

  await flow.endTimespan();

  await browser.close();

  const report = flow.generateReport();
  fs.writeFileSync(reportName, report);
  open(reportName, {wait: false});
}

captureReport();
