#!/usr/bin/env node
// Lightweight HS256 JWT generator for testing protected endpoints (dev only)
// Usage examples:
//   JWT_SECRET=your-secret ./scripts/generate-jwt.js
//   JWT_SECRET=your-secret ./scripts/generate-jwt.js '{"id":"u1","sbbUserId":"sbb_u1","email":"u1@example.com"}' 3600

const crypto = require('crypto');

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHS256(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const secret = process.env.JWT_SECRET || 'your-secret-key';
const now = Math.floor(Date.now() / 1000);
const defaultPayload = {
  id: 'test-user-001',
  sbbUserId: 'sbb_test_user',
  email: 'test@sbb.ch',
};

const payloadArg = process.argv[2];
const expSecondsArg = process.argv[3];

let payload = defaultPayload;
if (payloadArg) {
  try {
    payload = JSON.parse(payloadArg);
  } catch (e) {
    /* ignore, keep default */
  }
}

const expSeconds = expSecondsArg ? parseInt(expSecondsArg, 10) : 24 * 60 * 60; // 24h

const header = { alg: 'HS256', typ: 'JWT' };
const body = { ...payload, iat: now, exp: now + expSeconds };

const encodedHeader = base64UrlEncode(JSON.stringify(header));
const encodedBody = base64UrlEncode(JSON.stringify(body));
const toSign = `${encodedHeader}.${encodedBody}`;
const signature = signHS256(toSign, secret);

process.stdout.write(`${toSign}.${signature}`);
process.stdout.write('\n');
