import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import authRoutes from './routes/auth.js';
import User from './models/User.js';

dotenv.config();

// Override environment variables for testing
const TEST_CLIENT_ID = 'test_google_client_id_12345';
const TEST_OWNER_EMAIL = 'owner@example.com';
process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
process.env.OWNER_EMAIL = TEST_OWNER_EMAIL;

// Mock Google Token Verification
OAuth2Client.prototype.verifyIdToken = async function ({ idToken, audience }) {
  if (audience !== TEST_CLIENT_ID) {
    throw new Error('Audience mismatch');
  }
  
  if (idToken === 'valid_owner_token') {
    return {
      getPayload: () => ({
        email: TEST_OWNER_EMAIL,
        name: 'Authorized Owner User',
      }),
    };
  } else if (idToken === 'valid_other_token') {
    return {
      getPayload: () => ({
        email: 'attacker@example.com',
        name: 'Unauthorized User',
      }),
    };
  } else {
    throw new Error('Invalid token signature or expired');
  }
};

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const runTests = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fuelledger';
    console.log(`Connecting to database for test...`);
    await mongoose.connect(connStr);
    console.log('Database connected.');

    // Clear old test accounts
    await User.deleteMany({ username: { $in: [TEST_OWNER_EMAIL, 'attacker@example.com'] } });

    const server = app.listen(5001, async () => {
      console.log('Test server listening on port 5001');

      try {
        // Test 1: Log in with Authorized Owner Gmail
        console.log('\n--- Test 1: Login with Authorized Owner Gmail ---');
        let response = await fetch('http://localhost:5001/api/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'valid_owner_token' }),
        });
        let data = await response.json();
        console.log('Status Code:', response.status);
        console.log('Response Payload:', data);
        if (response.status === 200 && data.role === 'Owner' && data.username === TEST_OWNER_EMAIL) {
          console.log('✅ TEST 1 PASSED: Owner logged in successfully!');
        } else {
          console.log('❌ TEST 1 FAILED: Could not log in Owner.');
        }

        // Test 2: Log in with Unauthorized Gmail
        console.log('\n--- Test 2: Login with Unauthorized Gmail ---');
        response = await fetch('http://localhost:5001/api/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'valid_other_token' }),
        });
        data = await response.json();
        console.log('Status Code:', response.status);
        console.log('Response Payload:', data);
        if (response.status === 403) {
          console.log('✅ TEST 2 PASSED: Unauthorized account blocked!');
        } else {
          console.log('❌ TEST 2 FAILED: Attacker logged in.');
        }

        // Test 3: Log in with Invalid/Malformed Token
        console.log('\n--- Test 3: Malformed Google Token ---');
        response = await fetch('http://localhost:5001/api/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'invalid_token_xyz' }),
        });
        data = await response.json();
        console.log('Status Code:', response.status);
        console.log('Response Payload:', data);
        if (response.status === 401) {
          console.log('✅ TEST 3 PASSED: Invalid token correctly rejected!');
        } else {
          console.log('❌ TEST 3 FAILED: Invalid token accepted.');
        }

      } catch (err) {
        console.error('Request failed during tests:', err.message);
      } finally {
        // Cleanup database and close connections
        console.log('\nCleaning up database...');
        await User.deleteMany({ username: { $in: [TEST_OWNER_EMAIL, 'attacker@example.com'] } });
        await mongoose.connection.close();
        server.close();
        console.log('Test Server Closed.');
      }
    });
  } catch (error) {
    console.error('Test startup failed:', error.message);
  }
};

runTests();
