import test from "node:test";
import assert from "node:assert/strict";

import { STATUS_META, formatAgo, formatDateLabel, formatPhotoClock, parsePhotoTime } from "../v2/v2Utils.js";

test("parsePhotoTime reads photo file names", () => {
    assert.deepEqual(parsePhotoTime("2026-10-29_16-58-00.jpg"), new Date(2026, 9, 29, 16, 58, 0));
    assert.equal(parsePhotoTime("No Photo Available"), null);
});

test("formatAgo uses minutes, hours and days", () => {
    const now = new Date(2026, 9, 29, 17, 0, 0);
    assert.equal(formatAgo("2026-10-29_16-58-00.jpg", now), "2분 전");
    assert.equal(formatAgo("2026-10-29_14-00-00.jpg", now), "3시간 전");
    assert.equal(formatAgo("2026-10-27_17-00-00.jpg", now), "2일 전");
    assert.equal(formatAgo(undefined, now), "기록 없음");
});

test("date and clock labels", () => {
    const now = new Date(2026, 9, 29);
    assert.equal(formatDateLabel("2026-10-29", now), "10/29 (목)");
    assert.equal(formatDateLabel("2025-12-31.mp4", now), "2025/12/31 (수)");
    assert.equal(formatPhotoClock("2026-10-29_06-05-00.jpg"), "06:05");
});

test("every site status has a filter group", () => {
    for (const meta of Object.values(STATUS_META)) {
        assert.ok(["issue", "ok", "off"].includes(meta.group));
    }
});
