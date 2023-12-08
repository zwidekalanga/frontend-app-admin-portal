import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Hyperlink, ProgressBar, Row, Stack,
} from '@edx/paragon';
import { Add } from '@edx/paragon/icons';
import { generatePath, useRouteMatch, Link } from 'react-router-dom';
import { formatPrice } from './data';
import { configuration } from '../../config';

const BudgetDetail = ({ available, utilized, limit }) => {
  const currentProgressBarLimit = (available / limit) * 100;

  return (
    <Stack className="border border-light-400 p-4">
      <h4>Available</h4>
      <Stack direction="horizontal" gap={4} className="mt-1">
        <span className="display-1 text-dark" data-testid="budget-detail-available">{formatPrice(available)}</span>
        <span className="mt-auto small text-monospace" data-testid="budget-detail-utilized">
          Utilized {formatPrice(utilized)}
        </span>
      </Stack>
      <Stack gap={2} className="mt-3">
        <ProgressBar now={currentProgressBarLimit} variant="info" />
        <span className="ml-auto small text-monospace" data-testid="budget-detail-limit">
          {formatPrice(limit)} limit
        </span>
      </Stack>
    </Stack>
  );
};

BudgetDetail.propTypes = {
  available: PropTypes.number.isRequired,
  utilized: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
};

const BudgetActions = ({ budgetId, isAssignable }) => {
  const routeMatch = useRouteMatch();
  const supportUrl = configuration.ENTERPRISE_SUPPORT_URL;

  if (!isAssignable) {
    return (
      <div className="h-100 d-flex align-items-center p-4 py-lg-0">
        <div>
          <h4>Get people learning using this budget</h4>
          <p>
            Funds from this budget are set to autoallocate to registered learners based on
            settings configured with your support team.
          </p>
          <Button variant="outline-primary" as={Hyperlink} destination={supportUrl} target="_blank">
            Contact support
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center p-4">
      <div className="text-center">
        <h4>Get people learning using this budget</h4>
        <Button
          variant="brand"
          className="mt-3"
          iconBefore={Add}
          as={Link}
          to={{
            pathname: generatePath(routeMatch.path, { budgetId, activeTabKey: 'catalog' }),
            state: { budgetActivityScrollToKey: 'catalog' },
          }}
        >
          New course assignment
        </Button>
      </div>
    </div>
  );
};

BudgetActions.propTypes = {
  budgetId: PropTypes.string.isRequired,
  isAssignable: PropTypes.bool.isRequired,
};

const BudgetDetailPageOverviewAvailability = (
  {
    budgetId,
    isAssignable,
    budgetTotalSummary: { available, utilized, limit },
  },
) => (
  <Stack className="mt-4">
    <Row>
      <Col lg={7}>
        <BudgetDetail available={available} utilized={utilized} limit={limit} />
      </Col>
      <Col lg={5}>
        <BudgetActions
          budgetId={budgetId}
          isAssignable={isAssignable}
        />
      </Col>
    </Row>
  </Stack>
);

const budgetTotalSummaryShape = {
  utilized: PropTypes.number.isRequired,
  available: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
};

BudgetDetailPageOverviewAvailability.propTypes = {
  budgetId: PropTypes.string.isRequired,
  budgetTotalSummary: PropTypes.shape(budgetTotalSummaryShape).isRequired,
  isAssignable: PropTypes.bool.isRequired,
};

export default BudgetDetailPageOverviewAvailability;
