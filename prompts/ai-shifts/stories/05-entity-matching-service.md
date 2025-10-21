# Entity Matching Service

## User Story
**As a** developer,  
**I want** to create a service that matches extracted entities with existing database records,  
**So that** administrators can easily link AI-parsed shift data to existing locations, departments, and team members.

## Acceptance Criteria
1. The service should accept parsed data from the AI text parsing service
2. The service should match location names with existing locations in the database
3. The service should match department names with existing departments in the database
4. The service should match assignee names with existing team members in the database
5. The service should calculate confidence scores for each match based on string similarity
6. The service should provide all potential matches above a certain confidence threshold
7. The service should identify the best match for each entity
8. The service should suggest creating new entities when no good matches are found
9. The service should handle partial names by offering multiple potential matches
10. The service should return enhanced data with matched entities and suggestions

## Technical Considerations
- Create a new service class for entity matching
- Implement string similarity algorithms for fuzzy matching
- Define appropriate confidence thresholds for different entity types
- Optimize database queries to efficiently find potential matches
- Structure the response to include all matches with their confidence scores
- Ensure the service is testable with mock database responses

## Dependencies
- Story #1: Feature Flag and Configuration for AI Shift Entry
- Story #4: AI Text Parsing Service

## Implementation Notes
- The service should use Prisma ORM for database queries
- Consider implementing different matching strategies for different entity types
- The confidence threshold for "best match" should be configurable
- The service should be designed to handle edge cases like similar names
- Performance should be considered, especially for organizations with many entities