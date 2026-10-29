import test from "node:test";
import assert from "node:assert/strict";

import {
    computePlanShots,
    computeSiteSummary,
    formatDeviceNumber,
    formatRecentPhoto,
} from "../siteMetrics.js";

test("computePlanShots handles normal and overnight schedules", () => {
    assert.equal(computePlanShots({ time_start: "0600", time_end: "1800", time_interval: 10 }), 72);
    assert.equal(computePlanShots({ time_start: "2200", time_end: "0200", time_interval: 30 }), 8);
    assert.equal(computePlanShots({ time_start: "0600", time_end: "0600", time_interval: 10 }), null);
});

test("formatters keep the thumbnail labels", () => {
    assert.equal(formatDeviceNumber("bmotion093"), 93);
    assert.equal(formatRecentPhoto("2026-10-29_16-58-00.jpg"), "2026/10/29 16:58:00");
    assert.equal(formatRecentPhoto("No Photo Available"), "No Photo Available");
});

test("computeSiteSummary falls back to shooting counts without a schedule", () => {
    const summary = computeSiteSummary({ shooting_count: 50, photos_count: 50 });
    assert.equal(summary.plannedShots, 50);
    assert.equal(summary.uploaded, 50);
    assert.equal(summary.missingCount, 0);
});
