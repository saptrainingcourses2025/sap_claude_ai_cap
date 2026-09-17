using { anubhav.claude as db } from '../db/schema';

service UserManagement @(
    path     : 'user-management',
    requires : 'ADMIN'
) {

  entity Users     as projection on db.Users;
  entity Roles     as projection on db.Roles;
  entity UserRoles as projection on db.UserRoles;

  function lockUser(userId: String)   returns Boolean;
  function unlockUser(userId: String) returns Boolean;

  action createUser(firstName: String, lastName: String, email: String, roleId: String) returns Users;
  action resetPassword(userId: String, newPassword: String) returns Boolean;
  action assignRole(userId: String, roleId: String)   returns Boolean;
  action unassignRole(userId: String, roleId: String) returns Boolean;
}

