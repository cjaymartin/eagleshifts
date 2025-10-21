# Text Input Modal for AI Shift Entry

## User Story
**As an** administrator,  
**I want** to enter shift details in free-form text,  
**So that** I can quickly create shifts without filling out structured forms.

## Acceptance Criteria
1. When AI mode is enabled and a calendar date is clicked, a modal dialog should open
2. The modal should have a clear title indicating its purpose (e.g., "Enter Shift Details")
3. The modal should contain a multi-line text area for entering free-form text
4. The text area should have a clear placeholder text explaining the feature and providing an example
5. The modal should have submit and cancel buttons
6. The submit button should be disabled when the text area is empty
7. The modal should display a loading indicator during processing
8. The modal should display appropriate error messages if the processing fails
9. The modal should close and open the confirmation dialog when processing succeeds

## Technical Considerations
- Create a new React component for the text input modal
- Use Material UI's Dialog component for the modal
- Implement form validation to prevent submission of empty text
- Add loading state management during API calls
- Implement error handling with user-friendly error messages
- Connect the modal to the tRPC mutation for parsing shift text

## Dependencies
- Story #1: Feature Flag and Configuration for AI Shift Entry
- Story #2: AI Toggle Component for Shift Entry

## Implementation Notes
- The placeholder text should provide a clear example of the expected input format
- Error messages should be user-friendly and provide guidance on how to resolve the issue
- Consider adding a character limit to prevent excessively large inputs
- The loading indicator should be clear and provide feedback that the system is processing the input