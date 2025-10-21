# Confirmation Dialog for AI Shift Entry

## User Story
**As an** administrator,  
**I want** to review and edit the AI-parsed shift data before creating the shift,  
**So that** I can ensure the information is accurate and make any necessary adjustments.

## Acceptance Criteria
1. After successful parsing, a confirmation dialog should be displayed
2. The dialog should show all parsed fields with editable inputs
3. The dialog should display matching suggestions for locations with confidence scores
4. The dialog should display matching suggestions for departments with confidence scores (if applicable)
5. The dialog should display matching suggestions for assignees with confidence scores (if applicable)
6. The dialog should provide options to create new entities when no match is found
7. The dialog should allow editing of all fields (title, date, time, slots, etc.)
8. The dialog should validate inputs to ensure they are valid
9. The dialog should have confirm and cancel buttons
10. When confirmed, the dialog should call the shift creation service
11. After successful creation, the user should be redirected to the standard shift edit page

## Technical Considerations
- Create a new React component for the confirmation dialog
- Use Material UI's Dialog component for the modal
- Implement form validation for all editable fields
- Create UI components for displaying entity matches with confidence scores
- Implement handlers for creating new entities
- Connect the dialog to the tRPC mutation for creating shifts

## Dependencies
- Story #1: Feature Flag and Configuration for AI Shift Entry
- Story #3: Text Input Modal for AI Shift Entry
- Story #4: AI Text Parsing Service
- Story #5: Entity Matching Service

## Implementation Notes
- The dialog should be designed to handle both simple and complex shift data
- The UI should clearly indicate which fields are required
- Consider using color coding to indicate confidence levels for entity matches
- The dialog should be responsive and work well on different screen sizes
- Error handling should be implemented for the shift creation process