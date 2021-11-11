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

import legacyDefaultConfig from 'lighthouse/lighthouse-core/config/default-config.js';

/** @type {LH.Config.AuditJson[]} */
const frAudits = [
  'byte-efficiency/uses-responsive-images-snapshot',
];

// Ensure all artifact IDs match the typedefs.
/** @type {Record<keyof LH.FRArtifacts, string>} */
const artifacts = {
  DevtoolsLog: '',
  Trace: '',
  Accessibility: '',
  AnchorElements: '',
  CacheContents: '',
  ConsoleMessages: '',
  CSSUsage: '',
  Doctype: '',
  DOMStats: '',
  EmbeddedContent: '',
  FontSize: '',
  FormElements: '',
  FullPageScreenshot: '',
  GlobalListeners: '',
  IFrameElements: '',
  ImageElements: '',
  InstallabilityErrors: '',
  InspectorIssues: '',
  JsUsage: '',
  LinkElements: '',
  MainDocumentContent: '',
  MetaElements: '',
  NetworkUserAgent: '',
  OptimizedImages: '',
  PasswordInputsWithPreventedPaste: '',
  ResponseCompression: '',
  RobotsTxt: '',
  ServiceWorker: '',
  ScriptElements: '',
  SourceMaps: '',
  Stacks: '',
  TagsBlockingFirstPaint: '',
  TapTargets: '',
  TraceElements: '',
  ViewportDimensions: '',
  WebAppManifest: '',
  devtoolsLogs: '',
  traces: '',
};

for (const key of Object.keys(artifacts)) {
  artifacts[/** @type {keyof typeof artifacts} */ (key)] = key;
}

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
    // extends: 'lighthouse:default',
    artifacts: [
      // Artifacts which can be depended on come first.
      {id: artifacts.DevtoolsLog, gatherer: 'devtools-log'},
      {id: artifacts.Trace, gatherer: 'trace'},

      /* eslint-disable max-len */
      {id: artifacts.Accessibility, gatherer: 'accessibility'},
      {id: artifacts.AnchorElements, gatherer: 'anchor-elements'},
      {id: artifacts.CacheContents, gatherer: 'cache-contents'},
      {id: artifacts.ConsoleMessages, gatherer: 'console-messages'},
      {id: artifacts.CSSUsage, gatherer: 'css-usage'},
      {id: artifacts.Doctype, gatherer: 'dobetterweb/doctype'},
      {id: artifacts.DOMStats, gatherer: 'dobetterweb/domstats'},
      {id: artifacts.EmbeddedContent, gatherer: 'seo/embedded-content'},
      {id: artifacts.FontSize, gatherer: 'seo/font-size'},
      {id: artifacts.FormElements, gatherer: 'form-elements'},
      {id: artifacts.FullPageScreenshot, gatherer: 'full-page-screenshot'},
      {id: artifacts.GlobalListeners, gatherer: 'global-listeners'},
      {id: artifacts.IFrameElements, gatherer: 'iframe-elements'},
      {id: artifacts.ImageElements, gatherer: 'image-elements'},
      {id: artifacts.InstallabilityErrors, gatherer: 'installability-errors'},
      {id: artifacts.InspectorIssues, gatherer: 'inspector-issues'},
      {id: artifacts.JsUsage, gatherer: 'js-usage'},
      {id: artifacts.LinkElements, gatherer: 'link-elements'},
      {id: artifacts.MainDocumentContent, gatherer: 'main-document-content'},
      {id: artifacts.MetaElements, gatherer: 'meta-elements'},
      {id: artifacts.NetworkUserAgent, gatherer: 'network-user-agent'},
      {id: artifacts.OptimizedImages, gatherer: 'dobetterweb/optimized-images'},
      {id: artifacts.PasswordInputsWithPreventedPaste, gatherer: 'dobetterweb/password-inputs-with-prevented-paste'},
      {id: artifacts.ResponseCompression, gatherer: 'dobetterweb/response-compression'},
      {id: artifacts.RobotsTxt, gatherer: 'seo/robots-txt'},
      {id: artifacts.ServiceWorker, gatherer: 'service-worker'},
      {id: artifacts.ScriptElements, gatherer: 'script-elements'},
      {id: artifacts.SourceMaps, gatherer: 'source-maps'},
      {id: artifacts.Stacks, gatherer: 'stacks'},
      {id: artifacts.TagsBlockingFirstPaint, gatherer: 'dobetterweb/tags-blocking-first-paint'},
      {id: artifacts.TapTargets, gatherer: 'seo/tap-targets'},
      {id: artifacts.TraceElements, gatherer: 'trace-elements'},
      {id: artifacts.ViewportDimensions, gatherer: 'viewport-dimensions'},
      {id: artifacts.WebAppManifest, gatherer: 'web-app-manifest'},
      /* eslint-enable max-len */

      // Artifact copies are renamed for compatibility with legacy artifacts.
      {id: artifacts.devtoolsLogs, gatherer: 'devtools-log-compat'},
      {id: artifacts.traces, gatherer: 'trace-compat'},

      // Add custom gatherer that will pause for user interaction.
      {id: USER_INTERACTION_ID, gatherer: {
        instance: /** @type {any} */ (new VitalsFlowUserInteraction()),
      }},
    ],

    navigations: [
      {
        id: 'default',
        pauseAfterFcpMs: 1000,
        pauseAfterLoadMs: 1000,
        networkQuietThresholdMs: 1000,
        cpuQuietThresholdMs: 1000,
        artifacts: [
          // TODO(bckenny): this might not work since it has to go first?
          USER_INTERACTION_ID,

          // Artifacts which can be depended on come first.
          artifacts.DevtoolsLog,
          artifacts.Trace,

          artifacts.Accessibility,
          artifacts.AnchorElements,
          artifacts.CacheContents,
          artifacts.ConsoleMessages,
          artifacts.CSSUsage,
          artifacts.Doctype,
          artifacts.DOMStats,
          artifacts.EmbeddedContent,
          artifacts.FontSize,
          artifacts.FormElements,
          artifacts.GlobalListeners,
          artifacts.IFrameElements,
          artifacts.ImageElements,
          artifacts.InstallabilityErrors,
          artifacts.InspectorIssues,
          artifacts.JsUsage,
          artifacts.LinkElements,
          artifacts.MainDocumentContent,
          artifacts.MetaElements,
          artifacts.NetworkUserAgent,
          artifacts.OptimizedImages,
          artifacts.PasswordInputsWithPreventedPaste,
          artifacts.ResponseCompression,
          artifacts.RobotsTxt,
          artifacts.ServiceWorker,
          artifacts.ScriptElements,
          artifacts.SourceMaps,
          artifacts.Stacks,
          artifacts.TagsBlockingFirstPaint,
          artifacts.TapTargets,
          artifacts.TraceElements,
          artifacts.ViewportDimensions,
          artifacts.WebAppManifest,

          // Compat artifacts come last.
          artifacts.devtoolsLogs,
          artifacts.traces,

          // FullPageScreenshot comes at the very end so all other node analysis is captured.
          artifacts.FullPageScreenshot,
        ],
      },
    ],
    settings: legacyDefaultConfig.settings,
    audits: [
      ...(legacyDefaultConfig.audits || []).map(audit => {
        if (typeof audit === 'string') return {path: audit};
        return audit;
      }),
      ...frAudits,
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
      {path: 'lighthouse-plugin-web-vitals/first-input-delay.js'},
      {path: 'lighthouse-plugin-web-vitals/responsiveness.js'},
    ],

    // Add audit to perf category to ensure audit runs.
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

          // Placeholder so user interaction can take place.
          {id: 'vitals-flow-placeholder-audit', weight: 0, group: 'hidden'},

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
    groups: legacyDefaultConfig.groups,
  };

  return {config, canStartUserInteraction, resolveWhenUserInteractionFinished};
}

export {
  getUserInteractionConfig,
};
