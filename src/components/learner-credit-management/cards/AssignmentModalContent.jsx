import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import {
  Container,
  Stack,
  Row,
  Col,
  Form,
  Card,
} from '@edx/paragon';

import BaseCourseCard from './BaseCourseCard';
import { formatPrice, useBudgetId, useSubsidyAccessPolicy } from '../data';
import { ImpactOnYourLearnerCreditBudget, ManagingThisAssignment, NextStepsForAssignedLearners } from './Collapsibles';
import AssignmentModalSummary from './AssignmentModalSummary';
import { EMAIL_ADDRESSES_INPUT_VALUE_DEBOUNCE_DELAY } from './data';

const AssignmentModalContent = ({ course, onEmailAddressesChange }) => {
  const { subsidyAccessPolicyId } = useBudgetId();
  const { data: subsidyAccessPolicy } = useSubsidyAccessPolicy(subsidyAccessPolicyId);

  const [learnerEmails, setLearnerEmails] = useState([]);
  const [emailAddressesInputValue, setEmailAddressesInputValue] = useState('');

  const handleEmailAddressInputChange = (e) => {
    const inputValue = e.target.value;
    setEmailAddressesInputValue(inputValue);
  };

  const handleEmailAddressesChanged = useCallback((value) => {
    if (!value) {
      setLearnerEmails([]);
      onEmailAddressesChange([]);
    }
    const emails = value.split('\n').filter((email) => email.trim().length > 0);
    setLearnerEmails(emails);
    onEmailAddressesChange(emails);
  }, [onEmailAddressesChange]);

  const debouncedHandleEmailAddressesChanged = useMemo(
    () => debounce(handleEmailAddressesChanged, EMAIL_ADDRESSES_INPUT_VALUE_DEBOUNCE_DELAY),
    [handleEmailAddressesChanged],
  );

  useEffect(() => {
    debouncedHandleEmailAddressesChanged(emailAddressesInputValue);
  }, [emailAddressesInputValue, debouncedHandleEmailAddressesChanged]);

  const hasLearnerEmails = learnerEmails.length > 0;
  const spendAvailable = subsidyAccessPolicy.aggregates.spendAvailableUsd;
  const costToAssignLearners = learnerEmails.length * course.normalizedMetadata.contentPrice;
  const remainingBalanceAfterAssignment = spendAvailable - costToAssignLearners;

  return (
    <Container size="lg" className="py-3">
      <Stack gap={5}>
        <Row>
          <Col>
            <h3 className="mb-4">Use Learner Credit to assign this course</h3>
            <BaseCourseCard original={course} cardClassName="shadow-none" />
          </Col>
        </Row>
        <Row>
          <Col xs={12} lg={5} className="mb-5 mb-lg-0">
            <h4 className="mb-4">Assign to</h4>
            <Form.Group className="mb-5">
              <Form.Control
                as="textarea"
                value={emailAddressesInputValue}
                onChange={handleEmailAddressInputChange}
                floatingLabel="Learner email addresses"
                rows={10}
                data-hj-suppress
              />
              <Form.Control.Feedback>
                To add more than one learner, enter one email address per line.
              </Form.Control.Feedback>
            </Form.Group>
            <h5 className="mb-3">How assigning this course works</h5>
            <Stack gap={1}>
              <NextStepsForAssignedLearners course={course} />
              <ImpactOnYourLearnerCreditBudget />
              <ManagingThisAssignment />
            </Stack>
          </Col>
          <Col xs={12} lg={{ span: 5, offset: 2 }}>
            <h4 className="mb-4">Pay by Learner Credit</h4>
            <AssignmentModalSummary
              course={course}
              learnerEmails={learnerEmails}
            />
            <hr className="my-4" />
            <h5 className="mb-4">
              Learner Credit Budget: {subsidyAccessPolicy.displayName ?? 'Overview'}
            </h5>
            <Stack gap={2.5}>
              <Card className="rounded-0 shadow-none">
                <Card.Section className="py-2 small">
                  <Stack gap={2.5}>
                    <Stack direction="horizontal" className="justify-content-between">
                      <div>Available balance</div>
                      <div>{formatPrice(spendAvailable)}</div>
                    </Stack>
                    {hasLearnerEmails && (
                      <Stack direction="horizontal" className="justify-content-between">
                        <div>Total cost</div>
                        <div>-{formatPrice(costToAssignLearners)}</div>
                      </Stack>
                    )}
                  </Stack>
                </Card.Section>
              </Card>
              {hasLearnerEmails && (
                <Card className="rounded-0 shadow-none">
                  <Card.Section className="d-flex justify-content-between py-2">
                    <div>Remaining after assignment</div>
                    <div>{formatPrice(remainingBalanceAfterAssignment)}</div>
                  </Card.Section>
                </Card>
              )}
            </Stack>
          </Col>
        </Row>
      </Stack>
    </Container>
  );
};

AssignmentModalContent.propTypes = {
  course: PropTypes.shape().isRequired, // Pass-thru prop to `BaseCourseCard`
  onEmailAddressesChange: PropTypes.func.isRequired,
};

export default AssignmentModalContent;