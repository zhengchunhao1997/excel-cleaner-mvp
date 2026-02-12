import assert from 'node:assert/strict';
import { toBucketKey } from '../src/statsBuckets';

const d = (iso: string) => new Date(iso);

assert.equal(toBucketKey(d('2026-02-05T10:00:00Z'), 'day'), '2026-02-05');
assert.equal(toBucketKey(d('2026-02-05T10:00:00Z'), 'month'), '2026-02');
assert.equal(toBucketKey(d('2026-01-01T10:00:00Z'), 'week'), '2026-W01');
assert.equal(toBucketKey(d('2026-01-04T10:00:00Z'), 'week'), '2026-W01');
assert.equal(toBucketKey(d('2026-01-05T10:00:00Z'), 'week'), '2026-W02');

process.stdout.write('buckets.test.ts ok\n');

