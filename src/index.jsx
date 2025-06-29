import 'core-js/stable';
import 'regenerator-runtime/runtime';

import React, { StrictMode } from 'react';
import {
  initialize,
  APP_INIT_ERROR,
  APP_READY,
  subscribe,
  mergeConfig,
} from '@edx/frontend-platform';
import { ErrorPage } from '@edx/frontend-platform/react';
import { hasFeatureFlagEnabled } from '@edx/frontend-enterprise-utils';

import { createRoot } from 'react-dom/client';
import messages from './i18n';
import App from './components/App';
import './index.scss';

const rootNode = createRoot(document.getElementById('root'));
subscribe(APP_READY, () => {
  rootNode.render(<StrictMode><App /></StrictMode>);
});

subscribe(APP_INIT_ERROR, (error) => {
  rootNode.render(<StrictMode><ErrorPage message={error.message} /></StrictMode>);
});

initialize({
  handlers: {
    config: () => {
      mergeConfig({
        // Logs JS errors matching the following regex as NewRelic page actions instead of
        // errors,reducing JS error noise.
        IGNORED_ERROR_REGEX: '(Axios Error|\'removeChild\'|Script error|getReadModeExtract)',
        IS_MAINTENANCE_ALERT_ENABLED: process.env.IS_MAINTENANCE_ALERT_ENABLED || null,
        MAINTENANCE_ALERT_MESSAGE: process.env.MAINTENANCE_ALERT_MESSAGE || null,
        MAINTENANCE_ALERT_START_TIMESTAMP: process.env.MAINTENANCE_ALERT_START_TIMESTAMP || null,
        MAINTENANCE_ALERT_END_TIMESTAMP: process.env.MAINTENANCE_ALERT_END_TIMESTAMP || null,
        ENTERPRISE_LEARNER_PORTAL_URL: process.env.ENTERPRISE_LEARNER_PORTAL_URL || null,
        FEATURE_LEARNER_CREDIT_MANAGEMENT: process.env.FEATURE_LEARNER_CREDIT_MANAGEMENT || hasFeatureFlagEnabled('LEARNER_CREDIT_MANAGEMENT') || null,
        FEATURE_CONTENT_HIGHLIGHTS: process.env.FEATURE_CONTENT_HIGHLIGHTS || hasFeatureFlagEnabled('CONTENT_HIGHLIGHTS') || null,
        ENTERPRISE_SUPPORT_PROGRAM_OPTIMIZATION_URL: process.env.ENTERPRISE_SUPPORT_PROGRAM_OPTIMIZATION_URL || null,
        ENTERPRISE_SUPPORT_LEARNER_CREDIT_URL: process.env.ENTERPRISE_SUPPORT_LEARNER_CREDIT_URL || null,
        EDX_ACCESS_URL: process.env.EDX_ACCESS_URL || null,
        FEATURE_ENABLE_RESTRICTED_RUN_ASSIGNMENT: process.env.FEATURE_ENABLE_RESTRICTED_RUN_ASSIGNMENT || null,
      });
    },
  },
  messages,
  requireAuthenticatedUser: false,
  hydrateAuthenticatedUser: true,
});
