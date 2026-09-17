/**
 * auth.cds
 *
 * Credentials for the custom JWT authentication framework. Kept in a
 * sibling file so the existing Users/Roles/UserRoles entities in
 * schema.cds are never touched.
 */
namespace anubhav.claude;

using { anubhav.claude as db } from './schema';
using { cuid } from '@sap/cds/common';

entity UserCredentials : cuid {
  user           : Association to db.Users @mandatory;
  passwordHash   : String(255) @mandatory;
  failedAttempts : Integer default 0;
  lastLoginAt    : Timestamp;
}

annotate UserCredentials with @assert.unique: { user: [ user ] };
