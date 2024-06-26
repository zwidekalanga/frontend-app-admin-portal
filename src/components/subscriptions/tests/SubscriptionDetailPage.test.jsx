import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { mockNavigate } from 'react-router-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useSubscriptionFromParams } from '../data/contextHooks';
import { SubscriptionDetailPage } from '../SubscriptionDetailPage';
import { SubscriptionManagementContext, SUBSCRIPTION_PLAN_ZERO_STATE } from './TestUtilities';
import { ROUTE_NAMES } from '../../EnterpriseApp/data/constants';
import { MANAGE_LEARNERS_TAB } from '../data/constants';

jest.mock('../SubscriptionDetails', () => ({
  __esModule: true,
  default: () => <div data-testid="subscription-details" />,
}));
jest.mock('../expiration/SubscriptionExpirationModals', () => ({
  __esModule: true,
  default: () => <div data-testid="subscription-expiration-modals" />,
}));
jest.mock('../licenses/LicenseAllocationDetails', () => ({
  __esModule: true,
  default: () => <div data-testid="license-allocation-details" />,
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect: jest.fn(({ to }) => `Redirected to ${to}`),
}));

jest.mock('../data/contextHooks', () => ({
  useSubscriptionFromParams: jest.fn(),
}));

jest.mock('react-router-dom', () => {
  const mockNavigation = jest.fn();

  // eslint-disable-next-line react/prop-types
  const Navigate = ({ to }) => {
    mockNavigation(to);
    return <div />;
  };

  return {
    ...jest.requireActual('react-router-dom'),
    Navigate,
    mockNavigate: mockNavigation,
  };
});

const defaultProps = {
  enterpriseSlug: 'sluggy',
  match: {
    params: {
      enterpriseSlug: 'sluggy',
      subscriptionUUID: 'uuid-ed',
    },
  },
};

const fakeSubscription = {
  uuid: 'fake-subscription-uuid',
};

const SubscriptionDetailPageWrapper = (props) => (
  <IntlProvider locale="en">
    <SubscriptionManagementContext detailState={SUBSCRIPTION_PLAN_ZERO_STATE}>
      <SubscriptionDetailPage {...props} />
    </SubscriptionManagementContext>
  </IntlProvider>
);

describe('<SubscriptionDetailPage />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the subscription detail page children components', () => {
    useSubscriptionFromParams.mockReturnValue([fakeSubscription, false]);
    render(<SubscriptionDetailPageWrapper {...defaultProps} />);
    screen.getByTestId('subscription-details');
    screen.getByTestId('subscription-expiration-modals');
    screen.getByTestId('license-allocation-details');
  });
  it('shows a loading screen ', () => {
    useSubscriptionFromParams.mockReturnValue([null, true]);
    render(<SubscriptionDetailPageWrapper {...defaultProps} />);
    expect(screen.getByTestId('skelly')).toBeInTheDocument();
  });
  it('redirects to the subscription choosing page if there is no subscription', async () => {
    useSubscriptionFromParams.mockReturnValue([null, false]);

    render(<SubscriptionDetailPageWrapper {...defaultProps} />);

    const expectedPath = `/${defaultProps.enterpriseSlug}/admin/${ROUTE_NAMES.subscriptionManagement}/${MANAGE_LEARNERS_TAB}`;
    expect(mockNavigate).toHaveBeenLastCalledWith(expectedPath);
  });
});
