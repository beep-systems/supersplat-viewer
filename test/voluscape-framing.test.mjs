import test from 'node:test';
import assert from 'node:assert/strict';
import { framePose, validBounds } from '../src/framing.ts';

test('VoluScape framing fits the minor viewport axis and preserves world target', () => {
    const bounds = { min: [90, -4, 30], max: [110, 4, 36] };
    for (const [width, height] of [
        [1600, 900],
        [900, 1600],
        [800, 800]
    ]) {
        const pose = framePose(bounds, [2, 2, -2], 85, width, height);
        assert.deepEqual(pose.target, [100, 0, 33]);
        const minorAngle = Math.atan(
            (Math.tan((85 * Math.PI) / 360) * Math.min(width, height)) / Math.max(width, height)
        );
        assert.ok(Math.asin(Math.hypot(10, 4, 3) / pose.distance) < minorAngle);
    }
    assert.equal(framePose(bounds, [0, 0, 0], 85, 800, 800), null);
    assert.equal(framePose(bounds, [1, 1, 1], 85, 0, 800), null);
    assert.equal(validBounds({ min: [0, 0, 0], max: [0, 0, 0] }), false);
});
