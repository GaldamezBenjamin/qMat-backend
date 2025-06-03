const express = require('express');
const router = express.Router();
const usuario = require('../controllers/usuarioCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all user routes
router.use(verifyToken);

// Get all users (Admin only)
router.get('/', authorizeRoles('admin'), usuario.getAllUsers);

// Get a single user by UID
// Users can view their own profile, admins can view any profile
router.get('/:uid', usuario.getUserByUid); // Logic for self/admin check is in controller

// Create a new user profile (after Firebase Auth registration)
// This endpoint is typically called by a newly registered user to set up their profile.
router.post('/profile', usuario.createUserProfile);

// Update an existing user's profile
// Users can update their own profile, admins can update any profile (with role restrictions)
router.put('/:uid', usuario.updateUser); // Logic for self/admin check is in controller

// Delete a user (Admin only)
router.delete('/:uid', authorizeRoles('admin'), usuario.deleteUser);

// Update subscription status
// Users can update their own subscription, admins can update any
router.patch('/:uid/subscription', usuario.updateSubscription); // Logic for self/admin check is in controller

// Update experience points
// Users can update their own experience, admins can update any
router.patch('/:uid/experience', usuario.updateExperience); // Logic for self/admin check is in controller

module.exports = router;