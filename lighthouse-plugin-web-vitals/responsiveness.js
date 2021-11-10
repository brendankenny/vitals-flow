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

/** @typedef {{duration: number, interactionType: 'keyboard'|'tapOrClick'|'drag'}} ResponsivenessDuration */

const interactionBudgets = {
  keyboard: 50,
  tapOrClick: 100,
  drag: 100,
};

class Responsiveness extends Audit {
  static get meta() {
    return {
      id: 'responsiveness',
      title: 'Responsiveness',
      description: 'Responsiveness',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {Array<ResponsivenessDuration>} events
   * @return {Array<number>}
   */
  static durationsOverBudget(events) {
    return events.map((evt) => {
      const budget = interactionBudgets[evt.interactionType];
      return Math.max(0, evt.duration - budget);
    });
  }

  /**
   * Note, durations are in ms
   * see https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/responsiveness_metrics.cc;l=93-105;drc=65c9257f1777731d6d0669598f6fe6fe65fa61d3
   * TODO(bckenny): would we prefer µs to match internal aggregation?
   * @param {Array<ResponsivenessDuration>} events
   * @return {Array<{aggregationType: string, aggregationValue: string}>}
   */
  static aggregateResponsivenessEvents(events) {
    const durationsOverBudget = Responsiveness.durationsOverBudget(events);

    const worstLatency = Math.max(...events.map(e => e.duration));
    const worstLatencyOverBudget = Math.max(...durationsOverBudget);
    const sumOfLatencyOverBudget = durationsOverBudget.reduce((sum, next) => sum + next);
    const averageLatencyOverBudget = sumOfLatencyOverBudget / events.length;
    // pseudo_second_worst_latency_over_budget;
    // high_percentile_latency_over_budget;

    const aggregations = [
      {aggregationType: 'Worst latency', aggregationValue: worstLatency},
      {aggregationType: 'Worst latency over budget', aggregationValue: worstLatencyOverBudget},
      {aggregationType: 'Sum of latency over budget', aggregationValue: sumOfLatencyOverBudget},
      {aggregationType: 'Average latency over budget', aggregationValue: averageLatencyOverBudget},
      // pseudo_second_worst_latency_over_budget;
      // high_percentile_latency_over_budget;
    ];

    // TODO(bckenny): hack to get better rendering in the report.
    return aggregations.map((agg) => {
      const {aggregationType, aggregationValue} = agg;
      return {
        aggregationType,
        aggregationValue: `${Math.round(aggregationValue)}\xa0ms`,
      };
    });
  }

  static async audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    // const processedTrace = await ProcessedTrace.request(trace, context);
    const responsivenessEvents = trace.traceEvents.filter(e => {
      return e.name === 'Responsiveness.Renderer.UserInteraction';
    });

    const maxDurations = responsivenessEvents.map(e => {
      const {maxDuration: duration, interactionType} = e.args.data;
      return {duration, interactionType};
    });
    const totalDurations = responsivenessEvents.map(e => {
      const {totalDuration: duration, interactionType} = e.args.data;
      return {duration, interactionType};
    });

    const results = [{
      totalOrWorst: 'Max event duration',
      subItems: {
        type: 'subitems',
        items: Responsiveness.aggregateResponsivenessEvents(maxDurations),
      },
    }, {
      totalOrWorst: 'Total event duration',
      subItems: {
        type: 'subitems',
        items: Responsiveness.aggregateResponsivenessEvents(totalDurations),
      },
    }];

    /* eslint-disable max-len */
    const headings = [
      {key: 'totalOrWorst', itemType: 'text', subItemsHeading: {key: 'aggregationType', itemType: 'text'}, text: 'Aggregation Type'},
      {key: null, itemType: 'text', subItemsHeading: {key: 'aggregationValue', itemType: 'text'}, text: 'Value'},
    ];
    /* eslint-enable max-len */

    return {
      score: 0.5,
      details: Audit.makeTableDetails(headings, results),
    };
  }
}

module.exports = Responsiveness;