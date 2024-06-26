import {
  Icon, Col, Stack,
} from '@openedx/paragon';
import { Info } from '@openedx/paragon/icons';
import PropTypes from 'prop-types';

const LearnerCreditDisclaimer = ({ offerLastUpdated }) => (
  <Stack direction="horizontal" className="mb-4">
    <Icon src={Info} className="align-self-start" />
    <Col className="col-8 pl-2">
      Data last updated on {offerLastUpdated}. This data reflects
      the current active learner credit only and does not include
      other spend by your organization (codes, manual enrollments, past learner credit plans).
    </Col>
  </Stack>
);

LearnerCreditDisclaimer.propTypes = {
  offerLastUpdated: PropTypes.string.isRequired,
};

export default LearnerCreditDisclaimer;
