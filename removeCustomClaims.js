const { admin } = require('../config/firebase.cjs');

async function removeAllCustomClaims() {
    let nextPageToken;
    do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        for (const userRecord of listUsersResult.users) {
            if (userRecord.customClaims && Object.keys(userRecord.customClaims).length > 0) {
                await admin.auth().setCustomUserClaims(userRecord.uid, {});
                console.log(`Custom claims eliminados para usuario ${userRecord.uid}`);
            }
        }
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    console.log('Todos los custom claims han sido eliminados.');
}

removeAllCustomClaims().catch(console.error);