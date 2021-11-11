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

import {createUserInteractionGatherer, PlaceholderAudit} from './custom-modules.js';

function getUserInteractionConfig() {
  const {
    userInteractionGatherer,
    canStartUserInteraction,
    resolveWhenUserInteractionFinished,
  } = createUserInteractionGatherer();

  const config = {
    extends: 'lighthouse:default',

    artifacts: [{
      // Add custom gatherer that will pause for user interaction.
      id: userInteractionGatherer.name,
      gatherer: {
        instance: userInteractionGatherer,
      },
    }],

    // Add gatherer to default navigation.
    navigations: [{
      id: 'default',
      artifacts: [
        // TODO(bckenny): this might not work since it has to go first? Or can we switch to startSensitiveInstrumentation?
        userInteractionGatherer.name,

        // TODO(bckenny): HACK to workaround Lighthouse bug. These should be merged, not replaced.
        // At https://github.com/GoogleChrome/lighthouse/blob/dcf2ef3f0bbf83e96b63a06280cf87140d2decf6/lighthouse-core/fraggle-rock/config/config.js#L82
        'DevtoolsLog',
        'Trace',
        'Accessibility',
        'AnchorElements',
        'CacheContents',
        'ConsoleMessages',
        'CSSUsage',
        'Doctype',
        'DOMStats',
        'EmbeddedContent',
        'FontSize',
        'FormElements',
        'GlobalListeners',
        'IFrameElements',
        'ImageElements',
        'InstallabilityErrors',
        'InspectorIssues',
        'JsUsage',
        'LinkElements',
        'MainDocumentContent',
        'MetaElements',
        'NetworkUserAgent',
        'OptimizedImages',
        'PasswordInputsWithPreventedPaste',
        'ResponseCompression',
        'RobotsTxt',
        'ServiceWorker',
        'ScriptElements',
        'SourceMaps',
        'Stacks',
        'TagsBlockingFirstPaint',
        'TapTargets',
        'TraceElements',
        'ViewportDimensions',
        'WebAppManifest',

        // Compat artifacts come last.
        'devtoolsLogs',
        'traces',

        // FullPageScreenshot comes at the very end so all other node analysis is captured.
        'FullPageScreenshot',
      ],
    }],

    audits: [
      PlaceholderAudit,
    ],

    // Add audit to perf category to ensure audit runs.
    categories: {
      performance: {
        auditRefs: [
          {id: PlaceholderAudit.meta.id, weight: 0, group: 'hidden'},
        ],
      },
    },
  };

  return {config, canStartUserInteraction, resolveWhenUserInteractionFinished};
}

export {
  getUserInteractionConfig,
};
