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

import {NavigationRunner} from './index.js';

/** @param {number} time in ms */
function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function captureReport() {
  const runner = new NavigationRunner();
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
  await runner.page.type(searchBoxSelector, 'machine learning', {delay: 10});

  await runner.endNavigation();
}

captureReport();
