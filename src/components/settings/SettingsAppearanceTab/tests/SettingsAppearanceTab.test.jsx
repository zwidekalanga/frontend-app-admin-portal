import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { Provider } from 'react-redux';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { SettingsAppearanceTab } from '..';
import { SAGE_THEME, SCHOLAR_THEME } from '../../data/constants';
import LmsApiService from '../../../../data/services/LmsApiService';

const enterpriseId = 'an-id-1';

let enterpriseBranding = {
  primary_color: SCHOLAR_THEME.button,
  secondary_color: SCHOLAR_THEME.banner,
  tertiary_color: SCHOLAR_THEME.accent,
};

const initialStore = {
  portalConfiguration: {
    enterpriseId,
    enterpriseSlug: 'sluggy',
    enterpriseName: 'sluggyent',
    enterpriseBranding: {
      primary_color: SCHOLAR_THEME.button,
      secondary_color: SCHOLAR_THEME.banner,
      tertiary_color: SCHOLAR_THEME.accent,
    },
  },
};

const mockStore = configureMockStore([thunk]);
const getMockStore = aStore => mockStore(aStore);
const store = getMockStore({ ...initialStore });
const mockPortalUpdate = jest.fn();

jest.mock('../../../../data/services/LmsApiService', () => ({
  updateEnterpriseCustomerBranding: jest.fn(),
}));

describe('Portal Appearance Tab', () => {
  test('renders base page with correct text and dropzone', async () => {
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );
    expect(screen.getByText('Portal Appearance')).toBeInTheDocument();
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your file here or click to upload.')).toBeInTheDocument();
  });

  test('info hover on logo', async () => {
    const user = userEvent.setup();
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.hover(screen.getByTestId('logo-info-hover'));
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });
  // TODO: Fix
  test('drop image into dropzone', async () => {
    const user = userEvent.setup();
    const spy = jest.spyOn(LmsApiService, 'updateEnterpriseCustomerBranding');

    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });

    // Find the hidden file input inside the dropzone
    // const fileInput = screen.getByLabelText(/upload/i); // <-- You may need to adjust this
    const fileInput = document.querySelector('input[type="file"]');
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
  test('drops invalid image file type into dropzone', async () => {
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );
    const fakeFile = new File(['hello'], 'invalid.jpg', { type: 'image/jpeg' });

    const dropzone = await screen.findByTestId('logo-upload');

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [fakeFile],
        types: ['Files'],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid file type, only png images allowed.')).toBeInTheDocument();
    });
  });
  test('renders curated theme cards', async () => {
    const user = userEvent.setup();
    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );
    expect(screen.getByText('Scholar (Default)')).toBeInTheDocument();
    expect(screen.getByTestId('radio-Scholar (Default)')).toBeChecked();
    expect(screen.getByText('Sage')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Cambridge')).toBeInTheDocument();
    expect(screen.getByText('Acumen')).toBeInTheDocument();
    expect(screen.getByText('Pioneer')).toBeInTheDocument();

    await user.click(screen.getByTestId('radio-Impact'));
    await waitFor(() => {
      expect(screen.getByTestId('radio-Impact')).toBeChecked();
    });
  });
  test('autoselects correct brand card', async () => {
    enterpriseBranding = {
      primary_color: SAGE_THEME.button,
      secondary_color: SAGE_THEME.banner,
      tertiary_color: SAGE_THEME.accent,
    };

    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );
    expect(screen.getByText('Sage')).toBeInTheDocument();
    expect(screen.getByTestId('radio-Sage')).toBeChecked();
  });
  // TODO: Fix
  test.skip('creating custom theme card', async () => {
    const user = userEvent.setup();
    const spy = jest.spyOn(LmsApiService, 'updateEnterpriseCustomerBranding');
    enterpriseBranding = {
      primary_color: SAGE_THEME.button,
      secondary_color: SAGE_THEME.banner,
      tertiary_color: SAGE_THEME.accent,
    };

    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );
    const createCustom = screen.getByText('Create a custom theme.');
    await user.click(createCustom);
    expect(screen.getByText('Customize the admin and learner edX experience using your own brand colors. Enter color values in hexadecimal code.')).toBeInTheDocument();
    expect(screen.getByText('Add theme')).toBeDisabled();
    await user.type(screen.getByLabelText('Banner color'), 'bad number');
    expect(screen.getByText('Must be hexadecimal starting with # (Ex: #1e0b57)')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Button color'), '#023E8A');
    await user.type(screen.getByLabelText('Accent color'), '#0077b6');
    expect(screen.getByText('Add theme')).toBeDisabled();

    await user.clear(screen.getByLabelText('Banner color'));
    await user.clear(screen.getByLabelText('Button color'));

    await user.type(screen.getByLabelText('Banner color'), '#03045e');
    await user.type(screen.getByLabelText('Button color'), '#828282');

    expect(screen.getByText('Color does not meet the WCAG AA standard of accessibility. Learn more at the help center link below.')).toBeInTheDocument();

    // user shouldn't be able to add a theme with a bad hex color, but will be able to add one that
    // doesn't meet AA accessibility standards

    await user.click(screen.getByText('Add theme'));
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
  test('editing and deleting custom card', async () => {
    const user = userEvent.setup();
    enterpriseBranding = {
      primary_color: '#03045e',
      secondary_color: '#023E8A',
      tertiary_color: '#0077b6',
    };

    render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <SettingsAppearanceTab
            enterpriseId={enterpriseId}
            enterpriseBranding={enterpriseBranding}
            updatePortalConfiguration={mockPortalUpdate}
          />
        </Provider>
      </IntlProvider>,
    );
    await user.click(screen.getByText('Edit'));
    expect(screen.getByText('Customize the admin and learner edX experience using your own brand colors. Enter color values in hexadecimal code.')).toBeInTheDocument();
    expect(screen.getByLabelText('Button color')).toHaveValue('#03045e');
    expect(screen.getByLabelText('Banner color')).toHaveValue('#023E8A');
    expect(screen.getByLabelText('Accent color')).toHaveValue('#0077b6');

    await user.click(screen.getByLabelText('Close'));
    expect(screen.getByText('Delete'));
    await user.click(screen.getByText('Delete'));
    expect(screen.getByText('Rather use your own colors?'));
    expect(screen.getByTestId('radio-Scholar (Default)')).toBeChecked();
  });
});
