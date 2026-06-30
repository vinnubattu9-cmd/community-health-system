const dbManager = require('./dbManager');

// Seeds the default users for each role (ASHA, ANM, PHC, NGO, SACHIVALAYAM) if not present
const seedAdmin = async () => {
  try {
    const defaultUsers = [
      { username: 'bhanu', password: '123456', role: 'SACHIVALAYAM' }, // Default account
      { username: 'asha_worker', password: '123456', role: 'ASHA' },
      { username: 'anm_nurse', password: '123456', role: 'ANM' },
      { username: 'phc_officer', password: '123456', role: 'PHC' },
      { username: 'ngo_coordinator', password: '123456', role: 'NGO' },
      { username: 'sachivalayam_admin', password: '123456', role: 'SACHIVALAYAM' }
    ];

    for (const u of defaultUsers) {
      const existing = await dbManager.findUser(u.username);
      if (!existing) {
        await dbManager.createUser(u);
        console.log(`✅ Seeded user: username=${u.username}, role=${u.role}`);
      } else {
        console.log(`ℹ️  User already exists: username=${u.username}`);
      }
    }
  } catch (error) {
    console.error('❌ Error seeding accounts:', error.message);
  }
};

module.exports = seedAdmin;
