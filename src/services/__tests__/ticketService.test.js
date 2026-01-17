import { TicketService } from '../ticketService';
import { getDoc, updateDoc } from 'firebase/firestore';
import { TICKET_STATUS } from '../../constants/models';
import { notifyUser, notifyRole } from '../../utils/notifications';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(),
    collection: jest.fn(),
    addDoc: jest.fn(),
    getDocs: jest.fn(),
    doc: jest.fn(() => 'mock-ref'),
    updateDoc: jest.fn(),
    getDoc: jest.fn(),
    writeBatch: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
    db: {}
}));

jest.mock('../../utils/notifications', () => ({
    notifyUser: jest.fn(),
    notifyRole: jest.fn(),
}));

describe('TicketService Workflow Transitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resolveTicket', () => {
        test('should allow transition from IN_PROGRESS to RESOLVED', async () => {
            // Setup mock for a ticket currently IN_PROGRESS
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({
                    status: TICKET_STATUS.IN_PROGRESS,
                    userId: 'user1',
                    title: 'Fix pothole'
                })
            });
            updateDoc.mockResolvedValue({});

            const result = await TicketService.resolveTicket('ticket1', 'Fixed', 'photo.jpg');

            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                status: TICKET_STATUS.RESOLVED
            }));
        });

        test('should allow transition from ASSIGNED to RESOLVED (Shortcut)', async () => {
            // Mock ticket as ASSIGNED
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({
                    status: TICKET_STATUS.ASSIGNED,
                    userId: 'user1',
                    title: 'Fix pothole'
                })
            });
            updateDoc.mockResolvedValue({});

            const result = await TicketService.resolveTicket('ticket1', 'Fixed', 'photo.jpg');

            // This is what we WANT, but we expect it to fail currently
            expect(result.success).toBe(true);
        });

        test('should fail transition from DRAFT to RESOLVED', async () => {
            // Setup mock for a ticket currently DRAFT
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({
                    status: TICKET_STATUS.DRAFT,
                    userId: 'user1'
                })
            });

            const result = await TicketService.resolveTicket('ticket1', 'Fixed', 'photo.jpg');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Illegal State Transition');
            expect(updateDoc).not.toHaveBeenCalled();
        });
    });

    describe('verifyTicket', () => {
        test('should allow transition from RESOLVED to VERIFIED', async () => {
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ status: TICKET_STATUS.RESOLVED, userId: 'user1' })
            });
            updateDoc.mockResolvedValue({});

            const result = await TicketService.verifyTicket('ticket1');
            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalled();
        });

        test('should fail transition from IN_PROGRESS to VERIFIED', async () => {
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ status: TICKET_STATUS.IN_PROGRESS })
            });

            const result = await TicketService.verifyTicket('ticket1');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Illegal State Transition');
            expect(updateDoc).not.toHaveBeenCalled();
        });
    });

    describe('reopenTicket', () => {
        test('should allow transition from RESOLVED to REOPENED', async () => {
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ status: TICKET_STATUS.RESOLVED, userId: 'user1' })
            });
            updateDoc.mockResolvedValue({});

            const result = await TicketService.reopenTicket('ticket1', 'Not fixed');
            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                status: 'reopened'
            }));
        });
    });

    describe('markAsUnderReview', () => {
        test('should allow transition from SUBMITTED to UNDER_REVIEW', async () => {
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ status: TICKET_STATUS.SUBMITTED, userId: 'user1' })
            });
            updateDoc.mockResolvedValue({});

            const result = await TicketService.markAsUnderReview('ticket1');
            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalled();
        });

        test('should fail transition from VERIFIED to UNDER_REVIEW', async () => {
            getDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ status: TICKET_STATUS.VERIFIED })
            });

            const result = await TicketService.markAsUnderReview('ticket1');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Illegal State Transition');
            expect(updateDoc).not.toHaveBeenCalled();
        });
    });
});
