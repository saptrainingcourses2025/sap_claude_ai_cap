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
