import { OAuth2Client } from 'google-auth-library';

// Google OAuth2 Client configuration
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth credentials are not set. Google login will not work.');
}

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// Google token verification helper
export const googleAuth = {
  async verifyIdToken(token: string) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid Google token payload');
      }
      
      return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified,
        googleId: payload.sub,
      };
    } catch (error) {
      console.error('Google token verification error:', error);
      throw error;
    }
  },

  // Generate Google OAuth URL
  generateAuthUrl(state?: string) {
    return googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
    });
  },

  // Exchange code for tokens
  async getTokensFromCode(code: string) {
    try {
      const { tokens } = await googleClient.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Google token exchange error:', error);
      throw error;
    }
  },

  // Refresh access token
  async refreshAccessToken(refreshToken: string) {
    try {
      googleClient.setCredentials({
        refresh_token: refreshToken,
      });
      
      const { credentials } = await googleClient.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Google token refresh error:', error);
      throw error;
    }
  },
};

export default googleClient;