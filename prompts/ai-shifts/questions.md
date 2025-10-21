# AI-Powered Shift Entry Feature - Questions and Clarifications

This document outlines questions and points that need clarification before or during the implementation of the AI-Powered Shift Entry feature.

## Technical Questions

### 1. OpenAI API Integration

- **API Key Management**: How should we manage the OpenAI API key? Should it be stored in environment variables, a secrets manager, or another secure location?
For now, environment variable is fine.  You should fully disable this feature (no toggle) if no API key is present
- **Rate Limiting**: What rate limits should we implement to prevent excessive API usage? Should we have a daily/monthly quota per organization?
I think it should be rate per day, default of 500.  That should be editable in the Organization table.
- **Fallback Mechanism**: What should happen if the OpenAI API is unavailable or returns an error? Should we fall back to the standard form or provide a retry mechanism?
A popup in English with a sensible human-readable error message.  Differentiate between rate-limited and server error, but that's it.

### 2. AI Model Selection

- **Model Choice**: Should we use GPT-4 Turbo as specified in the spec, or would a more cost-effective model like GPT-3.5 Turbo be sufficient for this use case?
Let's start with a mini or nano model for now, but don't write any code that is hard-linked to an individual model
- **Structured Output Format**: Should we use the OpenAI function calling feature or the JSON mode for structured output?
JSON Mode would be better and more portable in the future, I think

### 3. Entity Matching

- **Confidence Thresholds**: What confidence threshold should we use for entity matching (locations, departments, members)? The spec suggests 0.6 for locations and departments, and 0.7 for members - are these appropriate?
That seems appropriate, sure.
- **Multiple Matches**: How should we handle cases where multiple entities have similar confidence scores? Should we present all options to the user or just the highest match?
Present all options to the user.

### 4. User Experience

- **Error Handling**: How should we present parsing errors to the user? Should we show specific error messages or generic ones?
There should be no parsing errors.  Either the model works or fails
- **Loading States**: What loading indicators should we show during API calls? Should we implement a timeout for long-running requests?
Typical MUI loading indicators.
- **Editing Experience**: After a shift is created, should the user be redirected to the standard edit form as specified, or should they stay on the calendar view?
Edit form

## Business Questions

### 1. Feature Access Control

- **User Permissions**: Should this feature be available to all users or only to administrators?
Admins only, since they're the only ones who can add/edit shifts
- **Organization Settings**: Should organizations be able to enable/disable this feature? Should there be a setting to control this?
Superadmin should be able to edit this at the organization level.  Eventually it will tie to org pricing tiers

### 2. AI Usage Tracking

- **Usage Metrics**: Should we track and display AI usage metrics to administrators? This could include number of requests, success rate, etc.
Yes, add a page on the superadmin panel that shows a summary of AI usage metrics by organization
- **Cost Allocation**: If there are costs associated with the OpenAI API usage, how should these be allocated or charged to organizations?
At this time, we should just keep track of spend by organization with a log.

### 3. Data Privacy

- **PII Handling**: How should we handle personally identifiable information (PII) that might be included in the free-form text? Should we implement any filtering or anonymization?
No, we should not anonymize or filter any data.  The model should be able to handle any data that might be included in the free-form text.
- **Data Retention**: Should we store the original free-form text input for audit purposes? If so, for how long?
Yes, in the log (mentioned above regarding cost).  For now, forever.

## Implementation Questions

### 1. Integration Points

- **Calendar Integration**: The spec mentions adding an AI toggle to the calendar page. Should this be a global toggle that persists across sessions, or should it reset when the user navigates away?
Reset on navigation for now.  
- **Mobile Support**: How should this feature work on mobile devices? Are there any specific considerations for the mobile UI?
No.

### 2. Testing Strategy

- **Test Data**: Should we create a specific set of test data for AI parsing tests? Should we maintain a corpus of example inputs and expected outputs?
Yes
- **Mock Responses**: For testing, should we create a set of standardized mock responses from the OpenAI API, or should we use more dynamic mocking?
Yes

### 3. Deployment Strategy

- **Feature Flag**: Should we implement this feature behind a feature flag for gradual rollout?
See above.  Flagged by organization
- **A/B Testing**: Should we conduct A/B testing to measure the effectiveness of the AI-powered entry compared to the standard form?
No

## Edge Cases

### 1. Time and Date Parsing

- **Ambiguous Times**: How should we handle ambiguous time formats (e.g., "5" could mean 5:00 AM or 5:00 PM)?
Encourage the LLM to guess intelligently.  Shifts won't be negative amounts of time or over 24 hours.  If start and end times have no identifiers like 9-5, you can assume the start is AM
- **Date Spans**: How should we handle shifts that span multiple days (e.g., "overnight shift from Monday 10pm to Tuesday 6am")?
They should not span multiple days.
- **Recurring Shifts**: Should the AI attempt to identify recurring patterns (e.g., "every Monday at 9am")?
No, we do not support recurring shifts at this time.

### 2. Location and Department Handling

- **New Entities**: The spec mentions creating new locations if needed. Should we also support creating new departments through this flow?
Yes
- **Similar Names**: How should we handle cases where locations or departments have very similar names?
Match the one that exists and/or offer all close options.

### 3. Assignment Handling

- **Partial Names**: How should we handle cases where only partial names are provided (e.g., "John" when there are multiple Johns in the system)?
Give multiple matches and let the user pick which is correct (or choose to add a new one)
- **Unknown Assignees**: How should we handle assignees that don't match any existing members? Should we suggest creating new members?
Suggest creating a new member, yes.  When you suggest creation, you let them fill in the entire new member info (at least first+last) in case the prompt was given partial info.

## Documentation Requirements

- **User Documentation**: What level of user documentation should be created for this feature? Should we include examples of effective prompts?
None yet.
- **Developer Documentation**: What additional developer documentation is needed beyond the spec and TDD documents?
Breakdown documents in numerical order of each story that needs to be built would be nice.

## Timeline and Priorities

- **MVP Features**: What are the minimum viable product (MVP) features for the initial release?
The text area, the matching modal (maybe saving as a draft).  We do not need Department mapping or Assignee mapping in the initial version.  So ti's ok if it's date, time, title, summary, location
- **Feature Prioritization**: If time constraints arise, which aspects of the feature should be prioritized?
Do not worry about time constraints.
- **Phased Rollout**: Should we consider a phased rollout approach, starting with basic functionality and adding more advanced features later?
Sure.