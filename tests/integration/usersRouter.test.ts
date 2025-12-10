import { usersRouter } from '@/server/api/routers/usersRouter';
import { prisma } from '@/lib/prisma';
import workos from '@/lib/workos';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
        },
        member: {
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
        },
        invitation: {
            findMany: jest.fn().mockResolvedValue([]),
            deleteMany: jest.fn().mockResolvedValue({}),
        }
    },
}));

jest.mock('@/lib/workos', () => ({
    __esModule: true,
    default: {
        userManagement: {
            listUsers: jest.fn(),
            listInvitations: jest.fn(),
        },
    },
}));

describe('usersRouter', () => {
    const mockCtx = {
        user: {
            id: 'user-1',
            role: 'admin',
            organizationId: 'org-1',
            workosOrgId: 'workos-org-1',
            workosUserId: 'workos-user-1',
        },
        prisma: prisma,
        isUserData: () => true,
        isMemberData: () => true,
    };

    const caller = usersRouter.createCaller(mockCtx as any);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('listWorkOSMembers', () => {
        it('should fetch users from WorkOS and merge with local members', async () => {
            // Mock WorkOS response
            (workos.userManagement.listUsers as jest.Mock).mockResolvedValue({
                data: [
                    {
                        id: 'workos-user-1',
                        email: 'test@example.com',
                        firstName: 'Test',
                        lastName: 'User',
                        profilePictureUrl: 'http://example.com/pic.jpg',
                    },
                ],
            });

            (workos.userManagement.listInvitations as jest.Mock).mockResolvedValue({
                data: [],
            });

            // Mock Prisma response
            (prisma.member.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'member-1',
                    userId: 'user-1',
                    organizationId: 'org-1',
                    role: 'member',
                    isActivated: true,
                    isAvailableByDefault: true,
                    user: {
                        email: 'test@example.com',
                    },
                },
            ]);

            const result = await caller.listWorkOSMembers();

            expect(workos.userManagement.listUsers).toHaveBeenCalledWith({
                organizationId: 'workos-org-1',
            });
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                email: 'test@example.com',
                workosUserId: 'workos-user-1',
                memberId: 'member-1',
                name: 'Test User', 
            });
        });

        it('should auto-create local members if missing', async () => {
             // Mock WorkOS response
            (workos.userManagement.listUsers as jest.Mock).mockResolvedValue({
                data: [
                    {
                        id: 'workos-user-2',
                        email: 'new@example.com',
                        firstName: 'New',
                        lastName: 'User',
                    },
                ],
            });
            (workos.userManagement.listInvitations as jest.Mock).mockResolvedValue({
                data: [],
            });

            // Mock Prisma response (empty initially)
            (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            
            // Mock creation
            (prisma.user.create as jest.Mock).mockResolvedValue({
                id: 'new-user-id',
                email: 'new@example.com',
                name: 'New User',
            });
            (prisma.member.create as jest.Mock).mockResolvedValue({
                id: 'new-member-id',
                userId: 'new-user-id',
                role: 'member',
                user: {
                    email: 'new@example.com'
                }
            });

            await caller.listWorkOSMembers();

            expect(prisma.user.create).toHaveBeenCalled();
            expect(prisma.member.create).toHaveBeenCalled();
        });
    });
});
