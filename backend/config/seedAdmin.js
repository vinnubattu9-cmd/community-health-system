const Admin = require('../models/Admin');

// Seeds the default admin user (bhanu / 123456) into MongoDB if not already present
const seedAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ username: 'bhanu' });

    if (!existingAdmin) {
      await Admin.create({
        username: 'bhanu',
        password: '123456'  // Will be hashed automatically by pre-save hook
      });
      console.log('✅ Default admin account created: username=bhanu');
    } else {
      console.log('ℹ️  Admin account already exists in MongoDB: username=bhanu');
    }
  } catch (error) {
    console.error('❌ Error seeding admin account:', error.message);
  }
};

module.exports = seedAdmin;
