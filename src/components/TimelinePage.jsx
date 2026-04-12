import { useState, useEffect, useMemo, useCallback } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Timeline.css";

const fmt = (d) => d.toISOString().slice(0, 10);

const buildDateRange = (from, to) => {
    const dates = [];
    const cur = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while (cur <= end) {
        dates.push(fmt(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
};

const getDefaultRange = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
        from: fmt(new Date(y, m, 1)),
        to: fmt(new Date(y, m + 1, 0)),
    };
};

export default function TimelinePage() {
    const defaults = getDefaultRange();
    const [dateFrom, setDateFrom] = useState(defaults.from);
    const [dateTo, setDateTo] = useState(defaults.to);
    const [axis, setAxis] = useState("module");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const headers = { Authorization: Cookies.get("BM") };
            const res = await API.getOperationTimeline(headers, {
                date_from: dateFrom,
                date_to: dateTo,
                axis,
            });
            setData(res.data);
        } catch (err) {
            console.error("timeline fetch error", err);
            setData({ rows: [] });
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, axis]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const dates = useMemo(() => buildDateRange(dateFrom, dateTo), [dateFrom, dateTo]);

    // 년도/월 헤더 span 계산
    const yearSpans = useMemo(() => {
        const spans = [];
        for (let i = 0; i < dates.length; i++) {
            const year = dates[i].slice(0, 4);
            if (spans.length && spans[spans.length - 1].label === year) {
                spans[spans.length - 1].len++;
            } else {
                spans.push({ label: year, len: 1 });
            }
        }
        return spans;
    }, [dates]);

    const monthSpans = useMemo(() => {
        const spans = [];
        for (let i = 0; i < dates.length; i++) {
            const month = dates[i].slice(0, 7);
            const label = parseInt(dates[i].slice(5, 7), 10) + "월";
            if (spans.length && spans[spans.length - 1].key === month) {
                spans[spans.length - 1].len++;
            } else {
                spans.push({ key: month, label, len: 1 });
            }
        }
        return spans;
    }, [dates]);

    // 각 row의 segments를 날짜-인덱스 기반 merged span으로 변환
    const rowSpans = useMemo(() => {
        if (!data?.rows) return [];
        return data.rows.map((row) => {
            // dateIndex -> segment 매핑
            const cellMap = {};
            for (const seg of row.segments) {
                const s = Math.max(dates.indexOf(seg.start_date), 0);
                const e = Math.min(
                    seg.end_date > dateTo ? dates.length - 1 : dates.indexOf(seg.end_date),
                    dates.length - 1,
                );
                if (s < 0 || e < 0) continue;
                for (let i = s; i <= e; i++) {
                    cellMap[i] = seg;
                }
            }

            // 인접한 같은 segment를 merge
            const spans = [];
            let i = 0;
            while (i < dates.length) {
                const seg = cellMap[i];
                if (!seg) {
                    spans.push({ start: i, len: 1, seg: null });
                    i++;
                    continue;
                }
                const label = axis === "module" ? seg.site_name : seg.module_id;
                let j = i + 1;
                while (j < dates.length && cellMap[j] === seg) {
                    j++;
                }
                spans.push({ start: i, len: j - i, seg, label, confidence: seg.confidence });
                i = j;
            }
            return { key: row.key, label: row.label, spans };
        });
    }, [data, dates, axis, dateTo]);

    return (
        <div className="timeline-page">
            <div className="timeline-card">
                <div className="timeline-toolbar">
                    <h2 className="timeline-toolbar-title">운영 타임라인</h2>
                    <label>
                        시작
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </label>
                    <label>
                        종료
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </label>
                    <label>
                        축
                        <select value={axis} onChange={(e) => setAxis(e.target.value)}>
                            <option value="module">모듈</option>
                            <option value="site">현장</option>
                        </select>
                    </label>
                </div>

                {loading && <div className="timeline-loading">불러오는 중...</div>}

                {!loading && data && rowSpans.length === 0 && (
                    <div className="timeline-empty">해당 기간에 데이터가 없습니다.</div>
                )}

                {!loading && rowSpans.length > 0 && (
                    <div className="timeline-table-wrap">
                        <table className="timeline-table">
                            <thead>
                                <tr>
                                    <th className="timeline-corner" rowSpan={3}>
                                        {axis === "module" ? "모듈" : "현장"}
                                    </th>
                                    {yearSpans.map((s) => (
                                        <th key={s.label} colSpan={s.len} className="timeline-year">
                                            {s.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {monthSpans.map((s) => (
                                        <th key={s.key} colSpan={s.len} className="timeline-month">
                                            {s.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {dates.map((d) => {
                                        const dow = new Date(d + "T00:00:00").getDay();
                                        const isWeekend = dow === 0 || dow === 6;
                                        return (
                                            <th
                                                key={d}
                                                className={isWeekend ? "timeline-weekend" : ""}
                                                title={d}
                                            >
                                                {parseInt(d.slice(8), 10)}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {rowSpans.map((row) => (
                                    <tr key={row.key}>
                                        <th>{row.label}</th>
                                        {row.spans.map((span) =>
                                            span.seg ? (
                                                <td
                                                    key={span.start}
                                                    colSpan={span.len}
                                                    title={`${span.label} (${span.seg.start_date} ~ ${span.seg.end_date})`}
                                                >
                                                    <div
                                                        className={
                                                            "timeline-cell-segment" +
                                                            (span.confidence === "medium"
                                                                ? " confidence-medium"
                                                                : "")
                                                        }
                                                    >
                                                        {span.len > 1 ? span.label : ""}
                                                    </div>
                                                </td>
                                            ) : (
                                                <td key={span.start} colSpan={span.len} />
                                            ),
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
