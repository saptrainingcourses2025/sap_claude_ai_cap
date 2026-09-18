const cds = require('@sap/cds');
const jwt = require('../auth/jwt');
const password = require('../auth/password');

module.exports = (srv) => {
  srv.on('login', async (req) => {
    const { loginName, password: plain } = req.data;
    if (!loginName || !plain) return req.error(400, 'loginName and password are required');

    const db = await cds.connect.to('db');
    const user = await db.run(SELECT.one.from('anubhav.claude.Users').where({ loginName }));
    if (!user) return req.error(401, 'Invalid credentials');
    if (user.isLocked) return req.error(403, 'Account is locked');

    const creds = await db.run(SELECT.one.from('anubhav.claude.UserCredentials').where({ user_ID: user.ID }));
    const ok = creds && (await password.compare(plain, creds.passwordHash));
    if (!ok) {
      if (creds) {
        await db.run(
          UPDATE('anubhav.claude.UserCredentials').set({ failedAttempts: creds.failedAttempts + 1 }).where({ ID: creds.ID })
        );
      }
      return req.error(401, 'Invalid credentials');
    }

    await db.run(
      UPDATE('anubhav.claude.UserCredentials')
        .set({ failedAttempts: 0, lastLoginAt: new Date().toISOString() })
        .where({ ID: creds.ID })
    );

    return issueTokens(user.ID);
  });

  srv.on('refresh', async (req) => {
    const { refreshToken } = req.data;
    if (!refreshToken) return req.error(400, 'refreshToken is required');

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, 'refresh');
    } catch {
      return req.error(401, 'Invalid or expired refresh token');
    }

    const db = await cds.connect.to('db');
    const user = await db.run(SELECT.one.from('anubhav.claude.Users').where({ ID: decoded.sub }));
    if (!user) return req.error(401, 'Invalid or expired refresh token');
    if (user.isLocked) return req.error(403, 'Account is locked');

    return issueTokens(user.ID);
  });

  srv.on('register', async (req) => {
    const { loginName, password: plain, firstName, lastName, phone, addressType } = req.data;

    if (!loginName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginName)) {
      return req.error(400, 'A valid email is required');
    }
    if (!plain || plain.length < 8) {
      return req.error(400, 'Password must be at least 8 characters');
    }
    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return req.error(400, 'First name and last name are required');
    }

    const db = await cds.connect.to('db');

    const existingUser = await db.run(SELECT.one.from('anubhav.claude.Users').where({ loginName }));
    if (existingUser) return req.error(409, 'Email already registered');

    const existingTraveller = await db.run(SELECT.one.from('anubhav.claude.Travellers').where({ email: loginName }));
    if (existingTraveller) return req.error(409, 'Email already registered');

    const travellerRole = await db.run(SELECT.one.from('anubhav.claude.Roles').where({ code: 'TRAVELLER' }));
    if (!travellerRole) return req.error(500, 'TRAVELLER role is not configured');

    const createdUser = await db.run(
      INSERT.into('anubhav.claude.Users').entries({ firstName, lastName, loginName, isLocked: true })
    );
    const userId = createdUser?.ID ?? (await db.run(SELECT.one.from('anubhav.claude.Users').where({ loginName }))).ID;

    const passwordHash = await password.hash(plain);
    await db.run(
      INSERT.into('anubhav.claude.UserCredentials').entries({ user_ID: userId, passwordHash, failedAttempts: 0 })
    );
    await db.run(INSERT.into('anubhav.claude.UserRoles').entries({ user_ID: userId, role_ID: travellerRole.ID }));

    await db.run(
      INSERT.into('anubhav.claude.Travellers').entries({
        firstName,
        lastName,
        email: loginName,
        phone,
        addressType_code: addressType,
        type_code: 'ST',
        status_code: 'P',
        userID: userId
      })
    );

    return {
      success: true,
      message: 'Registration successful. An admin must unlock your account before first login.'
    };
  });

  srv.on('me', async (req) => {
    if (req.user._is_anonymous) return req.error(401, 'Not authenticated');

    const db = await cds.connect.to('db');
    const user = await db.run(SELECT.one.from('anubhav.claude.Users').where({ ID: req.user.id }));
    if (!user) return req.error(401, 'Not authenticated');

    return {
      id: user.ID,
      loginName: user.loginName,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: Object.keys(req.user.roles),
    };
  });
};

function issueTokens(userId) {
  return {
    accessToken: jwt.sign({ sub: userId }, 'access'),
    refreshToken: jwt.sign({ sub: userId }, 'refresh'),
    expiresIn: jwt.expiresIn('access'),
  };
}
