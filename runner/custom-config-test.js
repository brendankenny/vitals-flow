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
// @ts-expect-error - TODO(bckenny): we need some types for Lighthouse.
import {startFlow} from 'lighthouse/lighthouse-core/fraggle-rock/api.js';
import {getUserInteractionConfig} from './user-interaction-config.js';

/** @param {number} time in ms */
function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function captureReport() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: getChromePath(),
  });
  const page = await browser.newPage();
  const session = await page.target().createCDPSession();

  const {
    config,
    canStartUserInteraction,
    resolveWhenUserInteractionFinished,
  } = getUserInteractionConfig();

  const flow = await startFlow(page, {config, name: 'Single Navigation'});

  // Don't await navigation yet.
  const navigatePromise = flow.navigate('https://pie-charmed-treatment.glitch.me/');

  // Do await for user interaction.
  await canStartUserInteraction;

  await session.send('Input.synthesizeScrollGesture', {
    x: 100,
    y: 0,
    yDistance: -2500,
    speed: 1000,
    repeatCount: 2,
    repeatDelayMs: 250,
  });

  await sleep(2000);

  // User interaction complete.
  resolveWhenUserInteractionFinished();

  await navigatePromise;

  await browser.close();

  const report = flow.generateReport();
  fs.writeFileSync('flow.report.html', report);
  open('flow.report.html', {wait: false});
}

captureReport();
