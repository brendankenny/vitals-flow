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
import Audit from 'lighthouse/lighthouse-core/audits/audit.js';
// @ts-expect-error
import FRGatherer from 'lighthouse/lighthouse-core/fraggle-rock/gather/base-gatherer.js';

const USER_INTERACTION_ID = 'VitalsFlowUserInteraction';

function getUserInteractionConfig() {
  // Promise/resolver for when gatherer yields to user interaction code.
  /** @type {(value: void) => void} */
  let resolveWhenUserCanInteract = () => {};
  /** @type {Promise<void>} */
  const canStartUserInteraction = new Promise((resolve) => {
    resolveWhenUserCanInteract = resolve;
  });

  // Promise/resolver for when user interaction is complete and gatherer can resume.
  /** @type {(value: void) => void} */
  let resolveWhenUserInteractionFinished = () => {};
  /** @type {Promise<void>} */
  const userInteractionFinished = new Promise((resolve) => {
    resolveWhenUserInteractionFinished = resolve;
  });

  /** @type {any} */
  class VitalsFlowUserInteraction extends FRGatherer {
    static symbol = Symbol('USER_INTERACTION_ID');
    meta = {
      symbol: VitalsFlowUserInteraction.symbol,
      supportedModes: ['navigation', 'timespan'],
    };

    // Use stopSensitiveInstrumentation so it's still during trace but after load is complete.
    async stopSensitiveInstrumentation(/* {driver, gatherMode, settings} */) {
      // Yield to user code awaiting `canStartUserInteraction`.
      resolveWhenUserCanInteract();

      // Wait for user code to yield.
      await userInteractionFinished;
    }

    // Artifact doesn't really matter.
    getArtifact() {
      return {};
    }
  }

  const config = {
    extends: 'lighthouse:default',
    artifacts: [
      // Add custom gatherer that will pause for user interaction.
      {id: USER_INTERACTION_ID, gatherer: {
        instance: /** @type {any} */ (new VitalsFlowUserInteraction()),
      }},
    ],

    // Add gatherer to default navigation.
    navigations: [{
      id: 'default',
      artifacts: [
        // TODO(bckenny): this might not work since it has to go first?
        USER_INTERACTION_ID,

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
      // Add a dummy audit to ensure UserInteraction gatherer runs.
      class PlaceholderAudit extends Audit {
        static get meta() {
          return {
            id: 'vitals-flow-placeholder-audit',
            title: 'A placeholder audit',
            failureTitle: 'A placeholder audit',
            description: 'An audit to ensure UserInteraction runs',
            supportedModes: ['navigation', 'timespan'],
            requiredArtifacts: [USER_INTERACTION_ID],
          };
        }
        static audit() {
          return {score: 1};
        }
      },
    ],

    // Add audit to perf category to ensure audit runs.
    categories: {
      performance: {
        auditRefs: [
          {id: 'vitals-flow-placeholder-audit', weight: 0, group: 'hidden'},
        ],
      },
    },
  };

  return {config, canStartUserInteraction, resolveWhenUserInteractionFinished};
}

export {
  getUserInteractionConfig,
};
