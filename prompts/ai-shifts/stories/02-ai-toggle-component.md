# AI Toggle Component for Shift Entry

## User Story
**As an** administrator,  
**I want** to be able to toggle AI shift entry mode on and off from the calendar page,  
**So that** I can choose between AI-assisted and traditional shift creation methods.

## Acceptance Criteria
1. A toggle switch labeled "AI Shift Entry" should be added to the calendar page
2. The toggle should only be visible to users with administrator role
3. The toggle should be disabled if the OpenAI API key is not configured
4. The toggle should be disabled if the user's organization has not enabled the AI feature
5. The toggle state should reset when the user navigates away from the calendar page
6. When enabled, clicking on a calendar date should open the AI shift entry modal instead of the standard shift form
7. The toggle should have a visual indicator showing its current state (enabled/disabled)

## Technical Considerations
- Create a new React component for the AI toggle switch
- Integrate the toggle with the calendar page layout
- Implement state management for the toggle (local state is sufficient as it resets on navigation)
- Add logic to check user role, API key configuration, and organization settings
- Modify the calendar's date click handler to open different modals based on the toggle state

## Dependencies
- Story #1: Feature Flag and Configuration for AI Shift Entry

## Implementation Notes
- This component is the entry point for users to access the AI shift entry feature
- The toggle should be positioned in a prominent but non-intrusive location on the calendar page
- Consider adding a tooltip or help text to explain the feature to new users