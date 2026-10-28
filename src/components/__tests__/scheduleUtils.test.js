import test from "node:test";
import assert from "node:assert/strict";

import { INTERVAL_OPTIONS, isInShootingHours, toHHMM, toTimeInput, validateSchedule } from "../scheduleUtils.js";

test("interval options stay within the HHMM carry limit", () => {
    assert.ok(INTERVAL_OPTIONS.every((v) => (v >= 1 && v <= 40) || v === 60));
    assert.ok(!INTERVAL_OPTIONS.includes(45));
});

test("time input conversion", () => {
    assert.equal(toTimeInput("0630"), "06:30");
    assert.equal(toTimeInput(null), "");
    assert.equal(toHHMM("06:30"), "0630");
});

test("validateSchedule", () => {
    assert.equal(validateSchedule("legacy", "0600", "1800", 10), null);
    assert.ok(validateSchedule("legacy", "", "1800", 10));
    assert.ok(validateSchedule("legacy", "0600", "0600", 10));
    assert.ok(validateSchedule("legacy", "2200", "0400", 10));
    assert.equal(validateSchedule("modern", "2200", "0400", 10), null);
    assert.ok(validateSchedule("modern", "0600", "0610", 30));
});

test("isInShootingHours", () => {
    const at = (h, m) => new Date(2026, 9, 28, h, m);
    assert.equal(isInShootingHours("0600", "1800", at(12, 0)), true);
    assert.equal(isInShootingHours("0600", "1800", at(19, 0)), false);
    assert.equal(isInShootingHours("2200", "0400", at(1, 0)), true);
    assert.equal(isInShootingHours(null, "1800", at(12, 0)), false);
});
