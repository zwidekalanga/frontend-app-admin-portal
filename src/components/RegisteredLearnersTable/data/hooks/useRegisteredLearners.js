import {
  useCallback, useMemo, useRef, useState,
} from 'react';
import { camelCaseObject } from '@edx/frontend-platform/utils';
import debounce from 'lodash.debounce';
import { logError } from '@edx/frontend-platform/logging';
import { sendEnterpriseTrackEvent } from '@edx/frontend-enterprise-utils';
import EnterpriseDataApiService from '../../../../data/services/EnterpriseDataApiService';
import EVENT_NAMES from '../../../../eventTracking';

const applySortByToOptions = (sortBy, options) => {
  if (!sortBy || sortBy.length === 0) {
    return;
  }
  const apiFieldsForColumnAccessor = {
    lmsUserCreated: { key: 'lms_user_created' },
    userEmail: { key: 'user_email' },
  };
  const orderingStrings = sortBy.map(({ id, desc }) => {
    const apiFieldForColumnAccessor = apiFieldsForColumnAccessor[id];
    if (!apiFieldForColumnAccessor) {
      return undefined;
    }
    const apiFieldKey = apiFieldForColumnAccessor.key;
    return desc ? `-${apiFieldKey}` : apiFieldKey;
  }).filter(orderingString => !!orderingString);
  Object.assign(options, {
    ordering: orderingStrings.join(','),
  });
};

const useRegisteredLearners = (enterpriseId) => {
  const shouldTrackFetchEvents = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [registeredLearners, setRegisteredLearners] = useState({
    itemCount: 0,
    pageCount: 0,
    results: [],
  });

  const fetchRegisteredLearners = useCallback(async (args) => {
    try {
      setIsLoading(true);
      const options = {
        page: args.pageIndex + 1, // `DataTable` uses zero-indexed array
        pageSize: args.pageSize,
      };
      applySortByToOptions(args.sortBy, options);

      const response = await EnterpriseDataApiService.fetchUnenrolledRegisteredLearners(enterpriseId, options);
      const data = camelCaseObject(response.data);
      setRegisteredLearners({
        itemCount: data.count,
        pageCount: data.numPages ?? Math.floor(data.count / options.pageSize),
        results: data.results,
      });

      if (shouldTrackFetchEvents.current) {
        // track event only after original API query to avoid sending event on initial page load. instead,
        // only track event when user performs manual data operation (e.g., pagination, sort, filter) and
        // send all table state as event properties.
        sendEnterpriseTrackEvent(
          enterpriseId,
          EVENT_NAMES.PROGRESS_REPORT.DATATABLE_SORT_BY_OR_FILTER,
          {
            tableId: 'registered-unenrolled-learners',
            ...options,
          },
        );
      } else {
        // set to true to enable tracking events on future API queries
        shouldTrackFetchEvents.current = true;
      }
    } catch (error) {
      logError(error);
    } finally {
      setIsLoading(false);
    }
  }, [enterpriseId]);

  const debouncedFetchRegisteredLearners = useMemo(
    () => debounce(fetchRegisteredLearners, 300),
    [fetchRegisteredLearners],
  );

  return {
    isLoading,
    registeredLearners,
    fetchRegisteredLearners: debouncedFetchRegisteredLearners,
  };
};

export default useRegisteredLearners;
