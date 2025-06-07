"use strict";
/**
 * User authentication and profile management
 * Handles user creation, profile updates, and role management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserActivityLogs = exports.disableTwoFactor = exports.enableTwoFactor = exports.revokeAdminRole = exports.grantAdminRole = exports.isAdmin = exports.updateLastLogin = exports.getUserProfile = exports.updateUserProfile = exports.createUserProfile = void 0;
const admin = require("firebase-admin");
/**
 * Create user profile when a new user registers
 */
async function createUserProfile(user) {
    try {
        const { uid, email, displayName, photoURL } = user;
        if (!uid || !email) {
            console.error('Validation error: Missing UID or email', { uid, email });
            throw new Error('Invalid user data: UID and email are required');
        }
        const userProfile = {
            uid,
            email,
            displayName: displayName || email.split('@')[0] || 'User',
            role: 'user',
            createdAt: admin.firestore.Timestamp.now(),
            lastLogin: admin.firestore.Timestamp.now(),
            twoFactorEnabled: false,
            preferences: {
                theme: 'light',
                notifications: true,
                language: 'en'
            },
            avatar: photoURL || undefined
        };
        console.log('Creating user profile with data:', userProfile);
        // Check if this is the first user (make them admin)
        const usersSnapshot = await admin.firestore().collection('users').limit(1).get();
        if (usersSnapshot.empty) {
            userProfile.role = 'admin';
        }
        const userRef = admin.firestore().collection('users').doc(uid);
        await userRef.set(userProfile);
        console.log('User profile successfully written to Firestore:', userRef.path);
        // Log user creation
        await logUserActivity(uid, 'user_created', { email, displayName });
    }
    catch (error) {
        console.error('Error creating user profile:', error);
        throw new Error('Failed to create user profile');
    }
}
exports.createUserProfile = createUserProfile;
/**
 * Update user profile information
 */
async function updateUserProfile(uid, updates) {
    try {
        const updateData = Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.Timestamp.now() });
        await admin.firestore()
            .collection('users')
            .doc(uid)
            .update(updateData);
        // Log profile update
        await logUserActivity(uid, 'profile_updated', updates);
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}
exports.updateUserProfile = updateUserProfile;
/**
 * Get user profile by UID
 */
async function getUserProfile(uid) {
    try {
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();
        if (!userDoc.exists) {
            return null;
        }
        return userDoc.data();
    }
    catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}
exports.getUserProfile = getUserProfile;
/**
 * Update user's last login timestamp
 */
async function updateLastLogin(uid) {
    try {
        await admin.firestore()
            .collection('users')
            .doc(uid)
            .update({
            lastLogin: admin.firestore.Timestamp.now()
        });
    }
    catch (error) {
        console.error('Error updating last login:', error);
    }
}
exports.updateLastLogin = updateLastLogin;
/**
 * Check if user has admin role
 */
async function isAdmin(uid) {
    try {
        const userProfile = await getUserProfile(uid);
        return (userProfile === null || userProfile === void 0 ? void 0 : userProfile.role) === 'admin' || false;
    }
    catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}
exports.isAdmin = isAdmin;
/**
 * Grant admin role to user (admin only)
 */
async function grantAdminRole(adminUid, targetUid) {
    try {
        // Verify the requester is admin
        if (!(await isAdmin(adminUid))) {
            throw new Error('Permission denied: Admin access required');
        }
        await admin.firestore()
            .collection('users')
            .doc(targetUid)
            .update({
            role: 'admin',
            updatedAt: admin.firestore.Timestamp.now()
        });
        // Log role change
        await logUserActivity(targetUid, 'role_granted', {
            grantedBy: adminUid,
            newRole: 'admin'
        });
        return true;
    }
    catch (error) {
        console.error('Error granting admin role:', error);
        return false;
    }
}
exports.grantAdminRole = grantAdminRole;
/**
 * Revoke admin role from user (admin only)
 */
async function revokeAdminRole(adminUid, targetUid) {
    try {
        // Verify the requester is admin
        if (!(await isAdmin(adminUid))) {
            throw new Error('Permission denied: Admin access required');
        }
        // Prevent admin from removing their own admin status
        if (adminUid === targetUid) {
            throw new Error('Cannot revoke your own admin status');
        }
        await admin.firestore()
            .collection('users')
            .doc(targetUid)
            .update({
            role: 'user',
            updatedAt: admin.firestore.Timestamp.now()
        });
        // Log role change
        await logUserActivity(targetUid, 'role_revoked', {
            revokedBy: adminUid,
            newRole: 'user'
        });
        return true;
    }
    catch (error) {
        console.error('Error revoking admin role:', error);
        return false;
    }
}
exports.revokeAdminRole = revokeAdminRole;
/**
 * Enable two-factor authentication for user
 */
async function enableTwoFactor(uid) {
    try {
        await admin.firestore()
            .collection('users')
            .doc(uid)
            .update({
            twoFactorEnabled: true,
            updatedAt: admin.firestore.Timestamp.now()
        });
        // Log 2FA enablement
        await logUserActivity(uid, '2fa_enabled', {});
        return true;
    }
    catch (error) {
        console.error('Error enabling 2FA:', error);
        return false;
    }
}
exports.enableTwoFactor = enableTwoFactor;
/**
 * Disable two-factor authentication for user
 */
async function disableTwoFactor(uid) {
    try {
        await admin.firestore()
            .collection('users')
            .doc(uid)
            .update({
            twoFactorEnabled: false,
            updatedAt: admin.firestore.Timestamp.now()
        });
        // Log 2FA disablement
        await logUserActivity(uid, '2fa_disabled', {});
        return true;
    }
    catch (error) {
        console.error('Error disabling 2FA:', error);
        return false;
    }
}
exports.disableTwoFactor = disableTwoFactor;
/**
 * Log user activity for audit purposes
 */
async function logUserActivity(uid, action, details) {
    try {
        await admin.firestore()
            .collection('user_activity_logs')
            .add({
            uid,
            action,
            details,
            timestamp: admin.firestore.Timestamp.now(),
            ipAddress: details.ipAddress || null,
            userAgent: details.userAgent || null
        });
    }
    catch (error) {
        console.error('Error logging user activity:', error);
    }
}
/**
 * Get user activity logs (admin only)
 */
async function getUserActivityLogs(adminUid, targetUid, limit = 50) {
    try {
        // Verify admin access
        if (!(await isAdmin(adminUid))) {
            throw new Error('Permission denied: Admin access required');
        }
        let query = admin.firestore()
            .collection('user_activity_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit);
        if (targetUid) {
            query = query.where('uid', '==', targetUid);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        console.error('Error getting activity logs:', error);
        return [];
    }
}
exports.getUserActivityLogs = getUserActivityLogs;
//# sourceMappingURL=userManager.js.map
