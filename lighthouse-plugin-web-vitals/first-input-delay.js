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

// @ts-expect-error - TODO(bckenny): we need some types for Lighthouse.
const Audit = require('lighthouse/lighthouse-core/audits/audit.js');

class FirstInputDelay extends Audit {
  static get meta() {
    return {
      id: 'first-input-delay',
      title: 'First Input Delay',
      description: 'First Input Delay',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
    };
  }

  static get defaultOptions() {
    return {
      // https://web.dev/cls/#what-is-a-good-cls-score
      // This 0.1 target score was determined through both manual evaluation and large-scale analysis.
      // see https://www.desmos.com/calculator/ksp7q91nop
      p10: 100,
      median: 300,
    };
  }

  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    // const processedTrace = await ProcessedTrace.request(trace, context);
    const fidEvent = trace.traceEvents.find(e => e.name === 'FirstInputDelay::AllFrames::UMA');
    const fidValue = fidEvent ? fidEvent.args.data.firstInputDelayInMilliseconds : 0;

    return {
      score: Audit.computeLogNormalScore(
        {p10: context.options.p10, median: context.options.median},
        fidValue,
      ),
      numericUnit: 'millisecond',
      displayValue: `${fidValue.toLocaleString(context.settings.locale)}\xa0ms`,
    };
  }
}

module.exports = FirstInputDelay;
