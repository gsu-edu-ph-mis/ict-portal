const { google } = require('googleapis');
const path = require('path')

// Load the service account key file
const keyFile = path.join(CONFIG.app.dir, 'credentials/ict-portal-project-8e4a5d2260e4.json')

// Set up the scopes
const SCOPES = ['https://www.googleapis.com/auth/admin.directory.user'];

// Authenticate using the service account
const authClient = new google.auth.JWT({
  keyFile: keyFile,
  scopes: SCOPES,
  subject: CRED.googleAdminEmail // Replace with your Google Workspace admin email
});

const admin = google.admin({
  version: 'directory_v1',
  auth: authClient,
});



module.exports = {
  checkUser: async (email) => {
    try {
      const res = await admin.users.get({
        userKey: email,
      });
      return res.data; // If user exists, return user data
    } catch (err) {
      if (err.code === 404) {
        return false; // User does not exist
      }
      throw err; // Handle other errors
    }
  },
  createUser: async (user) => {
      const res = await admin.users.insert({
        requestBody: user,
      });
      return res
  },
  deleteUser: async (email) => {
    const res = await admin.users.delete({
      userKey: email, // Email or user ID of the user to delete
    });
    return res
  }
}