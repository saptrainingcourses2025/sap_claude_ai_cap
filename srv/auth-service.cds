service AuthService @(path: 'auth', requires: 'any') {

  action login(loginName: String, password: String) returns {
    accessToken  : String;
    refreshToken : String;
    expiresIn    : Integer;
  };

  action refresh(refreshToken: String) returns {
    accessToken  : String;
    refreshToken : String;
    expiresIn    : Integer;
  };

  function me() returns {
    id        : String;
    loginName : String;
    firstName : String;
    lastName  : String;
    roles     : many String;
  };

  action register(
    loginName   : String,
    password    : String,
    firstName   : String,
    lastName    : String,
    phone       : String,
    addressType : String
  ) returns {
    success : Boolean;
    message : String;
  };
}
