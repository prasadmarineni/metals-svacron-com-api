const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://metals-svacron-com-default-rtdb.firebaseio.com'
});

const db = admin.database();

db.ref('config/schedule/frequency').set('0,30 9 * * * and 0 10 * * * and 55 11 * * *')
  .then(() => {
    console.log('✅ Schedule frequency updated successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
