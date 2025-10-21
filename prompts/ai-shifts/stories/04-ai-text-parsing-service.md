# AI Text Parsing Service

## User Story
**As a** developer,  
**I want** to create a service that parses free-form text into structured shift data using the OpenAI API,  
**So that** administrators can create shifts using natural language input.

## Acceptance Criteria
1. The service should accept free-form text input and a date parameter
2. The service should validate that the OpenAI API key is configured
3. The service should call the OpenAI API with appropriate parameters
4. The service should use JSON mode for structured output
5. The service should parse the API response into a structured format
6. The service should handle various time formats (9am, 9:00, 9PM, etc.)
7. The service should make intelligent assumptions for ambiguous times
8. The service should extract the following information from the text:
   - Shift title
   - Location name
   - Department name (if mentioned)
   - Start time
   - End time
   - Number of slots/positions
   - Assignees (names of people assigned to the shift)
9. The service should set default values for missing fields
10. The service should handle errors gracefully with meaningful error messages

## Technical Considerations
- Create a new service class for AI text parsing
- Integrate with the OpenAI API using the official client library
- Configure the model via environment variables (default to a mini/nano model)
- Implement robust error handling for API failures
- Create utility functions for time parsing and validation
- Ensure the service is testable with mock responses

## Dependencies
- Story #1: Feature Flag and Configuration for AI Shift Entry

## Implementation Notes
- The service should be designed to be reusable across different parts of the application
- The OpenAI model should be configurable via environment variables
- Consider implementing caching to reduce API calls for similar inputs
- The service should be thoroughly tested with various input formats
- The system prompt should provide clear instructions to the AI model