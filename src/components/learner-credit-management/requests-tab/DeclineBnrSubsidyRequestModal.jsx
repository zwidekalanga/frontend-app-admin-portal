import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  ModalDialog, ActionRow, Button, Form, Alert, StatefulButton,
} from '@openedx/paragon';
import { Info } from '@openedx/paragon/icons';
import { logError } from '@edx/frontend-platform/logging';

const DeclineBnrSubsidyRequestModal = ({
  isOpen,
  subsidyRequest: {
    uuid,
  },
  enterpriseId,
  declineRequestFn,
  onSuccess,
  onClose,
}) => {
  const [shouldNotifyLearner, setShouldNotifyLearner] = useState(true);
  const [shouldUnlinkLearnerFromEnterprise, setShouldUnlinkLearnerFromEnterprise] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState();

  const buttonState = useMemo(() => {
    if (error) {
      return 'errored';
    }

    if (isLoading) {
      return 'pending';
    }

    return 'default';
  }, [error, isLoading]);

  const declineSubsidyRequest = useCallback(async () => {
    setError(undefined);
    setIsLoading(true);
    try {
      await declineRequestFn({
        enterpriseId,
        subsidyRequestUUID: uuid,
        sendNotification: shouldNotifyLearner,
        unlinkUsersFromEnterprise: shouldUnlinkLearnerFromEnterprise,
      });
      onSuccess();
    } catch (err) {
      logError(err);
      setError(err);
      setIsLoading(false);
    }
  }, [
    uuid,
    shouldNotifyLearner,
    shouldUnlinkLearnerFromEnterprise,
    declineRequestFn,
    onSuccess,
    enterpriseId,
  ]);

  return (
    <ModalDialog
      className="subsidy-request-modal"
      title="Decline Subsidy Request"
      isOpen={isOpen}
      hasCloseButton
      onClose={onClose}
      isOverflowVisible={false}
    >
      <ModalDialog.Header>
        <ModalDialog.Title>
          Are you sure?
        </ModalDialog.Title>
        {error && (
          <Alert
            icon={Info}
            variant="danger"
            data-testid="decline-subsidy-request-modal-alert"
          >
            <Alert.Heading>Something went wrong</Alert.Heading>
            Please try again.
          </Alert>
        )}
      </ModalDialog.Header>
      <ModalDialog.Body>
        <p>
          Declining an enrollment request cannot be undone. If you change your mind, the learner will have to
          submit a new enrollment request.
        </p>
        <Form.Checkbox
          className="py-3"
          data-testid="decline-bnr-subsidy-request-modal-notify-learner-checkbox"
          checked={shouldNotifyLearner}
          onChange={(e) => setShouldNotifyLearner(e.target.checked)}
        >
          Send the learner an email notification
        </Form.Checkbox>
        <Form.Checkbox
          className="mt-1"
          data-testid="decline-subsidy-request-modal-unlink-learner-checkbox"
          checked={shouldUnlinkLearnerFromEnterprise}
          onChange={(e) => setShouldUnlinkLearnerFromEnterprise(e.target.checked)}
          description="Your learner won't know they have been disassociated."
        >
          Disassociate the learner with your organization
        </Form.Checkbox>
      </ModalDialog.Body>
      <ModalDialog.Footer>
        <ActionRow>
          <Button variant="tertiary" onClick={onClose} data-testid="decline-subsidy-request-modal-close-btn">
            Close
          </Button>
          <StatefulButton
            state={buttonState}
            variant="primary"
            labels={{
              default: 'Decline',
              pending: 'Declining...',
              errored: 'Try again',
            }}
            onClick={declineSubsidyRequest}
            disabled={isLoading}
            data-testid="decline-subsidy-request-modal-decline-btn"
          />
        </ActionRow>
      </ModalDialog.Footer>
    </ModalDialog>
  );
};

DeclineBnrSubsidyRequestModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  subsidyRequest: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
  }).isRequired,
  enterpriseId: PropTypes.string.isRequired,
  declineRequestFn: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DeclineBnrSubsidyRequestModal;
