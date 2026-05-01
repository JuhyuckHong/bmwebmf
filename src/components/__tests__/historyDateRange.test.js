import test from "node:test";
import assert from "node:assert/strict";

import {
    formatRangeLabel,
    hasValidDateRange,
    filterHistoryDataByDateRange,
} from "../historyDateRange.js";

test("hasValidDateRange only accepts complete ordered ranges", () => {
    assert.equal(hasValidDateRange("", ""), false);
    assert.equal(hasValidDateRange("2026-05-01", ""), false);
    assert.equal(hasValidDateRange("2026-05-02", "2026-05-01"), false);
    assert.equal(hasValidDateRange("2026-05-01", "2026-05-02"), true);
});

test("formatRangeLabel renders yyyy.mm.dd boundaries", () => {
    assert.equal(formatRangeLabel("2026-05-01", "2026-05-03"), "2026.05.01 ~ 2026.05.03");
});

test("filterHistoryDataByDateRange keeps all collections in inclusive day bounds", () => {
    const source = {
        metrics: [
            { ts: "2026-04-30T23:59:59.999+09:00", temp: 10 },
            { ts: "2026-05-01T00:00:00.000+09:00", temp: 11 },
            { ts: "2026-05-02T12:00:00.000+09:00", temp: 12 },
            { ts: "2026-05-03T23:59:59.999+09:00", temp: 13 },
            { ts: "2026-05-04T00:00:00.000+09:00", temp: 14 },
        ],
        hardware_events: [
            { ts: "2026-05-01T08:00:00.000+09:00", type: "pi_model" },
            { ts: "2026-05-04T08:00:00.000+09:00", type: "pi_model" },
        ],
        config_events: [
            { ts: "2026-04-29T08:00:00.000+09:00", type: "site_name" },
            { ts: "2026-05-03T23:59:59.999+09:00", type: "site_name" },
        ],
        update_events: [
            { ts: "2026-05-02T00:00:00.000+09:00", type: "module_version" },
            { ts: "2026-05-05T00:00:00.000+09:00", type: "module_version" },
        ],
    };

    const filtered = filterHistoryDataByDateRange(source, "2026-05-01", "2026-05-03");

    assert.deepEqual(
        filtered.metrics.map((item) => item.temp),
        [11, 12, 13],
    );
    assert.deepEqual(
        filtered.hardware_events.map((item) => item.ts),
        ["2026-05-01T08:00:00.000+09:00"],
    );
    assert.deepEqual(
        filtered.config_events.map((item) => item.ts),
        ["2026-05-03T23:59:59.999+09:00"],
    );
    assert.deepEqual(
        filtered.update_events.map((item) => item.ts),
        ["2026-05-02T00:00:00.000+09:00"],
    );
});
