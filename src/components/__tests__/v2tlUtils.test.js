import test from "node:test";
import assert from "node:assert/strict";

import {
    addDays,
    buildAxis,
    buildTimelineRows,
    getDefaultRange,
    getOpacityForDate,
    mergeRows,
    monthsAgo,
    spanDays,
    trimModuleId,
} from "../v2/v2tlUtils.js";

const now = new Date(2026, 9, 29, 12, 0, 0);

test("date helpers", () => {
    assert.equal(addDays("2026-02-28", 1), "2026-03-01");
    assert.equal(spanDays("2026-10-01", "2026-10-31"), 31);
    assert.deepEqual(getDefaultRange(new Date(2026, 2, 31)), { from: "2026-02-01", to: "2026-03-31" });
    assert.equal(monthsAgo(3, now), "2026-07-29");
    assert.equal(trimModuleId("052"), "52");
});

test("opacity fades over 7 days after last verification", () => {
    assert.equal(getOpacityForDate("2026-10-19", "2026-10-20 10:00:00"), 1);
    assert.equal(getOpacityForDate("2026-10-20", "2026-10-20 10:00:00"), 1);
    assert.ok(Math.abs(getOpacityForDate("2026-10-23", "2026-10-20 10:00:00") - 4 / 7) < 1e-9);
    assert.equal(getOpacityForDate("2026-10-28", "2026-10-20 10:00:00"), 0);
    assert.equal(getOpacityForDate("2026-10-28", null), 0);
});

test("module axis rows: sort, label, bars and current fade", () => {
    const rows = [
        {
            key: "067", label: "067", last_verified_at: "2026-10-25 09:00:00",
            segments: [
                { start_date: "2026-09-01", end_date: "2026-09-10", site_name: "A", module_id: "067", is_operating: false, confidence: "high" },
                { start_date: "2026-09-11", end_date: "2026-10-29", site_name: "B", module_id: "067", is_operating: true, confidence: "medium" },
            ],
        },
        { key: "052", label: "052", segments: [{ start_date: "2026-01-01", end_date: "2026-02-01", site_name: "Z", module_id: "052" }] },
        { key: "009", label: "009", segments: [{ start_date: "2026-10-01", end_date: "2026-10-05", site_name: "C", module_id: "009" }] },
    ];
    const out = buildTimelineRows(rows, { axis: "module", dateFrom: "2026-09-01", dateTo: "2026-10-29", now });
    assert.deepEqual(out.map((r) => r.label), ["9", "52", "67"]);
    assert.equal(out[1].bars.length, 0);
    const row = out[2];
    assert.equal(row.sub, "B");
    assert.equal(row.ongoing, true);
    assert.equal(row.bars.length, 2);
    const [first, cur] = row.bars;
    assert.equal(first.left, 0);
    assert.equal(first.days, 10);
    assert.equal(first.toneIndex, 0);
    assert.equal(cur.toneIndex, 1);
    assert.equal(cur.isCurrent, true);
    assert.equal(cur.confidence, "medium");
    assert.equal(cur.end, "2026-10-29");
    assert.ok(cur.fadeStart > 0 && cur.fadeStart < 100);
    assert.ok(Math.abs(cur.left + cur.width - 100) < 1e-9);
});

test("restart gap: visual start moves to the verification date (same as the old page)", () => {
    const rows = [{
        key: "S", label: "S", last_verified_at: "2026-10-20 08:00:00",
        segments: [{ start_date: "2026-09-01", end_date: "2026-09-30", site_name: "S", module_id: "070", is_operating: true }],
    }];
    const [row] = buildTimelineRows(rows, { axis: "site", dateFrom: "2026-09-01", dateTo: "2026-10-29", now });
    assert.equal(row.label, "S");
    assert.equal(row.sub, "70");
    // 기존 화면처럼 시작(10-20)이 끝(09-30)보다 늦어지면 그리지 않는다
    assert.equal(row.bars.length, 0);

    const capped = buildTimelineRows([{
        key: "S", label: "S", last_verified_at: "2026-10-20 08:00:00",
        segments: [{ start_date: "2026-10-01", end_date: "2026-10-29", site_name: "S", module_id: "070", is_operating: true }],
    }], { axis: "site", dateFrom: "2026-09-01", dateTo: "2026-10-29", now })[0].bars[0];
    assert.equal(capped.visualEndDate, "2026-10-27");
    assert.equal(capped.ongoing, false);
    assert.equal(capped.endOpacity, 0);
});

test("load-more merge skips duplicate segments and joins adjacent ones", () => {
    const seg = (s, e) => ({ start_date: s, end_date: e, site_name: "A", module_id: "001", confidence: "high" });
    const prev = [{ key: "001", label: "001", segments: [seg("2026-10-01", "2026-10-29")] }];
    const more = [
        { key: "001", label: "001", segments: [seg("2026-09-01", "2026-09-30"), seg("2026-10-01", "2026-10-29")] },
        { key: "002", label: "002", segments: [seg("2026-09-05", "2026-09-06")] },
    ];
    const merged = mergeRows(prev, more);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].segments.length, 2);
    assert.equal(prev[0].segments.length, 1);
    const out = buildTimelineRows(merged, { axis: "module", dateFrom: "2026-09-01", dateTo: "2026-10-29", now });
    assert.equal(out[0].bars.length, 1);
    assert.equal(out[0].bars[0].days, 59);
});

test("axis months and weekends", () => {
    const axis = buildAxis("2025-12-30", "2026-01-02");
    assert.equal(axis.total, 4);
    assert.deepEqual(axis.months.map((m) => m.label), ["2025.12월", "2026.1월"]);
    assert.equal(axis.months[1].left, 50);
    assert.deepEqual(axis.days.map((d) => d.weekend), [false, false, false, false]);
    assert.equal(buildAxis("2026-10-31", "2026-11-01").days.every((d) => d.weekend), true);
});
