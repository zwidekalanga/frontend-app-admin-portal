import { useState } from 'react';
import { logError } from '@edx/frontend-platform/logging';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useIntl } from '@edx/frontend-platform/i18n';
import { snakeCaseObject } from '@edx/frontend-platform/utils';
import {
  ActionRow, Button, FullscreenModal, StatefulButton, useToggle,
} from '@openedx/paragon';
import { sendEnterpriseTrackEvent } from '@edx/frontend-enterprise-utils';
import LmsApiService from '../../../data/services/LmsApiService';
import SystemErrorAlertModal
  from '../../learner-credit-management/cards/assignment-allocation-status-modals/SystemErrorAlertModal';
import AddMembersModalContent from './AddMembersModalContent';
import { peopleManagementQueryKeys } from '../constants';
import { useAllEnterpriseGroupLearners } from '../data/hooks';
import { useValidatedEmailsContext } from '../data/ValidatedEmailsContext';
import { checkForInviteErrors, GroupErrorType } from '../utils';
import EVENT_NAMES from '../../../eventTracking';

export type AddMembersModalProps = {
  isModalOpen: boolean,
  closeModal: () => void,
  enterpriseUUID: string,
  groupName: string,
  groupUuid: string,
  onInviteError: (errorType: GroupErrorType) => void
};

const AddMembersModal = ({
  isModalOpen,
  closeModal,
  enterpriseUUID,
  groupName,
  groupUuid,
  onInviteError,
}) => {
  const intl = useIntl();
  const { validatedEmails: learnerEmails, canInvite: canInviteMembers } = useValidatedEmailsContext();
  const [addButtonState, setAddButtonState] = useState('default');
  const [isSystemErrorModalOpen, openSystemErrorModal, closeSystemErrorModal] = useToggle(false);
  const handleCloseAddMembersModal = () => {
    closeModal();
    setAddButtonState('default');
  };
  const queryClient = useQueryClient();
  const {
    isLoading,
    data: enterpriseGroupLearners,
  } = useAllEnterpriseGroupLearners(groupUuid);

  const handleAddMembers = async () => {
    setAddButtonState('pending');
    try {
      const requestBody = snakeCaseObject({
        learnerEmails,
      });
      const { data: inviteResponse } = await LmsApiService.inviteEnterpriseLearnersToGroup(groupUuid, requestBody);
      const { hasErrors, errorType } = checkForInviteErrors(inviteResponse);
      if (hasErrors) {
        onInviteError(errorType);
        sendEnterpriseTrackEvent(
          enterpriseUUID,
          EVENT_NAMES.PEOPLE_MANAGEMENT.ADD_LEARNER_ERROR_NOT_IN_ORG,
        );
      }
      queryClient.invalidateQueries({
        queryKey: peopleManagementQueryKeys.learners(groupUuid),
      });
      setAddButtonState('complete');
      handleCloseAddMembersModal();
    } catch (err) {
      logError(err);
      setAddButtonState('error');
      openSystemErrorModal();
    }
  };

  return (
    <div>
      {!isLoading ? (
        <div>
          <FullscreenModal
            className="stepper-modal bg-light-200"
            isOpen={isModalOpen}
            onClose={handleCloseAddMembersModal}
            title={intl.formatMessage({
              id: 'peopleManagement.tab.add.members.modal.title',
              defaultMessage: 'Add members',
              description: 'Title for adding members modal',
            })}
            footerNode={(
              <ActionRow>
                <ActionRow.Spacer />
                <Button variant="tertiary" onClick={handleCloseAddMembersModal}>Cancel</Button>
                <StatefulButton
                  labels={{
                    default: 'Add',
                    pending: 'Adding...',
                    complete: 'Added',
                    error: 'Try again',
                  }}
                  variant="primary"
                  state={addButtonState}
                  disabled={!canInviteMembers}
                  onClick={handleAddMembers}
                />
              </ActionRow>
            )}
            isOverflowVisible={false}
          >
            <AddMembersModalContent
              groupName={groupName}
              enterpriseUUID={enterpriseUUID}
              enterpriseGroupLearners={enterpriseGroupLearners}
            />
          </FullscreenModal>
          <SystemErrorAlertModal
            isErrorModalOpen={isSystemErrorModalOpen}
            closeErrorModal={closeSystemErrorModal}
            closeAssignmentModal={handleCloseAddMembersModal}
            retry={handleAddMembers}
          />
        </div>
      ) : null}
    </div>
  );
};

AddMembersModal.propTypes = {
  enterpriseUUID: PropTypes.string.isRequired,
  isModalOpen: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired,
  onInviteError: PropTypes.func.isRequired,
  groupUuid: PropTypes.string.isRequired,
  groupName: PropTypes.string,
};

const mapStateToProps = state => ({
  enterpriseUUID: state.portalConfiguration.enterpriseId,
});

export default connect(mapStateToProps)(AddMembersModal);
