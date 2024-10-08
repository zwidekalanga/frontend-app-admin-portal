import React, {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Route, Navigate, Routes, generatePath, useParams,
} from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { initializeHotjar } from '@edx/frontend-enterprise-hotjar';
import { AuthenticatedPageRoute, PageWrap, AppProvider } from '@edx/frontend-platform/react';
import { logError } from '@edx/frontend-platform/logging';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

import dayjs from 'dayjs';
import Header from '../../containers/Header';
import Footer from '../../containers/Footer';
import EnterpriseIndexPage from '../../containers/EnterpriseIndexPage';
import AuthenticatedEnterpriseApp from '../AuthenticatedEnterpriseApp';
import AdminRegisterPage from '../AdminRegisterPage';
import UserActivationPage from '../UserActivationPage';
import NotFoundPage from '../NotFoundPage';
import { SystemWideWarningBanner } from '../system-wide-banner';

import store from '../../data/store';
import { ROUTE_NAMES } from '../EnterpriseApp/data/constants';
import { defaultQueryClientRetryHandler, isTodayBetweenDates, queryCacheOnErrorHandler } from '../../utils';

// eslint-disable-next-line import/no-unresolved
const ReactQueryDevtoolsProduction = lazy(() => import('@tanstack/react-query-devtools/production').then((d) => ({
  default: d.ReactQueryDevtools,
})));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: queryCacheOnErrorHandler,
  }),
  defaultOptions: {
    queries: {
      retry: defaultQueryClientRetryHandler,
      // Specifying a longer `staleTime` of 60 seconds means queries will not refetch their data
      // as often; mitigates making duplicate queries when within the `staleTime` window, instead
      // relying on the cached data until the `staleTime` window has exceeded. This may be modified
      // per-query, as needed, if certain queries expect to be more up-to-date than others. Allows
      // `useQuery` to be used as a state manager.
      staleTime: 1000 * 60,
    },
  },
});

const RedirectComponent = () => {
  const { enterpriseSlug } = useParams();

  const homePage = generatePath(
    `/:enterpriseSlug/admin/${ROUTE_NAMES.learners}`,
    { enterpriseSlug },
  );

  return <Navigate to={homePage} />;
};

const AppWrapper = () => {
  const apiClient = getAuthenticatedHttpClient();
  const config = getConfig();

  const [showReactQueryDevtools, setShowReactQueryDevtools] = useState(false);
  useEffect(() => {
    window.toggleReactQueryDevtools = () => setShowReactQueryDevtools((prevState) => !prevState);
  });

  useEffect(() => {
    if (process.env.HOTJAR_APP_ID) {
      try {
        initializeHotjar({
          hotjarId: process.env.HOTJAR_APP_ID,
          hotjarVersion: process.env.HOTJAR_VERSION,
          hotjarDebug: !!process.env.HOTJAR_DEBUG,
        });
      } catch (error) {
        logError(error);
      }
    }
  }, []);

  const isMaintenanceAlertOpen = useMemo(() => {
    if (!config) {
      return false;
    }
    const isEnabledWithMessage = (
      config.IS_MAINTENANCE_ALERT_ENABLED && config.MAINTENANCE_ALERT_MESSAGE
    );
    if (!isEnabledWithMessage) {
      return false;
    }
    const startTimestamp = config.MAINTENANCE_ALERT_START_TIMESTAMP;
    const endTimestamp = config.MAINTENANCE_ALERT_END_TIMESTAMP;
    if (startTimestamp && endTimestamp) {
      return isTodayBetweenDates({ startDate: startTimestamp, endDate: endTimestamp });
    }
    if (startTimestamp) {
      return dayjs().isAfter(dayjs(startTimestamp));
    }
    if (endTimestamp) {
      return dayjs().isBefore(dayjs(endTimestamp));
    }
    return true;
  }, [config]);

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools />
      {showReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtoolsProduction />
        </Suspense>
      )}
      <AppProvider store={store}>
        <div id="app-container">
          <Helmet
            titleTemplate="%s - edX Admin Portal"
            defaultTitle="edX Admin Portal"
          />
          {isMaintenanceAlertOpen && (
            <SystemWideWarningBanner>
              {config.MAINTENANCE_ALERT_MESSAGE}
            </SystemWideWarningBanner>
          )}
          <Header />
          <Routes>
            <Route
              path="/enterprises"
              element={(
                <AuthenticatedPageRoute
                  authenticatedAPIClient={apiClient}
                  redirect={`${process.env.BASE_URL}/enterprises`}
                >
                  <EnterpriseIndexPage />
                </AuthenticatedPageRoute>
              )}
            />
            <Route
              path="/:enterpriseSlug/admin/register"
              element={<PageWrap><AdminRegisterPage /></PageWrap>}
            />
            <Route
              path="/:enterpriseSlug/admin/register/activate"
              element={<PageWrap><UserActivationPage /></PageWrap>}
            />
            <Route
              path="/:enterpriseSlug/admin?"
              element={(
                <PageWrap
                  authenticatedAPIClient={apiClient}
                  redirect={process.env.BASE_URL}
                >
                  <RedirectComponent />
                </PageWrap>
              )}
            />
            <Route
              path="/:enterpriseSlug/admin/:enterpriseAppPage/*"
              element={(
                <PageWrap
                  authenticatedAPIClient={apiClient}
                  redirect={process.env.BASE_URL}
                >
                  <AuthenticatedEnterpriseApp />
                </PageWrap>
            )}
            />
            <Route
              path="/"
              element={(
                <AuthenticatedPageRoute authenticatedAPIClient={apiClient} redirect={process.env.BASE_URL}>
                  <EnterpriseIndexPage />
                </AuthenticatedPageRoute>
            )}
            />
            <Route path="*" element={<PageWrap><NotFoundPage /></PageWrap>} />
          </Routes>
          <Footer />
        </div>
      </AppProvider>
    </QueryClientProvider>
  );
};

export default AppWrapper;
