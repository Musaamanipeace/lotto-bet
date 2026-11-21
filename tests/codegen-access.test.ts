import test from 'node:test';
import assert from 'node:assert/strict';
import { codegenRequiresSignIn } from '../src/lib/codegen-access.ts';

test('sign-in is required for booking codes only in production with a database', () => {
  assert.equal(codegenRequiresSignIn({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x' }), true);
  assert.equal(codegenRequiresSignIn({ NODE_ENV: 'production' }), false); // no database: nobody could sign up
  assert.equal(codegenRequiresSignIn({ NODE_ENV: 'development', DATABASE_URL: 'postgres://x' }), false);
  assert.equal(codegenRequiresSignIn({}), false);
});
