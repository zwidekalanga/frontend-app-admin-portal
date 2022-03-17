import React from 'react';
import {
  Container,
  Tabs,
  Tab,
} from '@edx/paragon';
import {
  useHistory,
  generatePath,
  useRouteMatch,
} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { useCurrentSettingsTab } from './data/hooks';
import {
  SETTINGS_TAB_LABELS,
  SETTINGS_TABS_VALUES,
  SETTINGS_TAB_PARAM,
} from './data/constants';
import SettingsAccessTab from './SettingsAccessTab';
import SettingsLMSTab from './SettingsLMSTab';
import SettingsSSOTab from './SettingsSSOTab';
import { features } from '../../config';
import { updatePortalConfigurationEvent } from '../../data/actions/portalConfiguration';

const SettingsTabs = ({
  enterpriseId,
  enterpriseSlug,
  enableBrowseAndRequest,
  enableIntegratedCustomerLearnerPortalSearch,
  enableLearnerPortal,
  enableSamlConfigurationScreen,
  enableUniversalLink,
  identityProvider,
  updatePortalConfiguration,
}) => {
  const { FEATURE_SSO_SETTINGS_TAB } = features;

  const tab = useCurrentSettingsTab();

  const history = useHistory();
  const match = useRouteMatch();

  /**
   * Given a key from SETTINGS_TABS_VALUES, this function
   * will push a path into browser history
   * @param {string} newTabValue
   */
  const handleTabChange = (newTabValue) => {
    if (SETTINGS_TABS_VALUES[newTabValue]) {
      const newPath = generatePath(
        match.path,
        { [SETTINGS_TAB_PARAM]: newTabValue },
      );
      history.push({ pathname: newPath });
    }
  };

  return (
    <Container className="py-4" fluid>
      <Tabs
        id="settings-tabs"
        className="mb-3"
        activeKey={tab}
        onSelect={handleTabChange}
      >
        <Tab eventKey={SETTINGS_TABS_VALUES.access} title={SETTINGS_TAB_LABELS.access}>
          <SettingsAccessTab
            enterpriseId={enterpriseId}
            enableIntegratedCustomerLearnerPortalSearch={enableIntegratedCustomerLearnerPortalSearch}
            identityProvider={identityProvider}
            enableBrowseAndRequest={enableBrowseAndRequest}
            enableLearnerPortal={enableLearnerPortal}
            enableUniversalLink={enableUniversalLink}
            updatePortalConfiguration={updatePortalConfiguration}
          />
        </Tab>
        { FEATURE_SSO_SETTINGS_TAB && (
        <Tab eventKey={SETTINGS_TABS_VALUES.sso} title={SETTINGS_TAB_LABELS.sso}>
          <SettingsSSOTab enterpriseId={enterpriseId} />
        </Tab>
        )}
        <Tab eventKey={SETTINGS_TABS_VALUES.lms} title={SETTINGS_TAB_LABELS.lms}>
          <SettingsLMSTab
            enterpriseId={enterpriseId}
            enterpriseSlug={enterpriseSlug}
            enableSamlConfigurationScreen={enableSamlConfigurationScreen}
            identityProvider={identityProvider}
          />
        </Tab>
      </Tabs>
    </Container>
  );
};

const mapStateToProps = state => {
  const {
    enterpriseId,
    enterpriseSlug,
    enableBrowseAndRequest,
    enableIntegratedCustomerLearnerPortalSearch,
    enableLearnerPortal,
    enableSamlConfigurationScreen,
    enableUniversalLink,
    identityProvider,
  } = state.portalConfiguration;

  return ({
    enterpriseId,
    enterpriseSlug,
    enableBrowseAndRequest,
    enableIntegratedCustomerLearnerPortalSearch,
    enableLearnerPortal,
    enableSamlConfigurationScreen,
    enableUniversalLink,
    identityProvider,
  });
};

SettingsTabs.defaultProps = {
  identityProvider: null,
};

SettingsTabs.propTypes = {
  enterpriseId: PropTypes.string.isRequired,
  enterpriseSlug: PropTypes.string.isRequired,
  enableBrowseAndRequest: PropTypes.bool.isRequired,
  enableIntegratedCustomerLearnerPortalSearch: PropTypes.bool.isRequired,
  enableLearnerPortal: PropTypes.bool.isRequired,
  enableSamlConfigurationScreen: PropTypes.bool.isRequired,
  enableUniversalLink: PropTypes.bool.isRequired,
  identityProvider: PropTypes.string,
  updatePortalConfiguration: PropTypes.func.isRequired,
};

const mapDispatchToProps = dispatch => ({
  updatePortalConfiguration: (config) => {
    dispatch(updatePortalConfigurationEvent(config));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsTabs);
