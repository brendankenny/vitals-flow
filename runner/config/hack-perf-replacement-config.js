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
import frDefaultConfig from 'lighthouse/lighthouse-core/fraggle-rock/config/default-config.js';

import {createUserInteractionGatherer, PlaceholderAudit} from './custom-modules.js';

function getUserInteractionConfig() {
  const {
    userInteractionGatherer,
    canStartUserInteraction,
    resolveWhenUserInteractionFinished,
  } = createUserInteractionGatherer();

  // Put userInteractionGatherer at front of navigation.
  const navigations = JSON.parse(JSON.stringify(frDefaultConfig.navigations));
  navigations[0].artifacts = [
    // TODO(bckenny): this has to go first to run before trace is stopped.
    // Is there another way to set order? Dependencies?
    userInteractionGatherer.name,

    ...navigations[0].artifacts,
  ];

  const config = {
    artifacts: [
      ...frDefaultConfig.artifacts,
      {
        // Add custom gatherer that will pause for user interaction.
        id: userInteractionGatherer.name,
        gatherer: {
          instance: userInteractionGatherer,
        },
      },
    ],

    navigations,
    settings: frDefaultConfig.settings,
    audits: [
      ...frDefaultConfig.audits,

      // Placeholder audit to keep interaction gatherer in config.
      PlaceholderAudit,

      // Web vitals custom audits.
      {path: 'lighthouse-plugin-web-vitals/first-input-delay.js'},
      {path: 'lighthouse-plugin-web-vitals/responsiveness.js'},
    ],
    // Replace perf category with web-vitals and related audits.
    categories: {
      performance: {
        title: 'Lab Web Vitals',
        description: 'Web Vitals are a set of metrics that measure important aspects of real-world user experience on the web. [Learn more](https://web.dev/vitals/).',
        supportedModes: ['navigation', 'timespan'],
        auditRefs: [
          {id: 'largest-contentful-paint', weight: 1, group: 'metrics'},
          {id: 'cumulative-layout-shift', weight: 1, group: 'metrics'},
          {id: 'first-input-delay', weight: 1, group: 'metrics'},

          {id: 'responsiveness', weight: 0},

          // Add placeholder audit to perf category to ensure audit runs.
          {id: PlaceholderAudit.meta.id, weight: 0, group: 'hidden'},

          // FR merged hidden audit.
          // {id: 'uses-responsive-images-snapshot', weight: 0},

          // Classic hidden audits
          {id: 'network-requests', weight: 0, group: 'hidden'},
          {id: 'network-rtt', weight: 0, group: 'hidden'},
          {id: 'network-server-latency', weight: 0, group: 'hidden'},
          {id: 'main-thread-tasks', weight: 0, group: 'hidden'},
          {id: 'diagnostics', weight: 0, group: 'hidden'},
          {id: 'metrics', weight: 0, group: 'hidden'},
          {id: 'screenshot-thumbnails', weight: 0, group: 'hidden'},
          {id: 'final-screenshot', weight: 0, group: 'hidden'},
          {id: 'script-treemap-data', weight: 0, group: 'hidden'},
        ],
      },
    },
    groups: frDefaultConfig.groups,
  };

  return {config, canStartUserInteraction, resolveWhenUserInteractionFinished};
}

export {
  getUserInteractionConfig,
};
