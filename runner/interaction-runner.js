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

import fs from 'fs/promises';
import open from 'open';

import puppeteer from 'puppeteer';
import {getChromePath} from 'chrome-launcher';

// @ts-expect-error - TODO(bckenny): we need some types for the API
import {navigation} from 'lighthouse/lighthouse-core/fraggle-rock/api.js';

import * as userInteractionConfig from './config/user-interaction-config.js';
import * as hackPerfReplacementConfig from './config/hack-perf-replacement-config.js';

/** @typedef {{lhr: unknown, report: string}} LhrResult */
/** @typedef {import('puppeteer').Browser} Browser */
/** @typedef {import('puppeteer').Page} Page */
/** @typedef {import('puppeteer').CDPSession} Session */

/**
 * @typedef RunnerOptions
 * @property {Page} [page] Puppeteer Page used for driving the browser allowing for early setup. If not provided, a Chrome instance will be launched and used automatically.
 * @property {boolean} [useHackReport] If true, generates a report that treats the web-vitals audits as if they made up the perf category, otherwise runs them as a Lighthouse plugin.
 */

const SETTLE_MS_AFTER_USER_INTERACTION = 2000;

/**
 * Create a navigation + interaction runner.
 * @param {RunnerOptions} [options]
 */
async function createRunner({page, useHackReport = false} = {}) {
  // If no `page`, create one for the user.
  let browser;
  if (!page) {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: getChromePath(),
      ignoreDefaultArgs: ['--enable-automation'],
    });

    page = await browser.newPage();
  }

  const session = await page.target().createCDPSession();

  return new InteractionRunner({browser, page, session, useHackReport});
}

/**
 * @param {{useHackReport: boolean}} options
 */
function getConfigParameters({useHackReport}) {
  if (useHackReport) {
    return {
      plugins: [], // No need for a plugin.
      getUserInteractionConfig: hackPerfReplacementConfig.getUserInteractionConfig,
    };
  }

  return {
    plugins: ['lighthouse-plugin-web-vitals'],
    getUserInteractionConfig: userInteractionConfig.getUserInteractionConfig,
  };
}

class InteractionRunner {
  /** @type {Browser|undefined} */
  #browser;
  page;
  session;
  #useHackReport;

  /** @type {LhrResult|undefined} */
  #lhrResult;

  /** @type {Promise<LhrResult>|undefined} */
  #navigationPromise;
  /** @type {((value: void) => void)|undefined} */
  #resolveWhenUserInteractionFinished;

  /**
   * @param {{browser?: Browser, page: Page, session: Session, useHackReport: boolean}} options
   */
  constructor({browser, page, session, useHackReport}) {
    this.#browser = browser;
    this.#useHackReport = useHackReport;
    this.page = page;
    this.session = session;
  }

  /**
   * @param {{url: string}} options
   */
  async startNavigation({url}) {
    if (this.#navigationPromise) {
      throw new Error('Run has already started.');
    }

    // Get our bespoke config and user interaction triggers.
    const {
      plugins,
      getUserInteractionConfig,
    } = getConfigParameters({useHackReport: this.#useHackReport});
    const {
      config,
      canStartUserInteraction,
      resolveWhenUserInteractionFinished,
    } = getUserInteractionConfig();
    this.#resolveWhenUserInteractionFinished = resolveWhenUserInteractionFinished;

    // Don't await navigation yet.
    this.#navigationPromise = navigation({
      url,
      page: this.page,
      config,
      configContext: {
        settingsOverrides: {
          output: 'html',
          plugins,
          onlyCategories: [
            ...plugins,
            'performance',
          ],
        },
      },
    });

    // User code can interact with the page when this resolves.
    return canStartUserInteraction;
  }

  async endNavigation() {
    if (!this.#navigationPromise || !this.#resolveWhenUserInteractionFinished) {
      throw new Error('Run not started yet.');
    }

    // Let the page settle after any interactions.
    await new Promise(resolve => setTimeout(resolve, SETTLE_MS_AFTER_USER_INTERACTION));

    // User interaction complete.
    this.#resolveWhenUserInteractionFinished();

    const lhrResult = await this.#navigationPromise;
    this.#lhrResult = lhrResult;

    // If we created the `browser` for the user, clean it up.
    if (this.#browser) {
      await this.#browser.close();
    }
  }

  /**
   * @param {{filepath?: string, view?: boolean}} [options]
   */
  async saveReport({filepath = 'flow.report.html', view} = {}) {
    if (!this.#lhrResult) {
      throw new Error('Navigation not taken yet');
    }

    // TODO(bckenny): save artifacts flag.
    await fs.writeFile(filepath, this.#lhrResult.report);
    if (view) {
      open(filepath, {wait: false});
    }
  }
}

export {
  createRunner,
};
