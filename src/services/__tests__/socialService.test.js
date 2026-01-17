import { SocialService } from '../socialService';
import { getDocs } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getDocs: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
    db: {}
}));

describe('SocialService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getVerifiedFeed returns formatted data correctly', async () => {
        const mockSnapshot = {
            empty: false,
            docs: [
                { id: 'ticket1', data: () => ({ title: 'Fixed Pothole', status: 'verified' }) },
                { id: 'ticket2', data: () => ({ title: 'New Light', status: 'verified' }) },
            ]
        };

        getDocs.mockResolvedValue(mockSnapshot);

        const result = await SocialService.getVerifiedFeed();

        expect(result.data.length).toBe(2);
        expect(result.data[0].title).toBe('Fixed Pothole');
        expect(result.data[0].id).toBe('ticket1');
    });

    test('getVerifiedFeed handles empty results gracefully', async () => {
        const emptySnapshot = { empty: true, docs: [] };
        getDocs.mockResolvedValue(emptySnapshot);

        const result = await SocialService.getVerifiedFeed();

        expect(result.data).toEqual([]);
        expect(result.debugInfo).toContain('No active/completed tickets found');
    });
});