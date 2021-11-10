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
import {getChromePath} from 'chrome-launcher';

// @ts-expect-error - TODO(bckenny): we need some types for the API
import {navigation} from 'lighthouse/lighthouse-core/fraggle-rock/api.js';

import {getUserInteractionConfig} from './user-interaction-config.js';

/** @param {number} time in ms */
function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

class NavigationRunner {
  // TODO(bckenny): definitely assigned check is annoying for async init.
  /** @type {import('puppeteer').Browser|undefined} */
  #browser;
  /** @type {import('puppeteer').Page|undefined} */
  page;
  /** @type {import('puppeteer').CDPSession|undefined} */
  session;
  /** @type {Promise<{lhr: unknown, report: string}>|undefined} */
  #navigationPromise;
  /** @type {((value: void) => void)|undefined} */
  #resolveWhenUserInteractionFinished;

  /**
   * @param {{url: string}} options
   */
  async startNavigation({url}) {
    if (this.#browser) {
      throw new Error('Run has already started.');
    }

    this.#browser = await puppeteer.launch({
      headless: false,
      executablePath: getChromePath(),
    });

    this.page = await this.#browser.newPage();
    this.session = await this.page.target().createCDPSession();

    // Get our bespoke config.
    const {
      config,
      canStartUserInteraction,
      resolveWhenUserInteractionFinished,
    } = getUserInteractionConfig();
    this.#resolveWhenUserInteractionFinished = resolveWhenUserInteractionFinished;

    // Don't await navigation yet.
    this.#navigationPromise = navigation({url, page: this.page, config, configContext: {
      settingsOverrides: {
        output: 'html',
        plugins: ['lighthouse-plugin-web-vitals'],
        onlyCategories: [
          'lighthouse-plugin-web-vitals',
          'performance',
        ],
      },
    }});

    // User code can interact with the page when this resolves.
    return canStartUserInteraction;
  }

  async endNavigation() {
    if (!this.#browser || !this.#navigationPromise || !this.#resolveWhenUserInteractionFinished) {
      throw new Error('Run not started yet.');
    }

    // Let the page settle after any interactions.
    await sleep(2000);

    // User interaction complete.
    this.#resolveWhenUserInteractionFinished();

    const {report} = await this.#navigationPromise;

    await this.#browser.close();

    fs.writeFileSync('flow.report.html', report);
    open('flow.report.html', {wait: false});
  }
}

export {
  NavigationRunner,
};
