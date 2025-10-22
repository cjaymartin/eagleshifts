# AI-Powered Shift Entry Feature - Technical Deep Dive

This document provides a technical deep dive into the architecture and implementation approach for the AI-Powered Shift Entry feature. It outlines the technical components, data flows, and integration points necessary to implement the feature as described in the Product Specification.

> **Important Note**: All code examples in this document are pseudocode intended to illustrate concepts and approaches. They are not meant to be copied directly into the codebase and need not be followed exactly. Developers should adapt these examples to match the project's coding standards, TypeScript requirements, and existing patterns. The actual implementation may differ based on the team's technical decisions and the evolving needs of the project.

## Architecture Overview

The AI-Powered Shift Entry feature is built using a layered architecture:
1. **Frontend Components**: React components for user interaction
2. **API Layer**: tRPC endpoints for communication between frontend and backend
3. **Service Layer**: Business logic services for AI parsing, entity matching, and shift creation
4. **Data Layer**: Prisma ORM for database interactions

## Frontend Components Implementation

### 1. AIToggleSwitch Component

The AIToggleSwitch component is a simple toggle switch that enables or disables the AI shift entry mode. It's implemented as a controlled component that maintains its state and calls an onChange handler when toggled.

```typescript
// AIToggleSwitch.tsx
import React, { useState } from 'react';
import { FormControlLabel, Switch } from '@mui/material';

interface AIToggleSwitchProps {
  onChange?: (enabled: boolean) => void;
  initialState?: boolean;
}

const AIToggleSwitch: React.FC<AIToggleSwitchProps> = ({ 
  onChange, 
  initialState = false 
}) => {
  const [enabled, setEnabled] = useState(initialState);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newState = event.target.checked;
    setEnabled(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  return (
    <FormControlLabel
      control={<Switch checked={enabled} onChange={handleChange} />}
      label="AI Shift Entry"
    />
  );
};

export default AIToggleSwitch;
```

Key implementation details:
- Uses Material UI's Switch component
- Maintains internal state with useState
- Calls the onChange prop when the switch is toggled
- Provides a default state of disabled (false)

### 2. AIShiftEntryModal Component

The AIShiftEntryModal component is a dialog that allows users to enter free-form text describing a shift. It sends the text to the backend for AI processing and handles various states including loading and error states.

```typescript
// AIShiftEntryModal.tsx
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import { parseShiftText } from '@/queries/aiShifts';

interface AIShiftEntryModalProps {
  date: Date;
  open: boolean;
  onClose: () => void;
  onSubmit: (parsedData: any) => void;
}

const AIShiftEntryModal: React.FC<AIShiftEntryModalProps> = ({
  date,
  open,
  onClose,
  onSubmit
}) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Clear any previous errors when the user starts typing again
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call tRPC mutation to parse the text
      const result = await parseShiftText({ text, date });
      onSubmit(result);
    } catch (error: any) {
      // Display human-readable error message based on the error type
      if (error.message.includes('Daily AI usage limit')) {
        setError('Your organization has reached its daily AI usage limit. Please try again tomorrow or contact your administrator.');
      } else if (error.message.includes('API key is not configured')) {
        setError('AI feature is not available. Please contact your administrator to configure the OpenAI API key.');
      } else if (error.message.includes('Only administrators')) {
        setError('Only administrators can use the AI shift entry feature.');
      } else {
        setError('An error occurred while processing your request. Please try again later.');
      }
      console.error('AI Shift parsing error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Enter Shift Details</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          multiline
          rows={6}
          fullWidth
          value={text}
          onChange={handleTextChange}
          placeholder="Enter shift details in any format. For example: 'Morning shift at Downtown Office from 9am to 5pm with John and Sarah'"
          disabled={isLoading}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!text.trim() || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Processing...' : 'Parse Shift'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIShiftEntryModal;
```

Key implementation details:
- Uses Material UI's Dialog component for the modal
- Maintains text input state with useState
- Handles loading state during API calls
- Provides user-friendly error messages for different error scenarios
- Disables the submit button when the text is empty or during processing
- Shows a loading indicator during processing
- Calls the onSubmit prop with the parsed data when successful

### 3. AIShiftConfirmationDialog Component

The AIShiftConfirmationDialog component displays the AI-parsed shift data and allows users to confirm or modify it before creating the shift. It handles entity matching suggestions and provides options to create new entities when needed.

```typescript
// AIShiftConfirmationDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';

interface AIShiftConfirmationDialogProps {
  parsedData: any;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  onCreateLocation: (locationName: string) => void;
  onCreateDepartment?: (departmentName: string) => void;
  onCreateMember?: (memberName: string) => void;
}

const AIShiftConfirmationDialog: React.FC<AIShiftConfirmationDialogProps> = ({
  parsedData,
  open,
  onClose,
  onConfirm,
  onCreateLocation,
  onCreateDepartment,
  onCreateMember
}) => {
  const [data, setData] = useState(parsedData);

  // Handle changes to the data
  const handleChange = (field: string, value: any) => {
    setData({ ...data, [field]: value });
  };

  const handleConfirm = () => {
    onConfirm(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Confirm Shift Details</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          {/* Title */}
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Title"
              fullWidth
              value={data.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </Grid>

          {/* Location with all matching options */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>Location</Typography>
            {data.suggestedLocation?.allMatches?.length > 0 ? (
              <FormControl fullWidth>
                <InputLabel>Select Location</InputLabel>
                <Select
                  value={data.locationId || ''}
                  onChange={(e) => handleChange('locationId', e.target.value)}
                >
                  {data.suggestedLocation.allMatches.map((location: any) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} ({(location.confidence * 100).toFixed(0)}% match)
                    </MenuItem>
                  ))}
                  <MenuItem value="">
                    <em>None of these</em>
                  </MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography>No matching locations found</Typography>
            )}
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => onCreateLocation(data.suggestedLocation?.name || '')}
              sx={{ mt: 1 }}
            >
              Create New Location
            </Button>
          </Grid>

          {/* Department with all matching options */}
          {data.suggestedDepartment && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom>Department</Typography>
              {data.suggestedDepartment?.allMatches?.length > 0 ? (
                <FormControl fullWidth>
                  <InputLabel>Select Department</InputLabel>
                  <Select
                    value={data.departmentId || ''}
                    onChange={(e) => handleChange('departmentId', e.target.value)}
                  >
                    {data.suggestedDepartment.allMatches.map((department: any) => (
                      <MenuItem key={department.id} value={department.id}>
                        {department.name} ({(department.confidence * 100).toFixed(0)}% match)
                      </MenuItem>
                    ))}
                    <MenuItem value="">
                      <em>None of these</em>
                    </MenuItem>
                  </Select>
                </FormControl>
              ) : data.department ? (
                <Box>
                  <Typography>No matching departments found</Typography>
                  {onCreateDepartment && (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => onCreateDepartment(data.department || '')}
                      sx={{ mt: 1 }}
                    >
                      Create "{data.department}" Department
                    </Button>
                  )}
                </Box>
              ) : null}
            </Grid>
          )}

          {/* Date, Time, and Slots fields */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label="Date"
              value={data.date}
              onChange={(date) => handleChange('date', date)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TimePicker
              label="Start Time"
              value={data.startTime}
              onChange={(time) => handleChange('startTime', time)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TimePicker
              label="End Time"
              value={data.endTime}
              onChange={(time) => handleChange('endTime', time)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Slots"
              type="number"
              fullWidth
              value={data.slots}
              onChange={(e) => handleChange('slots', parseInt(e.target.value))}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>

          {/* Assignees with all matching options */}
          {data.assignees && data.assignees.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom>Assignees</Typography>
              {data.assignees.map((assignee: any, index: number) => (
                <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <Typography variant="body2">Original name: {assignee.name}</Typography>
                  {assignee.allMatches?.length > 0 ? (
                    <FormControl fullWidth sx={{ mt: 1 }}>
                      <InputLabel>Select Member</InputLabel>
                      <Select
                        value={assignee.memberId || ''}
                        onChange={(e) => {
                          const newAssignees = [...data.assignees];
                          newAssignees[index] = {
                            ...assignee,
                            memberId: e.target.value,
                            matchedName: assignee.allMatches.find((m: any) => m.id === e.target.value)?.name || ''
                          };
                          handleChange('assignees', newAssignees);
                        }}
                      >
                        {assignee.allMatches.map((member: any) => (
                          <MenuItem key={member.id} value={member.id}>
                            {member.name} ({(member.confidence * 100).toFixed(0)}% match)
                          </MenuItem>
                        ))}
                        <MenuItem value="">
                          <em>None of these</em>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <Typography>No matching members found</Typography>
                  )}
                  {assignee.suggestNewMember && onCreateMember && (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => onCreateMember(assignee.name)}
                      sx={{ mt: 1 }}
                    >
                      Create New Member
                    </Button>
                  )}
                </Box>
              ))}
            </Grid>
          )}

          {/* Notes */}
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={data.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
        >
          Create Shift
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIShiftConfirmationDialog;
```

Key implementation details:
- Uses Material UI's Dialog component for the confirmation dialog
- Maintains a local state copy of the parsed data that can be modified by the user
- Displays all matching options for locations, departments, and assignees with confidence scores
- Provides buttons to create new entities when no matches are found
- Uses DatePicker and TimePicker components for date and time fields
- Handles complex nested data structures for assignees
- Calls the onConfirm prop with the updated data when the user confirms

## Backend Services Implementation

### 1. AIShiftParserService

The AIShiftParserService is responsible for parsing free-form text into structured shift data using the OpenAI API. It handles the communication with the AI model and processes the response into a format that can be used by the application.

```typescript
// src/services/AIShiftParserService.ts
import { OpenAI } from 'openai';

export class AIShiftParserService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Parses free-form text into structured shift data
   * @param text The free-form text describing the shift
   * @param date The date of the shift (from calendar selection)
   * @returns Structured shift data
   * @throws Error if parsing fails or API key is not configured
   */
  async parseText(text: string, date: Date): Promise<any> {
    try {
      // Check if API key is available
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      // Call OpenAI API with structured output format
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5-nano', // Use a mini/nano model, configurable via env var
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that helps parse shift information from free-form text. 
            Extract the following information:
            - Shift title
            - Location name
            - Department name (if mentioned)
            - Start time
            - End time
            - Number of slots/positions
            - Assignees (names of people assigned to the shift)

            The date of the shift is: ${date.toISOString().split('T')[0]}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Lower temperature for more deterministic results
      });

      // Parse the JSON response
      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Process and validate the parsed data
      return this.processParseResult(result, date);
    } catch (error) {
      console.error('Error parsing shift text:', error);
      throw new Error('Failed to parse shift information');
    }
  }

  /**
   * Processes the raw AI response into a structured format
   * @param result The raw AI response
   * @param date The date of the shift
   * @returns Processed shift data
   */
  private processParseResult(result: any, date: Date): any {
    // Process and validate the parsed data
    // Convert time strings to Date objects
    // Set default values for missing fields

    const startTime = this.parseTimeString(result.startTime, date);
    const endTime = this.parseTimeString(result.endTime, date);

    return {
      title: result.title || 'Untitled Shift',
      location: result.location,
      department: result.department,
      date,
      startTime,
      endTime,
      slots: result.slots || 1,
      assignees: result.assignees || [],
    };
  }

  /**
   * Parses a time string into a Date object
   * @param timeString The time string (e.g., "9am", "5:30pm")
   * @param date The date to combine with the time
   * @returns A Date object representing the time, or null if parsing fails
   */
  private parseTimeString(timeString: string, date: Date): Date | null {
    if (!timeString) return null;

    try {
      // Parse time string in various formats (9am, 9:30am, 5pm, etc.)
      const timeRegex = /(\d+)(?::(\d+))?(?:\s*)?(am|pm)?/i;
      const match = timeString.match(timeRegex);

      if (!match) return null;

      let [_, hours, minutes, period] = match;
      let hoursNum = parseInt(hours);
      const minutesNum = minutes ? parseInt(minutes) : 0;

      // Handle 12-hour format
      const isPM = period && period.toLowerCase() === 'pm';
      if (isPM && hoursNum !== 12) hoursNum += 12;
      if (!isPM && hoursNum === 12) hoursNum = 0;

      // Create a new date object with the parsed time
      const result = new Date(date);
      result.setHours(hoursNum, minutesNum, 0, 0);

      return result;
    } catch (error) {
      console.error('Error parsing time string:', error);
      return null;
    }
  }
}
```

Key implementation details:
- Uses the OpenAI API with structured JSON output format
- Configurable model via environment variable (defaults to gpt-5-nano)
- Validates API key availability before making requests
- Provides detailed system prompt to guide the AI's parsing
- Handles various time formats (9am, 9:30am, 5pm, etc.)
- Sets default values for missing fields
- Handles errors gracefully with meaningful error messages

### 2. AIShiftMatchingService

The AIShiftMatchingService is responsible for matching the entities extracted by the AIShiftParserService with existing records in the database. It uses string similarity algorithms to find the best matches and provides confidence scores for each match.

```typescript
// src/services/AIShiftMatchingService.ts
import { PrismaClient } from '@prisma/client';

export class AIShiftMatchingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Matches parsed entities with existing records in the database
   * @param parsedData The data parsed by AIShiftParserService
   * @param organizationId The organization ID for context
   * @returns Enhanced data with matched entities and suggestions
   */
  async matchEntities(parsedData: any, organizationId: string): Promise<any> {
    // Match location
    const locationMatch = await this.matchLocation(parsedData.location, organizationId);

    // Match department
    const departmentMatch = await this.matchDepartment(parsedData.department, organizationId);

    // Match assignees
    const assigneeMatches = await this.matchAssignees(parsedData.assignees, organizationId);

    // Return enhanced data with matches and suggestions
    return {
      ...parsedData,
      locationId: locationMatch?.bestMatch?.id || null,
      suggestedLocation: locationMatch || { name: parsedData.location, confidence: 0 },
      departmentId: departmentMatch?.bestMatch?.id || null,
      suggestedDepartment: departmentMatch,
      assignees: assigneeMatches,
    };
  }

  /**
   * Matches a location name with existing locations
   * @param locationName The location name to match
   * @param organizationId The organization ID
   * @returns Matching information with confidence scores
   */
  private async matchLocation(locationName: string, organizationId: string): Promise<any> {
    if (!locationName) return null;

    // Find locations that match the name (case insensitive)
    const locations = await this.prisma.location.findMany({
      where: {
        organizationId,
        name: {
          contains: locationName,
          mode: 'insensitive',
        },
      },
    });

    if (locations.length === 0) return { name: locationName, confidence: 0 };

    // Calculate confidence score based on string similarity
    const matches = locations.map(location => ({
      ...location,
      confidence: this.calculateStringSimilarity(locationName, location.name),
    }));

    // Sort by confidence score (descending)
    matches.sort((a, b) => b.confidence - a.confidence);

    // Return all matches with their confidence scores
    return {
      bestMatch: matches[0].confidence > 0.6 ? matches[0] : null,
      allMatches: matches.filter(match => match.confidence > 0.4), // Include all reasonable matches
    };
  }

  /**
   * Matches a department name with existing departments
   * @param departmentName The department name to match
   * @param organizationId The organization ID
   * @returns Matching information with confidence scores
   */
  private async matchDepartment(departmentName: string, organizationId: string): Promise<any> {
    if (!departmentName) return null;

    // Find departments that match the name (case insensitive)
    const departments = await this.prisma.department.findMany({
      where: {
        organizationId,
        name: {
          contains: departmentName,
          mode: 'insensitive',
        },
      },
    });

    if (departments.length === 0) return null;

    // Calculate confidence score based on string similarity
    const matches = departments.map(department => ({
      ...department,
      confidence: this.calculateStringSimilarity(departmentName, department.name),
    }));

    // Sort by confidence score (descending)
    matches.sort((a, b) => b.confidence - a.confidence);

    // Return all matches with their confidence scores
    return {
      bestMatch: matches[0].confidence > 0.6 ? matches[0] : null,
      allMatches: matches.filter(match => match.confidence > 0.4), // Include all reasonable matches
    };
  }

  /**
   * Matches assignee names with existing team members
   * @param assigneeNames Array of assignee names to match
   * @param organizationId The organization ID
   * @returns Array of assignees with matching information
   */
  private async matchAssignees(assigneeNames: string[], organizationId: string): Promise<any[]> {
    if (!assigneeNames || assigneeNames.length === 0) return [];

    // Find all members in the organization
    const members = await this.prisma.member.findMany({
      where: {
        organizationId,
      },
      include: {
        user: true,
      },
    });

    // Match each assignee name to members
    return assigneeNames.map(name => {
      // Calculate similarity scores for all members
      const matches = members.map(member => ({
        ...member,
        confidence: this.calculateStringSimilarity(
          name.toLowerCase(),
          (member.name || member.user.name || '').toLowerCase()
        ),
      }));

      // Sort by confidence score (descending)
      matches.sort((a, b) => b.confidence - a.confidence);

      // Get the best match if confidence is above threshold
      const bestMatch = matches[0]?.confidence > 0.7 ? matches[0] : null;

      // Get all reasonable matches
      const allMatches = matches
        .filter(match => match.confidence > 0.4)
        .map(match => ({
          id: match.id,
          name: match.name || match.user.name,
          confidence: match.confidence
        }));

      // Return assignee with matching information
      return {
        name,
        memberId: bestMatch?.id || null,
        matchedName: bestMatch ? (bestMatch.name || bestMatch.user.name) : null,
        confidence: bestMatch?.confidence || 0,
        allMatches,
        suggestNewMember: !bestMatch
      };
    });
  }

  /**
   * Calculates string similarity between two strings
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score between 0 (no similarity) and 1 (exact match)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return 1;

    // Contains match
    if (s2.includes(s1) || s1.includes(s2)) {
      const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
      return 0.7 + (ratio * 0.3); // Between 0.7 and 1.0 based on length ratio
    }

    // Levenshtein distance for more complex comparisons
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLength);
  }

  /**
   * Calculates Levenshtein distance between two strings
   * @param str1 First string
   * @param str2 Second string
   * @returns The minimum number of single-character edits required to change str1 into str2
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create a matrix of size (m+1) x (n+1)
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize the matrix
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }

    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }
}
```

Key implementation details:
- Uses Prisma ORM for database queries
- Implements fuzzy matching for locations, departments, and team members
- Returns all potential matches with confidence scores, not just the best match
- Uses string similarity algorithms (contains matching and Levenshtein distance)
- Provides confidence thresholds for suggesting matches (0.6 for best match, 0.4 for all reasonable matches)
- Handles cases where no matches are found gracefully
- Suggests creating new entities when no good matches are found

#### 3. AIShiftCreationService

```typescript
describe('AIShiftCreationService', () => {
  let service: AIShiftCreationService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      organizationProfile: {
        findUnique: jest.fn(),
      },
      location: {
        create: jest.fn(),
      },
      shift: {
        create: jest.fn(),
      },
      shiftAssignment: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    // Create service with mock Prisma
    service = new AIShiftCreationService(mockPrisma);
  });

  describe('createShift', () => {
    it('should create a shift with existing location', async () => {
      const mockOrganizationId = 'org123';
      const mockData = {
        title: 'Morning Shift',
        locationId: 'loc1',
        departmentId: 'dept1',
        date: new Date('2023-01-01'),
        startTime: new Date('2023-01-01T09:00:00'),
        endTime: new Date('2023-01-01T17:00:00'),
        slots: 2,
        notes: 'Test notes',
        assignments: [
          { memberId: 'mem1', outcome: 'assigned' },
          { memberId: 'mem2', outcome: 'waiting' },
        ],
      };

      // Mock organization profile
      mockPrisma.organizationProfile.findUnique.mockResolvedValue({
        id: mockOrganizationId,
        timezone: 'America/New_York',
      } as any);

      // Mock shift creation
      const mockShift = { id: 'shift1', ...mockData };
      mockPrisma.shift.create.mockResolvedValue(mockShift as any);

      // Mock assignment creation
      mockPrisma.shiftAssignment.create.mockResolvedValue({} as any);

      const result = await service.createShift(mockData, mockOrganizationId);

      // Verify organization profile lookup
      expect(mockPrisma.organizationProfile.findUnique).toHaveBeenCalledWith({
        where: { id: mockOrganizationId },
      });

      // Verify shift creation
      expect(mockPrisma.shift.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrganizationId,
          title: mockData.title,
          locationId: mockData.locationId,
          departmentId: mockData.departmentId,
          slots: mockData.slots,
          notes: mockData.notes,
          timezone: 'America/New_York',
        }),
      });

      // Verify assignment creation
      expect(mockPrisma.shiftAssignment.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.shiftAssignment.create).toHaveBeenCalledWith({
        data: {
          shiftId: 'shift1',
          memberId: 'mem1',
          outcome: 'assigned',
        },
      });
      expect(mockPrisma.shiftAssignment.create).toHaveBeenCalledWith({
        data: {
          shiftId: 'shift1',
          memberId: 'mem2',
          outcome: 'waiting',
        },
      });

      // Verify result
      expect(result).toEqual(mockShift);
    });

    it('should create a new location if needed', async () => {
      const mockOrganizationId = 'org123';
      const mockData = {
        title: 'Morning Shift',
        locationId: null,
        newLocation: {
          name: 'New Office',
          address: '456 New St',
        },
        date: new Date('2023-01-01'),
        startTime: new Date('2023-01-01T09:00:00'),
        endTime: new Date('2023-01-01T17:00:00'),
        slots: 2,
      };

      // Mock organization profile
      mockPrisma.organizationProfile.findUnique.mockResolvedValue({
        id: mockOrganizationId,
        timezone: 'America/New_York',
      } as any);

      // Mock location creation
      const mockLocation = { id: 'newloc1', ...mockData.newLocation };
      mockPrisma.location.create.mockResolvedValue(mockLocation as any);

      // Mock shift creation
      const mockShift = { id: 'shift1', ...mockData, locationId: 'newloc1' };
      mockPrisma.shift.create.mockResolvedValue(mockShift as any);

      const result = await service.createShift(mockData, mockOrganizationId);

      // Verify location creation
      expect(mockPrisma.location.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrganizationId,
          name: mockData.newLocation.name,
          address: mockData.newLocation.address,
        },
      });

      // Verify shift creation with new location ID
      expect(mockPrisma.shift.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locationId: 'newloc1',
        }),
      });

      // Verify result
      expect(result).toEqual(mockShift);
    });

    it('should use default timezone if organization profile not found', async () => {
      const mockOrganizationId = 'org123';
      const mockData = {
        title: 'Morning Shift',
        locationId: 'loc1',
        date: new Date('2023-01-01'),
        startTime: new Date('2023-01-01T09:00:00'),
        endTime: new Date('2023-01-01T17:00:00'),
        slots: 2,
      };

      // Mock organization profile not found
      mockPrisma.organizationProfile.findUnique.mockResolvedValue(null);

      // Mock shift creation
      const mockShift = { id: 'shift1', ...mockData };
      mockPrisma.shift.create.mockResolvedValue(mockShift as any);

      await service.createShift(mockData, mockOrganizationId);

      // Verify default timezone is used
      expect(mockPrisma.shift.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timezone: 'America/New_York', // Default timezone
        }),
      });
    });
  });
});
```

## Integration Tests

### 1. Frontend Integration

```typescript
describe('AI Shift Entry Integration', () => {
  it('should integrate AIToggleSwitch with Calendar page', () => {
    const { getByRole, getByText } = render(<CalendarPage />);

    // Find and toggle the AI switch
    const switchElement = getByRole('checkbox', { name: /AI Shift Entry/i });
    fireEvent.click(switchElement);

    // Verify AI mode is enabled
    expect(switchElement).toBeChecked();

    // Click on a date in the calendar
    const dateElement = getByText('15'); // Assuming there's a date cell with text "15"
    fireEvent.click(dateElement);

    // Verify the AI entry modal is opened
    expect(getByText('Enter Shift Details')).toBeInTheDocument();
  });

  it('should flow from entry modal to confirmation dialog', async () => {
    // Mock the parseShiftText function
    const mockParsedData = {
      title: 'Morning Shift',
      locationId: null,
      suggestedLocation: { name: 'Downtown Office', confidence: 0 },
      date: new Date('2023-01-01'),
      startTime: new Date('2023-01-01T09:00:00'),
      endTime: new Date('2023-01-01T17:00:00'),
      slots: 2,
    };

    const parseShiftText = jest.fn().mockResolvedValue(mockParsedData);
    jest.mock('@/queries/aiShifts', () => ({
      parseShiftText: jest.fn().mockImplementation(() => parseShiftText),
    }));

    const { getByText, getByPlaceholderText } = render(<CalendarPage />);

    // Enable AI mode and open modal (setup)
    const switchElement = screen.getByRole('checkbox', { name: /AI Shift Entry/i });
    fireEvent.click(switchElement);
    const dateElement = screen.getByText('15');
    fireEvent.click(dateElement);

    // Enter text in the modal
    const textArea = getByPlaceholderText(/Enter shift details in any format/);
    fireEvent.change(textArea, { target: { value: 'Morning shift at Downtown Office from 9am to 5pm' } });

    // Submit the form
    const parseButton = getByText('Parse Shift');
    fireEvent.click(parseButton);

    // Wait for the confirmation dialog to appear
    await waitFor(() => {
      expect(getByText('Confirm Shift Details')).toBeInTheDocument();
      expect(getByText('Downtown Office')).toBeInTheDocument(); // Location suggestion
    });
  });
});
```

### 2. Backend Integration

```typescript
describe('AI Shifts tRPC Router Integration', () => {
  let appRouter: AppRouter;
  let caller: ReturnType<typeof createCaller>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Mock dependencies
    mockPrisma = {
      logEntry: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue({ aiDailyLimit: 500 }),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    const mockSession = {
      user: {
        id: 'user1',
        activeOrganizationId: 'org1',
        role: 'admin', // Default to admin role
      },
    };

    // Create router with mocked context
    appRouter = createTRPCRouter({
      aiShifts: aiShiftsRouter,
    });

    caller = createCaller({
      prisma: mockPrisma,
      session: mockSession,
    });

    // Mock service implementations
    jest.mock('@/services/AIShiftParserService', () => {
      return {
        AIShiftParserService: jest.fn().mockImplementation(() => ({
          parseText: jest.fn().mockResolvedValue({
            title: 'Morning Shift',
            location: 'Downtown Office',
            startTime: new Date('2023-01-01T09:00:00'),
            endTime: new Date('2023-01-01T17:00:00'),
            slots: 2,
          }),
        })),
      };
    });

    jest.mock('@/services/AIShiftMatchingService', () => {
      return {
        AIShiftMatchingService: jest.fn().mockImplementation(() => ({
          matchEntities: jest.fn().mockResolvedValue({
            title: 'Morning Shift',
            location: 'Downtown Office',
            locationId: 'loc1',
            suggestedLocation: { id: 'loc1', name: 'Downtown Office', confidence: 0.9 },
            startTime: new Date('2023-01-01T09:00:00'),
            endTime: new Date('2023-01-01T17:00:00'),
            slots: 2,
          }),
        })),
      };
    });

    jest.mock('@/services/AIShiftCreationService', () => {
      return {
        AIShiftCreationService: jest.fn().mockImplementation(() => ({
          createShift: jest.fn().mockResolvedValue({
            id: 'shift1',
            title: 'Morning Shift',
            locationId: 'loc1',
            startTime: new Date('2023-01-01T09:00:00'),
            endTime: new Date('2023-01-01T17:00:00'),
            slots: 2,
          }),
        })),
      };
    });
  });

  it('should check for admin-only access', async () => {
    // Create a non-admin caller
    const nonAdminCaller = createCaller({
      prisma: mockPrisma,
      session: {
        user: {
          id: 'user2',
          activeOrganizationId: 'org1',
          role: 'member', // Non-admin role
        },
      },
    });

    // Expect the call to throw an error for non-admin users
    await expect(nonAdminCaller.aiShifts.parseShiftText({
      text: 'Morning shift at Downtown Office',
      date: new Date('2023-01-01'),
    })).rejects.toThrow('Only administrators can use the AI shift entry feature');
  });

  it('should enforce rate limits', async () => {
    // Mock that the organization has reached its daily limit
    mockPrisma.logEntry.count.mockResolvedValueOnce(500);

    // Expect the call to throw a rate limit error
    await expect(caller.aiShifts.parseShiftText({
      text: 'Morning shift at Downtown Office',
      date: new Date('2023-01-01'),
    })).rejects.toThrow('Daily AI usage limit reached for your organization');

    // Verify the count was called with the correct parameters
    expect(mockPrisma.logEntry.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: 'org1',
        actionType: 'AI_SHIFT_PARSE',
        timestamp: expect.anything(),
      }),
    });
  });

  it('should respect organization-specific rate limits', async () => {
    // Mock an organization with a custom rate limit
    mockPrisma.organization.findUnique.mockResolvedValueOnce({ aiDailyLimit: 100 });

    // Mock that the organization has reached its custom daily limit
    mockPrisma.logEntry.count.mockResolvedValueOnce(100);

    // Expect the call to throw a rate limit error
    await expect(caller.aiShifts.parseShiftText({
      text: 'Morning shift at Downtown Office',
      date: new Date('2023-01-01'),
    })).rejects.toThrow('Daily AI usage limit reached for your organization');
  });

  it('should log API usage', async () => {
    // Mock successful API call
    await caller.aiShifts.parseShiftText({
      text: 'Morning shift at Downtown Office from 9am to 5pm',
      date: new Date('2023-01-01'),
    });

    // Verify that usage was logged
    expect(mockPrisma.logEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org1',
        actionType: 'AI_SHIFT_PARSE',
        userId: 'user1',
      }),
    });
  });

  it('should parse shift text and return matched entities', async () => {
    const result = await caller.aiShifts.parseShiftText({
      text: 'Morning shift at Downtown Office from 9am to 5pm',
      date: new Date('2023-01-01'),
    });

    expect(result).toEqual(expect.objectContaining({
      title: 'Morning Shift',
      locationId: 'loc1',
      suggestedLocation: expect.objectContaining({
        id: 'loc1',
        name: 'Downtown Office',
      }),
    }));
  });

  it('should create a shift from AI parsed data', async () => {
    const result = await caller.aiShifts.createShiftFromAI({
      title: 'Morning Shift',
      locationId: 'loc1',
      date: new Date('2023-01-01'),
      startTime: new Date('2023-01-01T09:00:00'),
      endTime: new Date('2023-01-01T17:00:00'),
      slots: 2,
    });

    expect(result).toEqual(expect.objectContaining({
      id: 'shift1',
      title: 'Morning Shift',
      locationId: 'loc1',
    }));
  });
});
```

## End-to-End Tests

```typescript
describe('AI Shift Entry E2E', () => {
  beforeAll(async () => {
    // Setup test database with sample data
    // ...
  });

  afterAll(async () => {
    // Cleanup test database
    // ...
  });

  it('should create a shift using AI entry flow', async () => {
    // Navigate to calendar page
    await page.goto('/calendar');

    // Enable AI mode
    await page.click('label:has-text("AI Shift Entry")');

    // Click on a date
    await page.click('text=15');

    // Enter shift details
    await page.fill('textarea', 'Morning shift at Downtown Office from 9am to 5pm with John and Sarah');

    // Click parse button
    await page.click('button:has-text("Parse Shift")');

    // Wait for confirmation dialog
    await page.waitForSelector('h2:has-text("Confirm Shift Details")');

    // Verify parsed data
    expect(await page.inputValue('input[name="title"]')).toBe('Morning shift');
    expect(await page.textContent('text=Downtown Office')).toBeTruthy();

    // Confirm shift creation
    await page.click('button:has-text("Create Shift")');

    // Verify redirect to shift edit page
    await page.waitForURL(/\/shifts\/[^/]+\/edit/);

    // Verify shift was created with correct data
    expect(await page.inputValue('input[name="title"]')).toBe('Morning shift');
    expect(await page.textContent('text=Downtown Office')).toBeTruthy();

    // Verify time fields
    expect(await page.inputValue('input[name="startTime"]')).toContain('9:00');
    expect(await page.inputValue('input[name="endTime"]')).toContain('5:00');

    // Verify assignees
    expect(await page.textContent('text=John')).toBeTruthy();
    expect(await page.textContent('text=Sarah')).toBeTruthy();
  });

  it('should handle creating new location during AI flow', async () => {
    // Navigate to calendar page
    await page.goto('/calendar');

    // Enable AI mode
    await page.click('label:has-text("AI Shift Entry")');

    // Click on a date
    await page.click('text=16');

    // Enter shift details with new location
    await page.fill('textarea', 'Afternoon shift at New Office from 1pm to 9pm');

    // Click parse button
    await page.click('button:has-text("Parse Shift")');

    // Wait for confirmation dialog
    await page.waitForSelector('h2:has-text("Confirm Shift Details")');

    // Verify location not found
    expect(await page.textContent('text=New Office')).toBeTruthy();
    expect(await page.textContent('text=No matching location found')).toBeTruthy();

    // Click create new location
    await page.click('button:has-text("Create New")');

    // Fill location form
    await page.fill('input[name="name"]', 'New Office');
    await page.fill('input[name="address"]', '123 New Street');

    // Save location
    await page.click('button:has-text("Save Location")');

    // Confirm shift creation
    await page.click('button:has-text("Create Shift")');

    // Verify redirect to shift edit page
    await page.waitForURL(/\/shifts\/[^/]+\/edit/);

    // Verify new location was created and used
    expect(await page.textContent('text=New Office')).toBeTruthy();
  });
});
```

## MVP Test Scope

For the initial release, testing should focus on the core MVP features as defined in the requirements:

1. **Text Area for Free-form Input**:
   - Test that users can enter text in any format
   - Test handling of various input patterns
   - Test error handling for empty or invalid inputs

2. **Matching Modal with Suggestions**:
   - Test that location suggestions are displayed correctly
   - Test that users can select from multiple location matches
   - Test creation of new locations when no match is found

3. **Basic Fields Parsing**:
   - Test parsing of date information
   - Test parsing of time information
   - Test parsing of title information
   - Test parsing of summary/notes information
   - Test parsing of location information

Department mapping and assignee mapping tests should be considered lower priority for the initial release, as these features will be added in future iterations.

## Test Coverage Goals

The test suite should aim for the following coverage metrics:

1. **Unit Tests**: 90% coverage of all components and services
2. **Integration Tests**: 80% coverage of component interactions and API endpoints
3. **End-to-End Tests**: Cover all critical user flows

## Test Data Requirements

To effectively test the AI shift entry feature, the following test data is needed:

1. **Sample Organizations**: At least one organization with timezone settings
2. **Sample Locations**: Multiple locations with different names and addresses
3. **Sample Departments**: Multiple departments with different names
4. **Sample Members**: Multiple members with different names
5. **Sample Shifts**: Existing shifts with various properties

## Test Environment Setup

The test environment should include:

1. **Mock OpenAI API**: To avoid actual API calls during testing
2. **Test Database**: Isolated from production data
3. **Browser Environment**: For end-to-end tests (using Playwright or similar)

## Continuous Integration

Tests should be integrated into the CI/CD pipeline to ensure:

1. All tests pass before merging code
2. Test coverage meets the defined goals
3. Performance benchmarks are maintained

## Conclusion

This test-driven development approach ensures that the AI-Powered Shift Entry feature is thoroughly tested at all levels. By writing tests before or alongside the implementation, we can ensure that the feature meets all requirements and maintains high quality.
