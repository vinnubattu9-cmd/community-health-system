const admin = require('firebase-admin');

let firestoreDb = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
  try {
    // Format the private key if it has escaped newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });

    firestoreDb = admin.firestore();
    console.log('🔥 Firebase Admin SDK Initialized Successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
} else {
  console.log('ℹ️  Firebase credentials not fully set. Firestore provider will be unavailable.');
}

module.exports = firestoreDb;
