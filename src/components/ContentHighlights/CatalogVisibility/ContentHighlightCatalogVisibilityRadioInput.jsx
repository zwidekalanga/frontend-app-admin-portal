import {
  Form, Container, Spinner,
} from '@openedx/paragon';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import { useState, useContext, useEffect } from 'react';
import { ActionRowSpacer } from '@openedx/paragon/dist/ActionRow';
import { logError } from '@edx/frontend-platform/logging';
import { sendEnterpriseTrackEvent } from '@edx/frontend-enterprise-utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { LEARNER_PORTAL_CATALOG_VISIBILITY } from '../data/constants';
import { EnterpriseAppContext } from '../../EnterpriseApp/EnterpriseAppContextProvider';
import { enterpriseCurationActions } from '../../EnterpriseApp/data/enterpriseCurationReducer';
import EVENT_NAMES from '../../../eventTracking';
import { useContentHighlightsContext } from '../data/hooks';

const ContentHighlightCatalogVisibilityRadioInput = () => {
  const { setCatalogVisibilityAlert } = useContentHighlightsContext();
  const {
    enterpriseCuration: {
      enterpriseCuration,
      updateEnterpriseCuration,
      dispatch,
    },
  } = useContext(EnterpriseAppContext);
  const { highlightSets, canOnlyViewHighlightSets } = enterpriseCuration;
  const [radioGroupVisibility, setRadioGroupVisibility] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [isEntireCatalogSelectionLoading, setIsEntireCatalogSelectionLoading] = useState(false);
  const [isHighlightsCatalogSelectionLoading, setIsHighlightsCatalogSelectionLoading] = useState(false);
  const intl = useIntl();

  /**
   * Sets enterpriseCuration.canOnlyViewHighlightSets to false if there are no highlight sets
   * when the user enters content highlights dashboard.
   */
  useEffect(() => {
    if (highlightSets.length < 1 && canOnlyViewHighlightSets) {
      const setDefault = async () => {
        try {
          await updateEnterpriseCuration({
            canOnlyViewHighlightSets: false,
          });
        } catch (error) {
          logError(`${error}: Error updating enterprise curation setting with no highlight sets,
           ContentHighlightCatalogVsibiilityRadioInput`);
        }
      };
      setDefault();
    }
  }, [canOnlyViewHighlightSets, highlightSets.length, updateEnterpriseCuration]);
  // Sets default radio button based on number of highlight sets && catalog visibility setting
  const catalogVisibilityValue = !canOnlyViewHighlightSets || highlightSets.length < 1
    ? LEARNER_PORTAL_CATALOG_VISIBILITY.ALL_CONTENT.value
    : LEARNER_PORTAL_CATALOG_VISIBILITY.HIGHLIGHTED_CONTENT.value;
  const [value, setValue] = useState(catalogVisibilityValue);

  const handleChange = async (e) => {
    const newTabValue = e.target.value;
    try {
      // Show loading spinner
      if (newTabValue === LEARNER_PORTAL_CATALOG_VISIBILITY.ALL_CONTENT.value) {
        setIsEntireCatalogSelectionLoading(true);
        setIsHighlightsCatalogSelectionLoading(false);
      }
      if (newTabValue === LEARNER_PORTAL_CATALOG_VISIBILITY.HIGHLIGHTED_CONTENT.value) {
        setIsHighlightsCatalogSelectionLoading(true);
        setIsEntireCatalogSelectionLoading(false);
      }
      const data = await updateEnterpriseCuration({
        canOnlyViewHighlightSets: LEARNER_PORTAL_CATALOG_VISIBILITY[newTabValue].canOnlyViewHighlightSets,
      });
      // Send Track Event
      const trackInfo = {
        can_only_view_highlight_sets: LEARNER_PORTAL_CATALOG_VISIBILITY[newTabValue].canOnlyViewHighlightSets,
      };
      sendEnterpriseTrackEvent(
        enterpriseCuration.enterpriseCustomer,
        EVENT_NAMES.CONTENT_HIGHLIGHTS.HIGHLIGHT_DASHBOARD_SET_CATALOG_VISIBILITY,
        trackInfo,
      );
      // Set toast and closes alert if open
      if (data) {
        setCatalogVisibilityAlert({
          isOpen: false,
        });
        setValue(newTabValue);
        dispatch(
          enterpriseCurationActions.setHighlightToast(
            intl.formatMessage({
              id: 'highlights.catalog.visibility.tab.visibility.updated.toast.message',
              defaultMessage: 'Catalog visibility settings updated.',
              description: 'Toast message shown to admin when catalog visibility settings are updated.',
            }),
          ),
        );
        navigate(location.pathname, {
          state: { highlightToast: true },
        });
      }
    } catch (error) {
      logError(error);
      setCatalogVisibilityAlert({
        isOpen: true,
      });
    } finally {
      // Hide loading spinner
      setIsEntireCatalogSelectionLoading(false);
      setIsHighlightsCatalogSelectionLoading(false);
    }
  };
  useEffect(() => {
    if (highlightSets.length > 0) {
      setRadioGroupVisibility(false);
    }
  }, [highlightSets]);

  return (
    <Container>
      <Form.Group>
        <Form.RadioSet
          name="display-content"
          onChange={handleChange}
          value={value}
        >
          <div className="d-flex align-items-center position-relative">
            {isEntireCatalogSelectionLoading && (
            <Spinner
              className="position-absolute"
              data-testid={`${LEARNER_PORTAL_CATALOG_VISIBILITY.ALL_CONTENT.value}-form-control`}
              size="sm"
              style={{
                left: -24,
              }}
              animation="border"
              screenReaderText="loading changes to view all content"
            />
            )}
            <ActionRowSpacer />
            <Form.Radio
              value={LEARNER_PORTAL_CATALOG_VISIBILITY.ALL_CONTENT.value}
              type="radio"
              disabled={radioGroupVisibility || isEntireCatalogSelectionLoading || isHighlightsCatalogSelectionLoading}
              data-testid={`${LEARNER_PORTAL_CATALOG_VISIBILITY.ALL_CONTENT.value}-form-control-button`}
            >
              <FormattedMessage
                id="highlights.catalog.visibility.tab.visibility.option.all.courses.in.catalog"
                defaultMessage="Learners can view and enroll into all courses in your catalog"
                description="Option to allow learners to view and enroll into all courses in your catalog"
              />
            </Form.Radio>
          </div>
          <div className="d-flex align-items-center position-relative">
            {isHighlightsCatalogSelectionLoading && (
            <Spinner
              className="position-absolute"
              data-testid={`${LEARNER_PORTAL_CATALOG_VISIBILITY.HIGHLIGHTED_CONTENT.value}-form-control`}
              size="sm"
              style={
                {
                  left: -24,
                }
            }
              animation="border"
              screenReaderText="loading changes to view highlighted content only"
            />
            )}
            <ActionRowSpacer />
            <Form.Radio
              value={LEARNER_PORTAL_CATALOG_VISIBILITY.HIGHLIGHTED_CONTENT.value}
              type="radio"
              disabled={radioGroupVisibility || isEntireCatalogSelectionLoading || isHighlightsCatalogSelectionLoading}
              data-testid={`${LEARNER_PORTAL_CATALOG_VISIBILITY.HIGHLIGHTED_CONTENT.value}-form-control-button`}
            >
              <FormattedMessage
                id="highlights.catalog.visibility.tab.visibility.option.highlighted.courses.only"
                defaultMessage="Learners can only view and enroll into highlighted courses"
                description="Option to allow learners to view and enroll into highlighted courses only"
              />
            </Form.Radio>
          </div>
        </Form.RadioSet>
      </Form.Group>
    </Container>
  );
};

export default ContentHighlightCatalogVisibilityRadioInput;
