"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userManager_1 = require("../userManager");
const admin = require("firebase-admin");
// Mock the firestore instance
const mockFirestoreInstance = {
    collection: jest.fn(() => ({
        doc: jest.fn(() => ({
            set: jest.fn(() => Promise.resolve()),
        })),
        add: jest.fn(() => Promise.resolve({ id: 'mockDocId' })),
        limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ empty: true })),
        })),
    })),
};
jest.mock('firebase-admin', () => {
    const actualAdmin = jest.requireActual('firebase-admin');
    return Object.assign(Object.assign({}, actualAdmin), { firestore: jest.fn(() => mockFirestoreInstance), auth: jest.fn(() => ({
            getUser: jest.fn(() => Promise.resolve({
                uid: 'testUid',
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: 'http://example.com/avatar.png',
                emailVerified: true,
                disabled: false,
                metadata: {
                    creationTime: '2025-01-01T00:00:00Z',
                    lastSignInTime: '2025-05-01T00:00:00Z',
                    toJSON: jest.fn(() => ({ creationTime: '2025-01-01T00:00:00Z', lastSignInTime: '2025-05-01T00:00:00Z' })),
                },
                providerData: [],
                toJSON: jest.fn(() => ({})),
            })),
        })) });
});
// Mock Timestamp separately
Object.defineProperty(admin, 'firestore', {
    value: Object.assign(jest.fn(() => mockFirestoreInstance), {
        Timestamp: {
            now: jest.fn(() => ({ seconds: 1620000000, nanoseconds: 0 })),
        },
    }),
    writable: true,
});
describe('createUserProfile', () => {
    it('should create a user profile successfully', async () => {
        const user = {
            uid: 'testUid',
            email: 'test@example.com',
            displayName: 'Test User',
            photoURL: 'http://example.com/avatar.png',
            emailVerified: true,
            disabled: false,
            metadata: {
                creationTime: '2025-01-01T00:00:00Z',
                lastSignInTime: '2025-05-01T00:00:00Z',
                toJSON: jest.fn(() => ({ creationTime: '2025-01-01T00:00:00Z', lastSignInTime: '2025-05-01T00:00:00Z' })),
            },
            providerData: [],
            toJSON: jest.fn(() => ({})),
        };
        await expect((0, userManager_1.createUserProfile)(user)).resolves.not.toThrow();
    });
    it('should throw an error if user data is invalid', async () => {
        const user = {
            uid: '',
            email: '',
            emailVerified: false,
            disabled: false,
            metadata: {
                creationTime: '',
                lastSignInTime: '',
                toJSON: jest.fn(() => ({ creationTime: '', lastSignInTime: '' })),
            },
            providerData: [],
            toJSON: jest.fn(() => ({})),
        };
        await expect((0, userManager_1.createUserProfile)(user)).rejects.toThrow('Invalid user data: UID and email are required');
    });
});
//# sourceMappingURL=userManager.test.js.map
