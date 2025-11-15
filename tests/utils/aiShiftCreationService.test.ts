import { createShiftFromAI } from '@/utils/aiShiftCreationService';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
const mockPrisma = {
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  location: {
    create: jest.fn(),
  },
  department: {
    create: jest.fn(),
  },
  shift: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  member: {
    findMany: jest.fn(),
  },
  shiftAssignment: {
    create: jest.fn(),
  },
};

describe('aiShiftCreationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate required fields', async () => {
    // Test missing title
    await expect(
      createShiftFromAI(
        {
          title: '',
          startTime: '2023-01-01T09:00:00Z',
          endTime: '2023-01-01T17:00:00Z',
          date: '2023-01-01',
          organizationId: 'org123',
        } as any,
        mockPrisma as any,
        'user123'
      )
    ).rejects.toThrow(TRPCError);

    // Test missing startTime
    await expect(
      createShiftFromAI(
        {
          title: 'Test Shift',
          startTime: null,
          endTime: '2023-01-01T17:00:00Z',
          date: '2023-01-01',
          organizationId: 'org123',
        } as any,
        mockPrisma as any,
        'user123'
      )
    ).rejects.toThrow(TRPCError);

    // Test missing endTime
    await expect(
      createShiftFromAI(
        {
          title: 'Test Shift',
          startTime: '2023-01-01T09:00:00Z',
          endTime: null,
          date: '2023-01-01',
          organizationId: 'org123',
        } as any,
        mockPrisma as any,
        'user123'
      )
    ).rejects.toThrow(TRPCError);
  });

  it('should create a shift with existing location and department', async () => {
    // Mock shift creation
    mockPrisma.shift.create.mockResolvedValue({
      id: 'shift123',
      title: 'Test Shift',
      startTime: new Date('2023-01-01T09:00:00Z'),
      endTime: new Date('2023-01-01T17:00:00Z'),
      locationId: 'loc123',
      departmentId: 'dept123',
      slots: 2,
      notes: 'Test notes',
      timezone: 'America/New_York',
      organizationId: 'org123',
    });

    const result = await createShiftFromAI(
      {
        title: 'Test Shift',
        startTime: '2023-01-01T09:00:00Z',
        endTime: '2023-01-01T17:00:00Z',
        date: '2023-01-01',
        locationId: 'loc123',
        departmentId: 'dept123',
        slots: 2,
        notes: 'Test notes',
        timezone: 'America/New_York',
        organizationId: 'org123',
      },
      mockPrisma as any,
      'user123'
    );

    // Verify shift was created with correct data
    expect(mockPrisma.shift.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org123',
        title: 'Test Shift',
        locationId: 'loc123',
        departmentId: 'dept123',
        startTime: new Date('2023-01-01T09:00:00Z'),
        endTime: new Date('2023-01-01T17:00:00Z'),
        slots: 2,
        notes: 'Test notes',
        timezone: 'America/New_York',
      },
      include: {
        location: true,
        department: true,
        shiftAssignments: true,
      },
    });

    // Verify location and department were not created
    expect(mockPrisma.location.create).not.toHaveBeenCalled();
    expect(mockPrisma.department.create).not.toHaveBeenCalled();

    // Verify result
    expect(result).toEqual({
      id: 'shift123',
      title: 'Test Shift',
      startTime: new Date('2023-01-01T09:00:00Z'),
      endTime: new Date('2023-01-01T17:00:00Z'),
      locationId: 'loc123',
      departmentId: 'dept123',
      slots: 2,
      notes: 'Test notes',
      timezone: 'America/New_York',
      organizationId: 'org123',
    });
  });

  it('should create a new location if needed', async () => {
    // Mock location creation
    mockPrisma.location.create.mockResolvedValue({
      id: 'newloc123',
      name: 'New Location',
      address: 'Created from AI Shift Entry',
      organizationId: 'org123',
    });

    // Mock shift creation
    mockPrisma.shift.create.mockResolvedValue({
      id: 'shift123',
      title: 'Test Shift',
      startTime: new Date('2023-01-01T09:00:00Z'),
      endTime: new Date('2023-01-01T17:00:00Z'),
      locationId: 'newloc123',
      slots: 1,
      notes: '',
      timezone: 'America/New_York',
      organizationId: 'org123',
    });

    const result = await createShiftFromAI(
      {
        title: 'Test Shift',
        startTime: '2023-01-01T09:00:00Z',
        endTime: '2023-01-01T17:00:00Z',
        date: '2023-01-01',
        newLocation: {
          name: 'New Location',
        },
        organizationId: 'org123',
      },
      mockPrisma as any,
      'user123'
    );

    // Verify location was created
    expect(mockPrisma.location.create).toHaveBeenCalledWith({
      data: {
        name: 'New Location',
        address: 'Created from AI Shift Entry',
        organizationId: 'org123',
      },
    });

    // Verify shift was created with new location ID
    expect(mockPrisma.shift.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org123',
        title: 'Test Shift',
        locationId: 'newloc123',
        departmentId: undefined,
        startTime: new Date('2023-01-01T09:00:00Z'),
        endTime: new Date('2023-01-01T17:00:00Z'),
        slots: 1,
        notes: '',
        timezone: 'America/New_York',
      },
      include: {
        location: true,
        department: true,
        shiftAssignments: true,
      },
    });
  });

  it('should create a new department if needed', async () => {
    // Mock department creation
    mockPrisma.department.create.mockResolvedValue({
      id: 'newdept123',
      name: 'New Department',
      organizationId: 'org123',
    });

    // Mock shift creation
    mockPrisma.shift.create.mockResolvedValue({
      id: 'shift123',
      title: 'Test Shift',
      startTime: new Date('2023-01-01T09:00:00Z'),
      endTime: new Date('2023-01-01T17:00:00Z'),
      departmentId: 'newdept123',
      slots: 1,
      notes: '',
      timezone: 'America/New_York',
      organizationId: 'org123',
    });

    const result = await createShiftFromAI(
      {
        title: 'Test Shift',
        startTime: '2023-01-01T09:00:00Z',
        endTime: '2023-01-01T17:00:00Z',
        date: '2023-01-01',
        newDepartment: {
          name: 'New Department',
        },
        organizationId: 'org123',
      },
      mockPrisma as any,
      'user123'
    );

    // Verify department was created
    expect(mockPrisma.department.create).toHaveBeenCalledWith({
      data: {
        name: 'New Department',
        organizationId: 'org123',
      },
    });

    // Verify shift was created with new department ID
    expect(mockPrisma.shift.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org123',
        title: 'Test Shift',
        locationId: undefined,
        departmentId: 'newdept123',
        startTime: new Date('2023-01-01T09:00:00Z'),
        endTime: new Date('2023-01-01T17:00:00Z'),
        slots: 1,
        notes: '',
        timezone: 'America/New_York',
      },
      include: {
        location: true,
        department: true,
        shiftAssignments: true,
      },
    });
  });

  it('should create shift assignments if assignees are provided', async () => {
    // Mock member lookup
    mockPrisma.member.findMany.mockResolvedValue([
      { id: 'member1' },
      { id: 'member2' },
    ]);

    // Mock shift creation
    mockPrisma.shift.create.mockResolvedValue({
      id: 'shift123',
      title: 'Test Shift',
      startTime: new Date('2023-01-01T09:00:00Z'),
      endTime: new Date('2023-01-01T17:00:00Z'),
      slots: 2,
      notes: '',
      timezone: 'America/New_York',
      organizationId: 'org123',
      shiftAssignments: [],
    });

    // Mock shift lookup with assignments
    mockPrisma.shift.findUnique.mockResolvedValue({
      id: 'shift123',
      title: 'Test Shift',
      startTime: new Date('2023-01-01T09:00:00Z'),
      endTime: new Date('2023-01-01T17:00:00Z'),
      slots: 2,
      notes: '',
      timezone: 'America/New_York',
      organizationId: 'org123',
      shiftAssignments: [
        {
          id: 'assignment1',
          shiftId: 'shift123',
          memberId: 'member1',
          outcome: 'assigned',
          reason: '',
          member: { id: 'member1', name: 'Member 1' },
        },
        {
          id: 'assignment2',
          shiftId: 'shift123',
          memberId: 'member2',
          outcome: 'assigned',
          reason: '',
          member: { id: 'member2', name: 'Member 2' },
        },
      ],
    });

    const result = await createShiftFromAI(
      {
        title: 'Test Shift',
        startTime: '2023-01-01T09:00:00Z',
        endTime: '2023-01-01T17:00:00Z',
        date: '2023-01-01',
        slots: 2,
        assignees: ['John Doe', 'Jane Smith'],
        entityMatches: {
          location: { bestMatch: null, potentialMatches: [], needsCreation: false },
          department: { bestMatch: null, potentialMatches: [], needsCreation: false },
          members: [
            {
              bestMatch: { entity: { id: 'member1', name: 'John Doe' }, confidence: 0.9, isExactMatch: true },
              potentialMatches: [{ entity: { id: 'member1', name: 'John Doe' }, confidence: 0.9, isExactMatch: true }],
              needsCreation: false,
            },
            {
              bestMatch: { entity: { id: 'member2', name: 'Jane Smith' }, confidence: 0.9, isExactMatch: true },
              potentialMatches: [{ entity: { id: 'member2', name: 'Jane Smith' }, confidence: 0.9, isExactMatch: true }],
              needsCreation: false,
            },
          ],
        },
        organizationId: 'org123',
      },
      mockPrisma as any,
      'user123'
    );

    // Verify members were looked up
    expect(mockPrisma.member.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org123',
        id: {
          in: ['member1', 'member2'],
        },
      },
      select: {
        id: true,
      },
    });

    // Verify shift assignments were created
    expect(mockPrisma.shiftAssignment.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.shiftAssignment.create).toHaveBeenCalledWith({
      data: {
        shiftId: 'shift123',
        memberId: 'member1',
        outcome: 'assigned',
        reason: '',
      },
    });
    expect(mockPrisma.shiftAssignment.create).toHaveBeenCalledWith({
      data: {
        shiftId: 'shift123',
        memberId: 'member2',
        outcome: 'assigned',
        reason: '',
      },
    });

    // Verify shift was looked up with assignments
    expect(mockPrisma.shift.findUnique).toHaveBeenCalledWith({
      where: { id: 'shift123' },
      include: {
        location: true,
        department: true,
        shiftAssignments: {
          include: {
            member: true,
          },
        },
      },
    });

    // Verify result includes assignments
    expect(result.shiftAssignments).toHaveLength(2);
    expect(result.shiftAssignments[0].memberId).toBe('member1');
    expect(result.shiftAssignments[1].memberId).toBe('member2');
  });
});