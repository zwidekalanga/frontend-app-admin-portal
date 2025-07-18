import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import {
  camelCase, fromPairs, isArray, isNumber, isString, mergeWith, snakeCase, without,
} from 'lodash-es';
import isEmail from 'validator/lib/isEmail';
import isEmpty from 'validator/lib/isEmpty';
import isNumeric from 'validator/lib/isNumeric';

import { logError } from '@edx/frontend-platform/logging';
import { snakeCaseObject } from '@edx/frontend-platform/utils';

import { features } from './config';

import {
  BLACKBOARD_TYPE,
  CANVAS_TYPE,
  CORNERSTONE_TYPE,
  DEGREED2_TYPE,
  HELP_CENTER_BLACKBOARD,
  HELP_CENTER_CANVAS,
  HELP_CENTER_CORNERSTONE,
  HELP_CENTER_DEGREED,
  HELP_CENTER_MOODLE,
  HELP_CENTER_SAP,
  MOODLE_TYPE,
  SAP_TYPE,
} from './components/settings/data/constants';
import BlackboardIcon from './icons/Blackboard.svg';
import CanvasIcon from './icons/Canvas.svg';
import CornerstoneIcon from './icons/CSOD.png';
import DegreedIcon from './icons/Degreed.png';
import MoodleIcon from './icons/Moodle.png';
import SAPIcon from './icons/SAP.svg';
import { COURSE_RUN_STATUSES } from './components/ContentHighlights/data/constants';

import LmsApiService from './data/services/LmsApiService';

const formatTimestamp = ({ timestamp, format = 'MMMM D, YYYY' }) => {
  if (timestamp) {
    return dayjs(timestamp).format(format);
  }
  return null;
};

const formatPassedTimestamp = (timestamp) => {
  if (timestamp) {
    return formatTimestamp({ timestamp });
  }
  return 'Has not passed';
};

const formatPercentage = ({ decimal, numDecimals = 1 }) => (
  decimal ? `${parseFloat((decimal * 100).toFixed(numDecimals))}%` : '0%'
);

function i18nFormatTimestamp({ intl, timestamp }) {
  if (timestamp) {
    return intl.formatDate(formatTimestamp({ timestamp }), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return timestamp;
}

function i18nFormatPassedTimestamp({ intl, timestamp }) {
  if (timestamp) {
    return i18nFormatTimestamp({ intl, timestamp });
  }
  return intl.formatMessage({
    id: 'admin.portal.lpr.enrollments.table.not.passed.text.status',
    defaultMessage: 'Has not passed',
    description: 'Text to display when the learner has not passed the course',
  });
}

function i18nFormatProgressStatus({ intl, progressStatus }) {
  switch (progressStatus) {
    case 'In Progress':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.in.progress',
        defaultMessage: 'In Progress',
        description: 'Text to display when the learner is in progress of the course',
      });
    case 'Passed':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.passed',
        defaultMessage: 'Passed',
        description: 'Text to display when the learner has passed the course',
      });
    case 'Audit Access Expired':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.audit.access.expired',
        defaultMessage: 'Audit Access Expired',
        description: 'Text to display when the learner has audit access expired',
      });
    case 'Failed':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.failed',
        defaultMessage: 'Failed',
        description: 'Text to display when the learner has failed the course',
      });
    case 'Cancelled':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.cancelled',
        defaultMessage: 'Cancelled',
      });
    case 'Enrolled':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.enrolled',
        defaultMessage: 'Enrolled',
      });
    case 'Pass':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.pass',
        defaultMessage: 'Pass',
      });
    case 'Pending':
      return intl.formatMessage({
        id: 'admin.portal.lpr.progress.status.pending',
        defaultMessage: 'Pending',
      });
    default:
      return progressStatus;
  }
}

const updateUrl = (navigate, currentPath, queryOptions) => {
  if (!queryOptions) {
    return;
  }
  const newQueryParams = new URLSearchParams(window.location.search);
  // Apply any updates passed in over the current query. This requires consumers to explicitly
  // pass in parameters they want to remove, such as resetting the page when sorting, but ensures
  // that we bring forward all other params such as feature flags
  Object.entries(queryOptions).forEach(([key, value]) => {
    if (key === 'page' && value === 1) {
      // Because we show page 1 by default, theres no reason to set the url to page=1
      newQueryParams.delete('page');
      return;
    }
    if (!value) {
      newQueryParams.delete(key);
      return;
    }
    newQueryParams.set(key, value);
  });

  const newQueryString = newQueryParams.toString();
  if (newQueryString !== window.location.search) {
    navigate({ pathname: currentPath, search: newQueryString });
  }
};

// Returns an object containing pagination options (page_size, page, ordering) based on the current
// window location's query string, or, if not set in the window location uses defaults values.
const getPageOptionsFromUrl = () => {
  // TODO: this will not support multiple tables paging on a single page. Will need to prefix url
  // params with table id (or some other mechanism) if this becomes a feature requirement
  const defaults = {
    pageSize: 50,
    page: 1,
  };
  const query = new URLSearchParams(window.location.search);
  const pageOptions = {
    page_size: parseInt(query.get('page_size'), 10) || defaults.pageSize,
    page: parseInt(query.get('page'), 10) || defaults.page,
  };
  if (query.has('ordering')) {
    pageOptions.ordering = query.get('ordering');
  }
  if (query.has('search')) {
    pageOptions.search = query.get('search');
  }
  if (query.has('search_course')) {
    pageOptions.search_course = query.get('search_course');
  }
  if (query.has('budget_uuid')) {
    pageOptions.budget_uuid = query.get('budget_uuid');
  }
  if (query.has('group_uuid')) {
    pageOptions.group_uuid = query.get('group_uuid');
  }
  if (query.has('search_start_date')) {
    pageOptions.search_start_date = query.get('search_start_date');
  }
  return pageOptions;
};

const removeTrailingSlash = path => path.replace(/\/$/, '');

const isTriggerKey = ({ triggerKeys, action, key }) => (
  triggerKeys[action].indexOf(key) > -1
);

// Validation functions
const isRequired = (value = '') => (isEmpty(value) ? 'This field is required.' : undefined);
const isValidEmail = (value = '') => (!isEmail(value) ? 'Must be a valid email address.' : undefined);
const isNotValidNumberString = (value = '') => (!isEmpty(value) && !isNumeric(value, { no_symbols: true }) ? 'Must be a valid number.' : undefined);
const maxLength = max => value => (value && value.length > max ? 'Must be 512 characters or less' : undefined);
const maxLength512 = maxLength(512);
const isValidNumber = (value) => {
  // Verify is a valid number, whether it's a javascript number or string representation of a number
  let isValidNum = isNumber(value);
  if (!isValidNum && isString(value)) {
    isValidNum = !isNotValidNumberString(value);
  }
  return isValidNum;
};

/** camelCase <--> snake_case functions
 * Because responses from django come as snake_cased JSON, its best
 * to transform them into camelCase for use within components. Try
 * to avoid passing snake_cased objects or arrays as props, and transform
 * them ahead of time.
 */
const modifyObjectKeys = (object, modify) => {
  // If the passed in object is not an object, return it.
  if (
    object === undefined
    || object === null
    || (typeof object !== 'object' && !Array.isArray(object))
  ) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map(value => modifyObjectKeys(value, modify));
  }

  // Otherwise, process all its keys.
  const result = {};
  Object.entries(object).forEach(([key, value]) => {
    result[modify(key)] = modifyObjectKeys(value, modify);
  });
  return result;
};

const camelCaseDict = (data) => {
  const transformedData = {};
  [...Object.entries(data)]
    .forEach(entry => {
      [, transformedData[camelCase(entry[0])]] = entry;
    });
  return transformedData;
};

const camelCaseDictArray = (data) => {
  const transformedData = [];
  data.forEach(config => {
    transformedData.push(camelCaseDict(config));
  });
  return transformedData;
};

const snakeCaseDict = (data) => {
  const transformedData = {};
  [...Object.entries(data)]
    .forEach(entry => {
      [, transformedData[snakeCase(entry[0])]] = entry;
    });
  return transformedData;
};

const snakeCaseFormData = (formData) => {
  const transformedData = new FormData();
  [...formData.entries()]
    .forEach(entry => (
      transformedData.append(snakeCase(entry[0]), entry[1])
    ));
  return transformedData;
};

const snakeCaseObjectToForm = (payload) => {
  // transforms an object to a snake_cased FormData object
  const snakeCaseData = snakeCaseObject(payload);
  const formData = new FormData();
  Object.keys(snakeCaseData).forEach(key => formData.append(key, snakeCaseData[key]));
  return formData;
};

const transformTemplate = (emailType, template) => ({
  [emailType]: {
    'email-template-subject': template.email_subject,
    'email-template-greeting': template.email_greeting,
    'email-template-body': template.email_body,
    'email-template-closing': template.email_closing,
    ...(features.FILE_ATTACHMENT && { 'email-template-files': template.email_files }),
    'template-name-select': template.name,
    'email-address': template.email_address,
    'template-id': template.id,
  },
});

const updateTemplateEmailAddress = (state, emailAddress) => {
  state.default.assign['email-address'] = emailAddress; // eslint-disable-line no-param-reassign
  state.assign['email-address'] = emailAddress; // eslint-disable-line no-param-reassign
};

const updateAllTemplates = (template, state) => {
  const { allTemplates } = state;
  const templateId = template.id;
  const index = allTemplates.findIndex(item => item.id === templateId);
  if (index >= 0) {
    allTemplates[index] = template;
  } else {
    allTemplates.push(template);
  }
  return allTemplates;
};

const mergeErrors = (object, other) => {
  const customizer = (objValue, srcValue) => {
    if (isArray(objValue)) {
      return objValue.concat(srcValue);
    }

    return undefined;
  };

  return mergeWith(object, other, customizer);
};

const getSubscriptionContactText = (contactEmail) => {
  let contactText = 'To learn more about your unlimited subscription and edX, contact your edX administrator';
  if (contactEmail) {
    contactText = `${contactText} at ${contactEmail}`;
  }
  return `${contactText}.`;
};

function truncateString(str, maxStrLength = 10) {
  if (str.length <= maxStrLength) {
    return str;
  }
  return `${str.slice(0, maxStrLength)}...`;
}

function urlValidation(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

const normalizeFileUpload = (value) => value && value.split(/\r\n|\n/);

// this is needed for annoying testing mock reasons
export const getChannelMap = () => ({
  [BLACKBOARD_TYPE]: {
    displayName: 'Blackboard',
    icon: BlackboardIcon,
    post: LmsApiService.postNewBlackboardConfig,
    update: LmsApiService.updateBlackboardConfig,
    delete: LmsApiService.deleteBlackboardConfig,
    fetch: LmsApiService.fetchSingleBlackboardConfig,
    fetchGlobal: LmsApiService.fetchBlackboardGlobalConfig,
  },
  [CANVAS_TYPE]: {
    displayName: 'Canvas',
    icon: CanvasIcon,
    post: LmsApiService.postNewCanvasConfig,
    update: LmsApiService.updateCanvasConfig,
    delete: LmsApiService.deleteCanvasConfig,
    fetch: LmsApiService.fetchSingleCanvasConfig,
  },
  [CORNERSTONE_TYPE]: {
    displayName: 'Cornerstone',
    icon: CornerstoneIcon,
    post: LmsApiService.postNewCornerstoneConfig,
    update: LmsApiService.updateCornerstoneConfig,
    delete: LmsApiService.deleteCornerstoneConfig,
  },
  [DEGREED2_TYPE]: {
    displayName: 'Degreed',
    icon: DegreedIcon,
    post: LmsApiService.postNewDegreed2Config,
    update: LmsApiService.updateDegreed2Config,
    delete: LmsApiService.deleteDegreed2Config,
  },
  [MOODLE_TYPE]: {
    displayName: 'Moodle',
    icon: MoodleIcon,
    post: LmsApiService.postNewMoodleConfig,
    update: LmsApiService.updateMoodleConfig,
    delete: LmsApiService.deleteMoodleConfig,
  },
  [SAP_TYPE]: {
    displayName: 'SAP Success Factors',
    icon: SAPIcon,
    post: LmsApiService.postNewSuccessFactorsConfig,
    update: LmsApiService.updateSuccessFactorsConfig,
    delete: LmsApiService.deleteSuccessFactorsConfig,
  },
});

const channelMapping = {
  [BLACKBOARD_TYPE]: {
    displayName: 'Blackboard',
    icon: BlackboardIcon,
    helpCenter: HELP_CENTER_BLACKBOARD,
    delete: LmsApiService.deleteBlackboardConfig,
    fetch: LmsApiService.fetchSingleBlackboardConfig,
    fetchGlobal: LmsApiService.fetchBlackboardGlobalConfig,
    post: LmsApiService.postNewBlackboardConfig,
    update: LmsApiService.updateBlackboardConfig,
  },
  [CANVAS_TYPE]: {
    displayName: 'Canvas',
    icon: CanvasIcon,
    helpCenter: HELP_CENTER_CANVAS,
    delete: LmsApiService.deleteCanvasConfig,
    fetch: LmsApiService.fetchSingleCanvasConfig,
    post: LmsApiService.postNewCanvasConfig,
    update: LmsApiService.updateCanvasConfig,
  },
  [CORNERSTONE_TYPE]: {
    displayName: 'Cornerstone',
    icon: CornerstoneIcon,
    helpCenter: HELP_CENTER_CORNERSTONE,
    delete: LmsApiService.deleteCornerstoneConfig,
    fetch: LmsApiService.fetchSingleCornerstoneConfig,
    post: LmsApiService.postNewCornerstoneConfig,
    update: LmsApiService.updateCornerstoneConfig,
  },
  [DEGREED2_TYPE]: {
    displayName: 'Degreed',
    icon: DegreedIcon,
    helpCenter: HELP_CENTER_DEGREED,
    delete: LmsApiService.deleteDegreed2Config,
    fetch: LmsApiService.fetchSingleDegreed2Config,
    post: LmsApiService.postNewDegreed2Config,
    update: LmsApiService.updateDegreed2Config,
  },
  [MOODLE_TYPE]: {
    displayName: 'Moodle',
    icon: MoodleIcon,
    helpCenter: HELP_CENTER_MOODLE,
    delete: LmsApiService.deleteMoodleConfig,
    fetch: LmsApiService.fetchSingleMoodleConfig,
    post: LmsApiService.postNewMoodleConfig,
    update: LmsApiService.updateMoodleConfig,
  },
  [SAP_TYPE]: {
    displayName: 'SAP Success Factors',
    icon: SAPIcon,
    helpCenter: HELP_CENTER_SAP,
    delete: LmsApiService.deleteSuccessFactorsConfig,
    fetch: LmsApiService.fetchSingleSuccessFactorsConfig,
    post: LmsApiService.postNewSuccessFactorsConfig,
    update: LmsApiService.updateSuccessFactorsConfig,
  },
};

const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

const createArrayFromValue = (value) => {
  const values = [];
  if (Array.isArray(value)) {
    return value;
  }
  values.push(value);
  return values;
};

const isDefined = (value) => {
  const values = createArrayFromValue(value);
  return values.every(item => item !== undefined);
};

const isNull = (value) => {
  const values = createArrayFromValue(value);
  return values.every(item => item === null);
};

const isDefinedAndNotNull = (value) => {
  const values = createArrayFromValue(value);
  return values.every(item => isDefined(item) && !isNull(item));
};

const pollAsync = async (pollFunc, timeout, interval, checkFunc) => {
  const startTime = new Date().getTime();
  while (new Date().getTime() - startTime < timeout) {
    // eslint-disable-next-line no-await-in-loop
    const result = await pollFunc();
    if (checkFunc ? checkFunc(result) : !!result) {
      return result;
    }
    // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
};

/**
 * Modifies the retry behavior of queries to retry up to max 3 times (default) or if
 * the error returned by the query is a 404 HTTP status code (not found). This configuration
 * may be overridden per-query, as needed.
 */
function defaultQueryClientRetryHandler(failureCount, err) {
  if (failureCount >= 3 || err.customAttributes?.httpErrorStatus === 404) {
    return false;
  }
  return true;
}

/**
 * Logs a react-query query error message on failure
 */
function queryCacheOnErrorHandler(error, query) {
  if (query.meta?.errorMessage) {
    logError(query.meta?.errorMessage);
  }
}

/**
 * Determines whether a subsidy access policy is assignable, based on its policy type
 * and the presence of an assignment configuration.
 */
function isAssignableSubsidyAccessPolicyType(policy) {
  const policyType = policy?.policyType;
  const isAssignable = !!policy?.assignmentConfiguration;
  const assignableSubsidyAccessPolicyTypes = ['AssignedLearnerCreditAccessPolicy'];
  return isAssignable && assignableSubsidyAccessPolicyTypes.includes(policyType);
}

/**
 * Helper to determine which table columns have an active filter applied.
 *
 * @param {object} columns Array of column objects (e.g., { id, filter, filterValue })
 * @returns Array of column objects with an active filter applied.
 */
function getActiveTableColumnFilters(columns) {
  return columns.map(column => ({
    name: column.id,
    filter: column.filter,
    filterValue: column.filterValue,
  })).filter(filter => !!filter.filterValue);
}

/**
 * Helper to transform a string into a plural form based on a number.
 *
 * @returns A string with the number and the plural form of the string.
 */
function makePlural(num, string) {
  const stringEndings = ['s', 'x', 'z'];
  if (num > 1 || num === 0) {
    if (stringEndings.includes(string.charAt(string.length - 1))) {
      return `${num} ${string}es`;
    }
    return `${num} ${string}s`;
  }
  return `${num} ${string}`;
}

/**
 * Pluralizes a word that typically ends with s based on the benchmark passed
 *
 * @param textToPlural
 * @param pluralBenchmark
 * @param punctuation
 * @returns {string}
 */
const pluralText = (
  textToPlural,
  pluralBenchmark,
  punctuation = '',
) => (pluralBenchmark > 1 || pluralBenchmark === 0 ? `${textToPlural}s${punctuation}` : `${textToPlural}${punctuation}`);

/**
 * Helper function to determine if a content is archived.
 *
 * @param {Object} content (can be program, course, or pathway)
 * @returns {Boolean}
 */
function isArchivedContent(content) {
  const { courseRunStatuses } = content;
  if (!courseRunStatuses) {
    return false;
  }
  const ARCHIVABLE_STATUSES = [COURSE_RUN_STATUSES.archived, COURSE_RUN_STATUSES.unpublished];
  return courseRunStatuses.every(status => ARCHIVABLE_STATUSES.includes(status));
}

/**
 * Helper function utilizing dayjs's 'isBetween' function to determine
 * if the date passed is between today and an offset amount of days
 *
 * @param date
 * @param days
 * @returns {boolean}
 */
function isTodayWithinDateThreshold({ date, days }) {
  const dateToCheck = dayjs(date);
  const today = dayjs();
  const offsetDays = dateToCheck.subtract(days, 'days');
  return today.isBetween(offsetDays, dateToCheck);
}
// TODO: Generalize this function with isTodayWithinDateThreshold
function isTodayBetweenDates({ startDate, endDate }) {
  const today = dayjs();
  const formattedStartDate = dayjs(startDate);
  const formattedEndDate = dayjs(endDate);
  return today.isBetween(formattedStartDate, formattedEndDate);
}

/**
 * Helper function to determine if a value is falsy.
 * Returns true if value is "", null, or undefined
 *
 * @param value
 * @returns {boolean}
 */
const isFalsy = (value) => value == null || value === '';

/**
 * Generate filename with current timestamp prepended to given suffix
 *
 * @param {string} suffix
 * @returns {string}
 */
function getTimeStampedFilename(suffix) {
  const padTwoZeros = (num) => num.toString().padStart(2, '0');
  const currentDate = new Date();
  const year = currentDate.getUTCFullYear();
  const month = padTwoZeros(currentDate.getUTCMonth() + 1);
  const day = padTwoZeros(currentDate.getUTCDate());
  return `${year}-${month}-${day}-${suffix}`;
}

/**
 * Transform data to csv format and save to file
 *
 * @param {string} fileName
 *  Name of the file to save to
 * @param {Array<object>} data
 *  Data to transform to csv format
 * @param {Array<string>} headers
 *  Text headers for the file
 * @param {(object) => Array<string|number>} dataEntryToRow
 *  Transform function, taking a single data entry and converting it to array of string or numeric values
 *  that will represent a row of data in the csv document
 *  Note: Enclosing quotes will be added to any string fields containing commas
 */
function downloadCsv(fileName, data, headers, dataEntryToRow) {
  // If a cell in a csv document contains commas, we need to enclose cell in quotes
  const escapeCommas = (cell) => (isString(cell) && cell.includes(',') ? `"${cell}"` : cell);
  const generateCsvRow = (entry) => dataEntryToRow(entry).map(escapeCommas);

  const body = data.map(generateCsvRow).join('\n');
  const csvText = `${headers}\n${body}`;
  const blob = new Blob([csvText], {
    type: 'text/csv',
  });
  saveAs(blob, fileName);
}

/**
 * Split a string by given separator, and return array of trimmed, non-blank string entries
 */
function splitAndTrim(separator, str) {
  return str.split(separator).map((subStr) => subStr.trim()).filter((subStr) => subStr.length > 0);
}

/**
 * Remove strings from a list, matching in a case-sensitive manner
 * @param {Array<string>} list
 *  List of strings to remove from
 * @param {Array<string>} stringsToRemove
 *  Strings that should be removed from list
 * @returns {Array<string>}
 */
function removeStringsFromList(list, stringsToRemove) {
  return without(list, ...stringsToRemove);
}

/**
 * Remove strings from a list, matching in a case-insensitive manner
 * @param {Array<string>} list
 *  List of strings to remove from
 * @param {Array<string>} stringsToRemove
 *  Strings that should be removed from list
 * @returns {Array<string>}
 */
function removeStringsFromListCaseInsensitive(list, stringsToRemove) {
  // Create lowercased versions of original strings
  const lowercasePairs = list.map(str => [str.toLowerCase(), str]);
  // Create lookup of lowercased -> original strings
  const lowercaseLookup = fromPairs(lowercasePairs);
  // Use lowercased list with lowercased removal strings to perform an efficient set difference operation
  const lowercaseList = lowercasePairs.map(pair => pair[0]);
  const lowercaseToRemove = stringsToRemove.map(str => str.toLowerCase());
  const remainingLowercase = removeStringsFromList(lowercaseList, lowercaseToRemove);
  // Return set difference mapped back to original strings
  return remainingLowercase.map(str => lowercaseLookup[str]);
}

/**
 * Save a value to local storage
 * @param {string} key
 *  Key to save the value under
 * @param {any} value
 *  Value to save
 */
const saveToLocalStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

/**
 * Retrieve a value from local storage
 * @param {string} key
 *  Key to retrieve the value from
 * @returns {any}
 *  Value stored under the key, or null if not found
 */
const getFromLocalStorage = (key) => {
  const savedValue = localStorage.getItem(key);
  return savedValue ? JSON.parse(savedValue) : null;
};

/**
 * Extracts and filters URL query parameters based on an allowed list.
 *
 * @param {string} queryString - The query string part of the URL (e.g. "?search=AI&extra=123").
 * @param {string[]} expectedParams - An array of expected query parameter keys to include.
 * @returns {Object} An object containing only the filtered query parameters.
 */
function getFilteredQueryParams(queryString, expectedParams) {
  // Convert the query string to a URLSearchParams object
  const queryParams = new URLSearchParams(queryString);

  // Convert queryParams to an object
  const options = Object.fromEntries(queryParams.entries());

  // Filter the options object to include only expected parameters
  const filteredOptions = Object.fromEntries(
    Object.entries(options).filter(([key]) => expectedParams.includes(key)),
  );

  return filteredOptions;
}

export {
  camelCaseDict,
  camelCaseDictArray,
  channelMapping,
  createArrayFromValue,
  formatPercentage,
  formatPassedTimestamp,
  formatTimestamp,
  removeTrailingSlash,
  updateUrl,
  getPageOptionsFromUrl,
  isDefined,
  isDefinedAndNotNull,
  isNull,
  isTriggerKey,
  isRequired,
  isValidEmail,
  isValidNumber,
  modifyObjectKeys,
  snakeCaseDict,
  snakeCaseFormData,
  snakeCaseObjectToForm,
  maxLength512,
  transformTemplate,
  updateTemplateEmailAddress,
  updateAllTemplates,
  mergeErrors,
  getSubscriptionContactText,
  truncateString,
  urlValidation,
  normalizeFileUpload,
  capitalizeFirstLetter,
  pollAsync,
  isNotValidNumberString,
  defaultQueryClientRetryHandler,
  isAssignableSubsidyAccessPolicyType,
  getActiveTableColumnFilters,
  queryCacheOnErrorHandler,
  makePlural,
  pluralText,
  isArchivedContent,
  i18nFormatTimestamp,
  i18nFormatPassedTimestamp,
  i18nFormatProgressStatus,
  isTodayWithinDateThreshold,
  isTodayBetweenDates,
  isFalsy,
  getTimeStampedFilename,
  downloadCsv,
  splitAndTrim,
  removeStringsFromList,
  removeStringsFromListCaseInsensitive,
  saveToLocalStorage,
  getFromLocalStorage,
  getFilteredQueryParams,
};
