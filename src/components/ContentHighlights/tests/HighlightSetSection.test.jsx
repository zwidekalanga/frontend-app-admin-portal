import { useState } from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import thunk from 'redux-thunk';
import { renderWithRouter, sendEnterpriseTrackEvent } from '@edx/frontend-enterprise-utils';
import algoliasearch from 'algoliasearch/lite';
import { camelCaseObject } from '@edx/frontend-platform';
import userEvent from '@testing-library/user-event';
import { ContentHighlightsContext } from '../ContentHighlightsContext';
import { configuration } from '../../../config';
import { EnterpriseAppContext } from '../../EnterpriseApp/EnterpriseAppContextProvider';
import HighlightSetSection from '../HighlightSetSection';
import { TEST_HIGHLIGHT_SET } from '../data/constants';

const mockStore = configureMockStore([thunk]);
const testHighlightSet = [camelCaseObject(TEST_HIGHLIGHT_SET)];
const initialEnterpriseAppContextValue = {
  enterpriseCuration: {
    enterpriseCuration: {
      highlightSets: testHighlightSet,
    },
  },
};

jest.mock('@edx/frontend-enterprise-utils', () => {
  const originalModule = jest.requireActual('@edx/frontend-enterprise-utils');
  return ({
    ...originalModule,
    sendEnterpriseTrackEvent: jest.fn(),
  });
});

const initialState = {
  portalConfiguration: {
    enterpriseId: 'test-enterprise-id',
    enterpriseSlug: 'test-enterprise',
  },
  highlightSetUUID: 'test-uuid',
};

const searchClient = algoliasearch(
  configuration.ALGOLIA.APP_ID,
  configuration.ALGOLIA.SEARCH_API_KEY,
);

const HighlightSetSectionWrapper = ({
  enterpriseAppContextValue = initialEnterpriseAppContextValue,
  highlightSetArray = [],
}) => {
  const contextValue = useState({
    stepperModal: {
      isOpen: false,
      highlightTitle: null,
      titleStepValidationError: null,
      currentSelectedRowIds: {},
    },
    contentHighlights: [],
    algolia: {
      searchClient,
      securedAlgoliaApiKey: null,
      isLoading: false,
    },
  });
  return (
    <IntlProvider locale="en">
      <Provider store={mockStore(initialState)}>
        <EnterpriseAppContext.Provider value={enterpriseAppContextValue}>
          <ContentHighlightsContext.Provider value={contextValue}>
            <HighlightSetSection highlightSets={highlightSetArray} />
          </ContentHighlightsContext.Provider>
        </EnterpriseAppContext.Provider>
      </Provider>
    </IntlProvider>
  );
};

describe('<HighlightSetSection />', () => {
  it('renders null if highlight set is empty', () => {
    renderWithRouter(<HighlightSetSectionWrapper />);

    expect(screen.queryByTestId('highlight-set-section')).not.toBeInTheDocument();
  });
  it('renders 4 elements with test highlight set', () => {
    renderWithRouter(<HighlightSetSectionWrapper highlightSetArray={testHighlightSet} />);

    expect(screen.getByText('4', { exact: false })).toBeInTheDocument();
  });
  it('sends segment event on click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<HighlightSetSectionWrapper highlightSetArray={testHighlightSet} />);
    const highlightSetCard = screen.getByTestId('highlight-set-card');
    await user.click(highlightSetCard);

    expect(sendEnterpriseTrackEvent).toHaveBeenCalledTimes(1);
  });
});
