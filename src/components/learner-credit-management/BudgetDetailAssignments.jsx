import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Hyperlink } from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform/config';
import { useNavigate, useLocation } from 'react-router-dom';

import { FormattedMessage } from '@edx/frontend-platform/i18n';
import BudgetAssignmentsTable from './BudgetAssignmentsTable';
import AssignMoreCoursesEmptyStateMinimal from './AssignMoreCoursesEmptyStateMinimal';
import { useBudgetContentAssignments, useBudgetId, useSubsidyAccessPolicy } from './data';

const BudgetDetailAssignments = ({
  hasContentAssignments,
  hasSpentTransactions,
  enterpriseFeatures,
  enterpriseId,
}) => {
  const assignedHeadingRef = useRef();
  const { subsidyAccessPolicyId } = useBudgetId();
  const { data: subsidyAccessPolicy } = useSubsidyAccessPolicy(subsidyAccessPolicyId);
  const navigate = useNavigate();

  const location = useLocation();
  const { state: locationState } = location;
  const isAssignableBudget = !!subsidyAccessPolicy?.isAssignable;
  const assignmentConfigurationUUID = subsidyAccessPolicy?.assignmentConfiguration?.uuid;
  const isTopDownAssignmentEnabled = enterpriseFeatures.topDownAssignmentRealTimeLcm;
  const {
    isLoading,
    contentAssignments,
    fetchContentAssignments,
  } = useBudgetContentAssignments({
    isEnabled: isAssignableBudget && hasContentAssignments,
    assignmentConfigurationUUID,
    enterpriseId,
  });

  useEffect(() => {
    if (locationState?.budgetActivityScrollToKey === 'assigned') {
      assignedHeadingRef.current?.scrollIntoView({ behavior: 'smooth' });
      const newState = { ...locationState };
      delete newState.budgetActivityScrollToKey;
      navigate(location.pathname, { ...location, state: newState, replace: true });
    }
  }, [navigate, location, locationState]);

  if (!isTopDownAssignmentEnabled || !isAssignableBudget) {
    return null;
  }

  if (!hasContentAssignments && hasSpentTransactions) {
    return (
      <AssignMoreCoursesEmptyStateMinimal />
    );
  }

  return (
    <section className="budget-detail-assignments">
      <h3 className="mb-3" ref={assignedHeadingRef}>
        <FormattedMessage
          id="lcm.budget.detail.page.assignments.heading"
          defaultMessage="Assigned"
          description="Heading for the assigned section on the budget detail page"
        />
      </h3>
      <p className="small mb-4">
        <FormattedMessage
          id="lcm.budget.detail.page.assignments.description"
          defaultMessage="Assigned activity earmarks funds in your budget so you can not overspend.
           For funds to move from assigned to spent, your learners must complete enrollment. <a>Learn more</a>"
          description="Description for the assigned section on the budget detail page. Includes a link to learn more."
          values={{
            // eslint-disable-next-line react/no-unstable-nested-components
            a: (chunks) => (
              <Hyperlink
                destination={getConfig().ENTERPRISE_SUPPORT_LEARNER_CREDIT_URL}
                target="_blank"
              >
                {chunks}
              </Hyperlink>
            ),
          }}
        />
      </p>
      <BudgetAssignmentsTable
        isLoading={isLoading}
        tableData={contentAssignments}
        fetchTableData={fetchContentAssignments}
      />
    </section>
  );
};

const mapStateToProps = state => ({
  enterpriseId: state.portalConfiguration.enterpriseId,
  enterpriseFeatures: state.portalConfiguration.enterpriseFeatures,
});

BudgetDetailAssignments.propTypes = {
  enterpriseId: PropTypes.string.isRequired,
  hasContentAssignments: PropTypes.bool.isRequired,
  hasSpentTransactions: PropTypes.bool.isRequired,
  enterpriseFeatures: PropTypes.shape({
    topDownAssignmentRealTimeLcm: PropTypes.bool,
  }).isRequired,
};

export default connect(mapStateToProps)(BudgetDetailAssignments);
