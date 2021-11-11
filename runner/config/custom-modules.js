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

/** @fileoverview
 * Custom gatherer that allows yielding to user input and an Audit to ensure the
 * gatherer runs.
 */

// @ts-expect-error - TODO(bckenny): we need some types for Lighthouse.
import FRGatherer from 'lighthouse/lighthouse-core/fraggle-rock/gather/base-gatherer.js';
// @ts-expect-error - TODO(bckenny): we need some types for Lighthouse.
import Audit from 'lighthouse/lighthouse-core/audits/audit.js';

/**
 * Returns a custom gatherer with hooks that will be yielded to mid-gatherer
 * run.
 * `userInteractionGatherer.name` should be used as the gatherer ID to work with
 * the matching `PlaceholderAudit`.
 */
function createUserInteractionGatherer() {
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

  class UserInteraction extends FRGatherer {
    static symbol = Symbol('UserInteraction');
    meta = {
      symbol: UserInteraction.symbol,
      supportedModes: ['navigation', 'timespan'],
    };

    // TODO(bckenny): user startSensitiveInstrumentation?
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

  // TODO(bckenny): should use LH types, but `name` is the only externally needed part for now.
  const userInteractionGatherer =
    /** @type {{name: string}} */ (/** @type {unknown} */ (new UserInteraction()));

  return {
    userInteractionGatherer,
    canStartUserInteraction,
    resolveWhenUserInteractionFinished,
  };
}

/**
 * Used to tie PlaceholderAudit to UserInteraction gatherer. If there's ever a
 * need for multiple instances of the UserInteraction gatherer, will need to
 * break this in a different way.
 */
const userInteractionGathererName = createUserInteractionGatherer().userInteractionGatherer.name;

/**
 * An audit that only exists to use the UserInteraction gatherer and so keep it
 * alive in the config. You likely want to add a hidden group.
 */
class PlaceholderAudit extends Audit {
  static get meta() {
    return {
      id: 'vitals-flow-placeholder-audit',
      title: 'A placeholder audit',
      failureTitle: 'A placeholder audit',
      description: 'An audit to ensure UserInteraction runs',
      supportedModes: ['navigation', 'timespan'],
      requiredArtifacts: [userInteractionGathererName],
    };
  }
  static audit() {
    return {
      score: 1,
      notApplicable: true,
    };
  }
}

export {
  createUserInteractionGatherer,
  PlaceholderAudit,
};
