import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import dayjs from 'dayjs';
import classNames from 'classnames';
import {
  Card,
  Button,
  Col,
  Badge,
  Stack,
  Skeleton,
} from '@openedx/paragon';

import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import { BUDGET_STATUSES, ROUTE_NAMES } from '../EnterpriseApp/data/constants';
import {
  formatPrice, getBudgetStatus, getTranslatedBudgetStatus, getTranslatedBudgetTerm,
} from './data/utils';
import { useEnterpriseBudgets } from '../EnterpriseSubsidiesContext/data/hooks';

const BaseBackgroundFetchingWrapper = ({
  enterpriseId,
  isTopDownAssignmentEnabled,
  enablePortalLearnerCreditManagementScreen,
  children,
}) => {
  const { isFetching: isFetchingBudgets } = useEnterpriseBudgets({
    enablePortalLearnerCreditManagementScreen,
    enterpriseId,
    isTopDownAssignmentEnabled,
  });
  return <span style={{ opacity: isFetchingBudgets ? 0.5 : 1 }}>{children}</span>;
};

BaseBackgroundFetchingWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  enterpriseId: PropTypes.string.isRequired,
  isTopDownAssignmentEnabled: PropTypes.bool,
  enablePortalLearnerCreditManagementScreen: PropTypes.bool.isRequired,
};

BaseBackgroundFetchingWrapper.defaultProps = {
  isTopDownAssignmentEnabled: false,
};

const mapStateToProps = state => ({
  enterpriseId: state.portalConfiguration.enterpriseId,
  enablePortalLearnerCreditManagementScreen: state.portalConfiguration.enablePortalLearnerCreditManagementScreen,
  isTopDownAssignmentEnabled: state.portalConfiguration.isTopDownAssignmentEnabled,
  enterpriseFeatures: state.features,
});

const BackgroundFetchingWrapper = connect(mapStateToProps)(BaseBackgroundFetchingWrapper);

const BaseSubBudgetCard = ({
  id,
  start,
  end,
  available,
  pending,
  spent,
  displayName,
  enterpriseSlug,
  enterpriseId,
  isTopDownAssignmentEnabled,
  enablePortalLearnerCreditManagementScreen,
  isLoading,
  isAssignable,
  isRetired,
  retiredAt,
}) => {
  const { isFetching: isFetchingBudgets } = useEnterpriseBudgets({
    enablePortalLearnerCreditManagementScreen,
    enterpriseId,
    isTopDownAssignmentEnabled,
  });
  const intl = useIntl();
  const budgetLabel = getBudgetStatus({
    intl,
    startDateStr: start,
    endDateStr: end,
    isBudgetRetired: isRetired,
    retiredDateStr: retiredAt,
  });
  const formattedDate = budgetLabel?.date ? intl.formatDate(
    dayjs(budgetLabel?.date).toDate(),
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },
  ) : undefined;

  const hasBudgetAggregatesSection = () => {
    const { status } = budgetLabel;

    return (
      status === BUDGET_STATUSES.active
      || status === BUDGET_STATUSES.expiring
      || status === BUDGET_STATUSES.retired
    );
  };

  const renderActions = (budgetId) => (
    <Button
      data-testid="view-budget"
      as={Link}
      to={`/${enterpriseSlug}/admin/${ROUTE_NAMES.learnerCredit}/${budgetId}`}
      variant={[BUDGET_STATUSES.expired, BUDGET_STATUSES.retired].includes(budgetLabel.status) ? 'outline-primary' : 'primary'}
    >
      {isRetired ? (
        <FormattedMessage
          id="lcm.budgets.budget.card.view.budget.history"
          defaultMessage="View budget history"
          description="Button text to view budget history"
        />
      ) : (
        <FormattedMessage
          id="lcm.budgets.budget.card.view.budget"
          defaultMessage="View budget"
          description="Button text to view a budget"
        />
      )}
    </Button>
  );

  const renderCardHeader = (budgetType, budgetId) => {
    const subtitle = (
      <Stack direction="horizontal" gap={2.5}>
        <Badge variant={budgetLabel.badgeVariant}>{getTranslatedBudgetStatus(intl, budgetLabel.status)}</Badge>
        {(budgetLabel.term && formattedDate) && (
          <span data-testid="budget-date">
            {getTranslatedBudgetTerm(intl, budgetLabel.term)} {formattedDate}
          </span>
        )}
      </Stack>
    );

    const showActions = budgetLabel.status !== BUDGET_STATUSES.scheduled;

    return (
      <Card.Header
        title={<BackgroundFetchingWrapper>{budgetType}</BackgroundFetchingWrapper>}
        subtitle={<BackgroundFetchingWrapper>{subtitle}</BackgroundFetchingWrapper>}
        actions={showActions ? renderActions(budgetId) : undefined}
        className={classNames('align-items-center', { 'mb-4.5': !hasBudgetAggregatesSection() })}
      />
    );
  };

  const renderCardSection = () => {
    if (!hasBudgetAggregatesSection()) {
      return null;
    }

    return (
      <Card.Section
        title={!isRetired && (
          <h4>
            <FormattedMessage
              id="lcm.budgets.budget.card.balance"
              defaultMessage="Balance"
              description="Header for the balance section of the budget card"
            />
          </h4>
        )}
        muted
      >
        <Col className="d-flex justify-content-start w-md-75" data-testid="aggregates-section">
          {!isRetired && (
            <>
              <Col xs="6" md="auto" className="mb-3 mb-md-0 ml-n4.5">
                <div className="small font-weight-bold">
                  <FormattedMessage
                    id="lcm.budgets.budget.card.available"
                    defaultMessage="Available"
                    description="Label for the available balance on the budget card"
                  />
                </div>
                <span className="small">
                  {isFetchingBudgets ? <Skeleton /> : formatPrice(available)}
                </span>
              </Col>
              {isAssignable && (
                <Col xs="6" md="auto" className="mb-3 mb-md-0">
                  <div className="small font-weight-bold">
                    <FormattedMessage
                      id="lcm.budgets.budget.card.assigned"
                      defaultMessage="Assigned"
                      description="Label for the assigned balance on the budget card"
                    />
                  </div>
                  <span className="small">
                    {isFetchingBudgets ? <Skeleton /> : formatPrice(pending)}
                  </span>
                </Col>
              )}
            </>
          )}
          <Col xs="6" md="auto" className={classNames('mb-3 mb-md-0', { 'ml-n4.5': isRetired })}>
            <div className={classNames('font-weight-bold', { h4: isRetired, small: !isRetired })}>
              <FormattedMessage
                id="lcm.budgets.budget.card.spent"
                defaultMessage="Spent"
                description="Label for the spent balance on the budget card"
              />
            </div>
            <span className={classNames({ 'font-size-base': isRetired })}>
              {isFetchingBudgets ? <Skeleton /> : formatPrice(spent)}
            </span>
          </Col>
        </Col>
      </Card.Section>
    );
  };

  return (
    <Card
      orientation="horizontal"
      isLoading={isLoading}
      data-testid="balance-detail-section"
    >
      <Card.Body>
        <Stack gap={4.5}>
          {renderCardHeader(displayName || 'Overview', id)}
          {renderCardSection()}
        </Stack>
      </Card.Body>
    </Card>
  );
};

BaseSubBudgetCard.propTypes = {
  enterpriseSlug: PropTypes.string.isRequired,
  enterpriseId: PropTypes.string.isRequired,
  isTopDownAssignmentEnabled: PropTypes.bool,
  enablePortalLearnerCreditManagementScreen: PropTypes.bool.isRequired,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  start: PropTypes.string,
  end: PropTypes.string,
  spent: PropTypes.number,
  isLoading: PropTypes.bool,
  available: PropTypes.number,
  pending: PropTypes.number,
  displayName: PropTypes.string,
  isAssignable: PropTypes.bool,
  isRetired: PropTypes.bool,
  retiredAt: PropTypes.string,
};

BaseSubBudgetCard.defaultProps = {
  isTopDownAssignmentEnabled: false,
};

export default connect(mapStateToProps)(BaseSubBudgetCard);
