import test from "node:test";
import assert from "node:assert/strict";

import { getControlRowFadeState } from "./controlRowFade.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-05-01T00:00:00.000Z");

test("does not fade rows when the latest status is not ERROR", () => {
    const result = getControlRowFadeState(
        {
            last_status: "SUCCESS",
            last_attempt_time: new Date(NOW - (10 * DAY_MS)).toISOString(),
            last_success_time: new Date(NOW - (20 * DAY_MS)).toISOString(),
        },
        NOW,
    );

    assert.equal(result.fadeRatio, 0);
    assert.equal(result.isWithdrawn, false);
    assert.equal(result.rowClasses, "");
});

test("starts fading ERROR rows based on last_attempt_time after three days", () => {
    const result = getControlRowFadeState(
        {
            last_status: "ERROR",
            last_attempt_time: new Date(NOW - (5 * DAY_MS)).toISOString(),
            last_success_time: new Date(NOW - (20 * DAY_MS)).toISOString(),
        },
        NOW,
    );

    assert.equal(result.fadeRatio, 0.5);
    assert.equal(result.isWithdrawn, false);
    assert.equal(result.rowClasses, "row-error row-fading");
});

test("marks ERROR rows as withdrawn after seven days from the last attempt", () => {
    const result = getControlRowFadeState(
        {
            last_status: "ERROR",
            last_attempt_time: new Date(NOW - (8 * DAY_MS)).toISOString(),
        },
        NOW,
    );

    assert.equal(result.fadeRatio, 1);
    assert.equal(result.isWithdrawn, true);
    assert.equal(result.rowClasses, "row-withdrawn");
});

test("keeps rows unknown when there is no status and no success time", () => {
    const result = getControlRowFadeState(
        {
            last_status: null,
            last_success_time: null,
            last_attempt_time: null,
        },
        NOW,
    );

    assert.equal(result.fadeRatio, 0);
    assert.equal(result.isWithdrawn, false);
    assert.equal(result.rowClasses, "row-unknown");
});
