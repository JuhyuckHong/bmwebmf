import test from "node:test";
import assert from "node:assert/strict";

import { nowHHMM, overlapsShooting } from "../wiperUtils.js";

test("overlapsShooting matches the module-side rule", () => {
    assert.equal(overlapsShooting("0600", "1800", "0400", 30), false);
    assert.equal(overlapsShooting("0600", "1800", "0559", 30), true);
    assert.equal(overlapsShooting("0600", "1800", "0802", 30), true);
    assert.equal(overlapsShooting("0000", "2400", "0400", 30), true);
    assert.equal(overlapsShooting("2200", "0300", "0400", 30), false);
    assert.equal(overlapsShooting(undefined, "1800", "0400", 30), true);
});

test("nowHHMM pads hours and minutes", () => {
    assert.equal(nowHHMM(new Date(2026, 9, 29, 4, 5)), "0405");
});
