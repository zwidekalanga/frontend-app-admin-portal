import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';

import { Alert } from '@openedx/paragon';
import { CheckCircle, Error } from '@openedx/paragon/icons';
import Hero from '../Hero';
import PlotlyAnalyticsCharts from './PlotlyAnalyticsCharts';

const PAGE_TITLE = 'Analytics';

const PlotlyAnalyticsPage = ({ enterpriseId, enableDemoData }) => {
  const [status, setStatus] = useState({
    visible: false, alertType: '', message: '',
  });

  const setSuccessStatus = ({ visible, message = '' }) => {
    setStatus({
      visible,
      alertType: 'success',
      message,
    });
  };

  const renderStatusMessage = () => (
    status && status.visible && (
    <Alert
      variant={status.alertType}
      icon={`fa ${status.alertType === 'success' ? { CheckCircle } : { Error }}`}
      onClose={() => setSuccessStatus({ visible: false })}
      dismissible
    >
      <Alert.Heading>{status.title}</Alert.Heading>
      <p>{status.message}</p>
    </Alert>
    )
  );

  return (
    <>
      <Helmet title={PAGE_TITLE} />
      <Hero title={PAGE_TITLE} />
      <div className="col-12 col-lg-9">
        {renderStatusMessage()}
      </div>
      <PlotlyAnalyticsCharts enterpriseId={enterpriseId} enableDemoData={enableDemoData} />
    </>
  );
};

PlotlyAnalyticsPage.propTypes = {
  enterpriseId: PropTypes.string.isRequired,
  enableDemoData: PropTypes.bool.isRequired,
};

const mapStateToProps = state => ({
  enterpriseId: state.portalConfiguration.enterpriseId,
  enableDemoData: state.portalConfiguration.enableDemoData,
});

export default connect(mapStateToProps)(PlotlyAnalyticsPage);
