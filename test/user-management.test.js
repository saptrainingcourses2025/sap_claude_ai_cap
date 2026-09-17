const cds = require('@sap/cds');
const { GET, POST, expect } = cds.test(__dirname + '/..');

const admin = { auth: { username: 'alice.admin', password: 'admin123' } };
const traveller = { auth: { username: 'rajesh.kumar', password: 'traveller123' } };

const TRAVELLER_ROLE_ID = 'b6b6b6b6-0002-4701-9701-330000000002';
const HANS_USER_ID = 'e4f5a6b7-c8d9-4401-9401-fa1234600010';

describe('UserManagement', () => {

  it('rejects any request from the Traveller role with 403', async () => {
    await expect(
      GET('/odata/v4/user-management/Users', traveller)
    ).to.be.rejectedWith(/403/);
  });

  it('creates a user with a valid payload and 201', async () => {
    const res = await POST(
      '/odata/v4/user-management/createUser',
      { firstName: 'New', lastName: 'User', email: 'new.user@travelapp.com', roleId: TRAVELLER_ROLE_ID },
      admin
    );
    expect(res.status).to.equal(201);
    expect(res.data.loginName).to.equal('new.user@travelapp.com');
  });

  it('rejects createUser with a duplicate loginName with 409', async () => {
    await expect(
      POST(
        '/odata/v4/user-management/createUser',
        { firstName: 'Dup', lastName: 'User', email: 'rajesh.kumar@gmail.com', roleId: TRAVELLER_ROLE_ID },
        admin
      )
    ).to.be.rejectedWith(/409/);
  });

  it('locks and unlocks a user, updating isLocked in the DB', async () => {
    const lockRes = await GET(`/odata/v4/user-management/lockUser(userId='${HANS_USER_ID}')`, admin);
    expect(lockRes.data.value).to.equal(true);

    const afterLock = await GET(`/odata/v4/user-management/Users(${HANS_USER_ID})`, admin);
    expect(afterLock.data.isLocked).to.equal(true);

    const unlockRes = await GET(`/odata/v4/user-management/unlockUser(userId='${HANS_USER_ID}')`, admin);
    expect(unlockRes.data.value).to.equal(true);

    const afterUnlock = await GET(`/odata/v4/user-management/Users(${HANS_USER_ID})`, admin);
    expect(afterUnlock.data.isLocked).to.equal(false);
  });

  it('rejects resetPassword with an empty password with 400', async () => {
    await expect(
      POST(
        '/odata/v4/user-management/resetPassword',
        { userId: HANS_USER_ID, newPassword: '' },
        admin
      )
    ).to.be.rejectedWith(/400/);
  });

  it('rejects resetPassword with a password under 8 characters with 400', async () => {
    await expect(
      POST(
        '/odata/v4/user-management/resetPassword',
        { userId: HANS_USER_ID, newPassword: 'short' },
        admin
      )
    ).to.be.rejectedWith(/400/);
  });

  it('rejects assignRole with an invalid roleId with 404', async () => {
    await expect(
      POST(
        '/odata/v4/user-management/assignRole',
        { userId: HANS_USER_ID, roleId: '00000000-0000-0000-0000-000000000000' },
        admin
      )
    ).to.be.rejectedWith(/404/);
  });

  it('rejects unassignRole when the assignment does not exist with 404', async () => {
    await expect(
      POST(
        '/odata/v4/user-management/unassignRole',
        { userId: HANS_USER_ID, roleId: '00000000-0000-0000-0000-000000000000' },
        admin
      )
    ).to.be.rejectedWith(/404/);
  });
});
