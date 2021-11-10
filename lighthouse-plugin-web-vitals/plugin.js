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

module.exports = {
  audits: [
    {path: 'lighthouse-plugin-web-vitals/first-input-delay.js'},
    {path: 'lighthouse-plugin-web-vitals/responsiveness.js'},
  ],

  category: {
    title: 'Lab Web Vitals',
    description: 'Web Vitals are a set of metrics that measure important aspects of real-world user experience on the web. [Learn more](https://web.dev/vitals/).',
    auditRefs: [
      {id: 'largest-contentful-paint', weight: 1},
      {id: 'cumulative-layout-shift', weight: 1},
      {id: 'first-input-delay', weight: 1},
      {id: 'responsiveness', weight: 0},
    ],
  },
};
