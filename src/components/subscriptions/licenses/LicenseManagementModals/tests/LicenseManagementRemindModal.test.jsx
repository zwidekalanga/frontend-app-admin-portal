import React from 'react';
import dayjs from 'dayjs';
import {
  act, cleanup, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { logError } from '@edx/frontend-platform/logging';

import { IntlProvider } from '@edx/frontend-platform/i18n';
import LicenseManagerApiService from '../../../../../data/services/LicenseManagerAPIService';
import LicenseManagementRemindModal from '../LicenseManagementRemindModal';
import { ASSIGNED } from '../../../data/constants';

const mockStore = configureMockStore();
const store = mockStore({
  portalConfiguration: {
    enterpriseId: 'test-enterprise-id',
  },
});
jest.mock('../../../../../data/services/LicenseManagerAPIService', () => ({
  __esModule: true,
  default: {
    licenseBulkRemind: jest.fn(),
    licenseRemindAll: jest.fn(),
  },
}));

const onSubmitMock = jest.fn();
const onSuccessMock = jest.fn();

const basicProps = {
  isOpen: true,
  onClose: () => {},
  onSuccess: onSuccessMock,
  onSubmit: onSubmitMock,
  subscription: {
    uuid: 'lorem',
    expirationDate: dayjs().add(1, 'days').format(), // tomorrow
  },
  usersToRemind: [],
  activeFilters: [],
  remindAllUsers: undefined,
  totalToRemind: undefined,
};

const sampleUser = {
  email: 'foo@bar.io',
};

const LicenseManagementRemindModalWithStore = (props) => (
  <IntlProvider locale="en">
    <Provider store={store}>
      <LicenseManagementRemindModal {...props} />
    </Provider>
  </IntlProvider>
);

describe('<LicenseManagementRemindModal />', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders when isOpen', () => {
    render(LicenseManagementRemindModalWithStore(basicProps));
    expect(screen.queryByRole('dialog')).toBeTruthy();
  });

  describe('submit button and title displays right text when ', () => {
    it('reminding only 1 user', () => {
      const props = { ...basicProps, usersToRemind: [sampleUser], totalToRemind: 1 };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      expect(screen.queryByText('Remind User')).toBeTruthy();
      expect(screen.queryByText('Remind (1)')).toBeTruthy();
    });
    it('reminding only more then 1 user', () => {
      const props = { ...basicProps, usersToRemind: [sampleUser, sampleUser], totalToRemind: 2 };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      expect(screen.queryByText('Remind Users')).toBeTruthy();
      expect(screen.queryByText('Remind (2)')).toBeTruthy();
    });
    it('reminding all users', () => {
      const props = { ...basicProps, remindAllUsers: true, totalToRemind: null };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      expect(screen.queryByText('Remind Users')).toBeTruthy();
      expect(screen.queryByText('Remind all')).toBeTruthy();
    });
    it('reminding all users, with totalToRemind provided', () => {
      const props = {
        ...basicProps,
        remindAllUsers: true,
        totalToRemind: 10,
      };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      expect(screen.queryByText('Remind Users')).toBeTruthy();
      expect(screen.queryByText('Remind (10)')).toBeTruthy();
    });
  });

  describe('when submit button is clicked', () => {
    it('displays done on submit', async () => {
      const user = userEvent.setup();
      LicenseManagerApiService.licenseBulkRemind.mockResolvedValue({ data: {} });
      const props = { ...basicProps, usersToRemind: [sampleUser], totalToRemind: 1 };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      const button = screen.getByText('Remind (1)');
      await user.click(button);
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);

      expect(screen.queryByText('Remind (1)')).toBeFalsy();
      expect(screen.queryByText('Done')).toBeTruthy();
      expect(logError).toHaveBeenCalledTimes(0);
    });

    it('displays alert if licenseRemind has error', async () => {
      const user = userEvent.setup();
      LicenseManagerApiService.licenseBulkRemind.mockRejectedValue(new Error('something went wrong'));
      const props = { ...basicProps, usersToRemind: [sampleUser], totalToRemind: 1 };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      const button = screen.getByText('Remind (1)');
      await user.click(button);
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      expect(onSuccessMock).toHaveBeenCalledTimes(0);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
      });
      expect(logError).toHaveBeenCalledTimes(1);
    });
  });

  describe('calls the correct remind endpoint', () => {
    beforeEach(() => {
      LicenseManagerApiService.licenseRemindAll.mockResolvedValue({ data: {} });
      LicenseManagerApiService.licenseBulkRemind.mockResolvedValue({ data: {} });
    });

    it('calls licenseRemindAll when reminding all users and there are no active filters', async () => {
      const user = userEvent.setup();
      const props = {
        ...basicProps, remindAllUsers: true, totalToRemind: null, activeFilters: [],
      };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      const button = screen.getByText('Remind all');
      await user.click(button);
      expect(LicenseManagerApiService.licenseRemindAll).toHaveBeenCalled();
    });

    it('calls licenseBulkRemind with emails when users are passed in', async () => {
      const user = userEvent.setup();
      const props = {
        ...basicProps,
        usersToRemind: [sampleUser],
        totalToRemind: 1,
        activeFilters: [{ // part of the test is that these activeFilters are not sent in the request body
          name: 'statusBadge',
          filterValue: [ASSIGNED],
        }],
      };

      act(() => {
        render(LicenseManagementRemindModalWithStore({ ...props }));
      });

      const button = screen.getByText('Remind (1)');
      await user.click(button);
      expect(LicenseManagerApiService.licenseBulkRemind).toHaveBeenCalledWith(
        props.subscription.uuid,
        {
          closing: expect.anything(),
          greeting: expect.anything(),
          user_emails: [sampleUser.email],
        },
      );
    });

    it('calls licenseBulkRemind with filters when reminding all users and filters are applied', async () => {
      const user = userEvent.setup();
      const props = {
        ...basicProps,
        remindAllUsers: true,
        usersToRemind: [sampleUser], // part of the test here is that the emails are not sent in the request body
        totalToRemind: null,
        activeFilters: [{
          name: 'statusBadge',
          filterValue: [ASSIGNED],
        }],
      };
      render(LicenseManagementRemindModalWithStore({ ...props }));
      const button = screen.getByText('Remind all');
      await user.click(button);
      expect(LicenseManagerApiService.licenseBulkRemind).toHaveBeenCalledWith(
        props.subscription.uuid,
        {
          closing: expect.anything(),
          greeting: expect.anything(),
          filters: [{
            name: 'status_in',
            filter_value: [ASSIGNED],
          }],
        },
      );
    });
  });
});
