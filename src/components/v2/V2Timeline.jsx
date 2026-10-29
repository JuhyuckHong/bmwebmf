import { useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../../API";
import V2Header from "./V2Header";
import { formatDateLabel, readStored, writeStored } from "./v2Utils";
import {
    buildAxis,
    buildTimelineRows,
    getDefaultRange,
    mergeRows,
    monthsAgo,
    spanDays,
    subtractDays,
    today,
} from "./v2tlUtils";
import "./v2.css";
import "./V2Timeline.css";

const AXES = [
    { key: "module", label: "모듈별" },
    { key: "site", label: "현장별" },
];

const PRESETS = [
    { months: 1, label: "1개월" },
    { months: 3, label: "3개월" },
    { months: 6, label: "6개월" },
    { months: 12, label: "1년" },
];

const LOAD_MORE_DAYS = 30;

const barStyle = (bar) => {
    const style = { left: `${bar.left}%`, width: `${bar.width}%` };
    if (bar.isCurrent) {
        style["--v2-tl-fade-start"] = `${bar.fadeStart}%`;
        style["--v2-tl-start-alpha"] = `${Math.round((bar.startOpacity ?? 1) * 100)}%`;
        style["--v2-tl-end-alpha"] = `${Math.round(bar.endOpacity * 100)}%`;
    }
    return style;
};

const barClass = (bar) =>
    "v2-tl-bar" +
    ` tone-${bar.toneIndex}` +
    (bar.isCurrent ? " is-current" : "") +
    (bar.confidence === "medium" ? " is-medium" : "");

const rangeText = (bar) => `${bar.visualStartDate} ~ ${bar.ongoing ? "현재 운영중" : bar.visualEndDate}`;

export default function V2Timeline({ admin, setAuth }) {
    const defaults = useMemo(() => getDefaultRange(), []);
    const [inputFrom, setInputFrom] = useState(defaults.from);
    const [dateTo, setDateTo] = useState(defaults.to);
    const [dateFrom, setDateFrom] = useState(defaults.from);
    const [axis, setAxis] = useState(() => readStored("bm-v2-tl-axis", "module") === "site" ? "site" : "module");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(false);
    const [query, setQuery] = useState("");
    const [onlyCurrent, setOnlyCurrent] = useState(false);
    const [selectedKey, setSelectedKey] = useState(null);

    const todayStr = today();
    const effectiveTo = dateTo && dateTo < todayStr ? dateTo : todayStr;

    const fetchData = useCallback(async (from, to) => {
        const headers = { Authorization: Cookies.get("BM") };
        const res = await API.getOperationTimeline(headers, { date_from: from, date_to: to, axis });
        return res.data?.rows || [];
    }, [axis]);

    useEffect(() => {
        if (!inputFrom || inputFrom > effectiveTo) return undefined;
        let cancelled = false;
        setLoading(true);
        setError(false);
        setDateFrom(inputFrom);
        fetchData(inputFrom, effectiveTo).then((newRows) => {
            if (cancelled) return;
            setRows(newRows);
            setLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setRows([]);
            setError(true);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [inputFrom, effectiveTo, fetchData]);

    const loadMore = useCallback(async () => {
        if (loadingMore || loading) return;
        setLoadingMore(true);
        const newFrom = subtractDays(dateFrom, LOAD_MORE_DAYS);
        const newTo = subtractDays(dateFrom, 1);
        try {
            const moreRows = await fetchData(newFrom, newTo);
            setRows((prev) => mergeRows(prev, moreRows));
            setDateFrom(newFrom);
        } catch (err) {
            console.error("timeline load more error", err);
        } finally {
            setLoadingMore(false);
        }
    }, [dateFrom, loading, loadingMore, fetchData]);

    const changeAxis = (key) => {
        setAxis(key);
        setSelectedKey(null);
        writeStored("bm-v2-tl-axis", key);
    };

    const applyPreset = (months) => {
        setDateTo(todayStr);
        setInputFrom(monthsAgo(months));
    };

    const timelineRows = useMemo(
        () => buildTimelineRows(rows, { axis, dateFrom, dateTo: effectiveTo }),
        [rows, axis, dateFrom, effectiveTo],
    );
    const axisInfo = useMemo(() => buildAxis(dateFrom, effectiveTo), [dateFrom, effectiveTo]);
    const totalDays = spanDays(dateFrom, effectiveTo);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return timelineRows.filter((row) => {
            if (onlyCurrent && !row.ongoing) return false;
            if (!q) return true;
            return String(row.label).toLowerCase().includes(q)
                || String(row.sub || "").toLowerCase().includes(q)
                || row.bars.some((b) => String(b.label).toLowerCase().includes(q));
        });
    }, [timelineRows, query, onlyCurrent]);

    const ongoingCount = timelineRows.filter((row) => row.ongoing).length;
    const selected = selectedKey ? timelineRows.find((row) => row.key === selectedKey) : null;
    const primaryName = axis === "module" ? "모듈" : "현장";
    const secondaryName = axis === "module" ? "현장" : "모듈";
    const presetActive = (months) => dateTo >= todayStr && inputFrom === dateFrom && inputFrom === monthsAgo(months);

    return (
        <div className="v2 v2-tl-page">
            <V2Header
                title="타임라인"
                subtitle={`${dateFrom} ~ ${effectiveTo} · ${totalDays}일`}
                admin={admin}
                setAuth={setAuth}
                legacyPath="/timeline"
            >
                <div className="v2-toolbar">
                    <div className="v2-tl-dates">
                        <label className="v2-tl-date">
                            <span>시작</span>
                            <input
                                type="date"
                                value={inputFrom}
                                max={effectiveTo}
                                onChange={(e) => setInputFrom(e.target.value)}
                            />
                        </label>
                        <label className="v2-tl-date">
                            <span>종료</span>
                            <input
                                type="date"
                                value={dateTo}
                                max={todayStr}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </label>
                    </div>
                    <div className="v2-chips">
                        {PRESETS.map((p) => (
                            <button key={p.months} type="button" className={presetActive(p.months) ? "active" : ""}
                                onClick={() => applyPreset(p.months)}>
                                최근 {p.label}
                            </button>
                        ))}
                        <button type="button" onClick={loadMore} disabled={loadingMore || loading}>
                            {loadingMore ? "불러오는 중..." : `‹ 이전 ${LOAD_MORE_DAYS}일 더`}
                        </button>
                    </div>
                    <div className="v2-tl-row">
                        <div className="v2-segment" role="group" aria-label="축">
                            {AXES.map((a) => (
                                <button key={a.key} type="button" className={axis === a.key ? "active" : ""}
                                    onClick={() => changeAxis(a.key)}>{a.label}</button>
                            ))}
                        </div>
                        <div className="v2-chips v2-tl-filter">
                            <button type="button" className={onlyCurrent ? "" : "active"} onClick={() => setOnlyCurrent(false)}>
                                전체 <span className="v2-chip-count">{timelineRows.length}</span>
                            </button>
                            <button type="button" className={onlyCurrent ? "active" : ""} onClick={() => setOnlyCurrent(true)}>
                                운영중 <span className="v2-chip-count">{ongoingCount}</span>
                            </button>
                        </div>
                    </div>
                    <input
                        className="v2-search"
                        type="search"
                        inputMode="search"
                        placeholder={axis === "module" ? "모듈 번호 또는 현장 이름" : "현장 이름 또는 모듈 번호"}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </V2Header>

            <main className="v2-content">
                {inputFrom > effectiveTo && <p className="v2-empty">시작일이 종료일보다 늦습니다.</p>}
                {loading && <p className="v2-empty">불러오는 중...</p>}
                {!loading && error && <p className="v2-empty">타임라인을 불러오지 못했습니다.</p>}
                {!loading && !error && timelineRows.length === 0 && (
                    <p className="v2-empty">해당 기간에 데이터가 없습니다.</p>
                )}
                {!loading && timelineRows.length > 0 && visible.length === 0 && (
                    <p className="v2-empty">해당하는 {primaryName}이(가) 없습니다.</p>
                )}

                {!loading && visible.length > 0 && (
                    <div className="v2-tl-list">
                        <div className="v2-tl-axis v2-tl-grid" aria-hidden="true">
                            <span className="v2-tl-axis-name">{primaryName} · {secondaryName}</span>
                            <div className={`v2-tl-axis-scale${axisInfo.total <= 45 ? " show-days" : ""}`}>
                                <div className="v2-tl-months">
                                    {axisInfo.months.map((m) => (
                                        <span key={m.key} style={{ left: `${m.left}%`, width: `${m.width}%` }}>
                                            {m.width >= 8 ? m.label : ""}
                                        </span>
                                    ))}
                                </div>
                                {axisInfo.total <= 120 && (
                                    <div className="v2-tl-days">
                                        {axisInfo.days.map((d) => (
                                            <span key={d.date} className={d.weekend ? "weekend" : ""} title={d.date}>
                                                {d.day}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {visible.map((row) => (
                            <button
                                key={row.key}
                                type="button"
                                className={`v2-tl-card v2-tl-grid${row.ongoing ? " is-ongoing" : ""}`}
                                onClick={() => setSelectedKey(row.key)}
                                aria-label={`${primaryName} ${row.label} 구간 ${row.bars.length}개 자세히 보기`}
                            >
                                <span className="v2-tl-head">
                                    <strong>{axis === "module" ? `#${row.label}` : row.label}</strong>
                                    {row.sub && <span className="v2-tl-sub">{axis === "module" ? row.sub : `#${row.sub}`}</span>}
                                    {row.ongoing
                                        ? <span className="v2-status green">운영중</span>
                                        : row.hasCurrent && <span className="v2-status orange">확인 지연</span>}
                                </span>
                                <span className="v2-tl-track">
                                    {axisInfo.months.slice(1).map((m) => (
                                        <i key={m.key} className="v2-tl-tick" style={{ left: `${m.left}%` }} />
                                    ))}
                                    {row.bars.map((bar) => (
                                        <span
                                            key={bar.id}
                                            className={barClass(bar)}
                                            style={barStyle(bar)}
                                            title={`${bar.label} (${rangeText(bar)}, ${bar.days}일) ${bar.freshnessText}`}
                                        >
                                            <span className="v2-tl-bar-label">{bar.label}</span>
                                        </span>
                                    ))}
                                </span>
                                <span className="v2-tl-meta">
                                    구간 {row.bars.length}개
                                    {row.bars.length > 0 && ` · 최근 ${row.bars[row.bars.length - 1].label} ${formatDateLabel(row.bars[row.bars.length - 1].visualStartDate)}~`}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {selected && (
                <div className="v2-sheet-overlay" onClick={() => setSelectedKey(null)}>
                    <div
                        className="v2-sheet v2-tl-sheet"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-label={`${selected.label} 운영 구간`}
                    >
                        <div className="v2-sheet-handle" aria-hidden="true" />
                        <div className="v2-tl-sheet-title">
                            <strong>{axis === "module" ? `모듈 #${selected.label}` : selected.label}</strong>
                            <span className="v2-muted">
                                {selected.sub ? `현재 ${secondaryName} ${axis === "module" ? selected.sub : `#${selected.sub}`} · ` : ""}
                                {dateFrom} ~ {effectiveTo}
                            </span>
                        </div>
                        <ul className="v2-tl-seglist">
                            {[...selected.bars].reverse().map((bar) => (
                                <li key={bar.id} className="v2-tl-seg">
                                    <span className={`v2-tl-swatch tone-${bar.toneIndex}${bar.confidence === "medium" ? " is-medium" : ""}`} />
                                    <span className="v2-tl-seg-body">
                                        <span className="v2-tl-seg-top">
                                            <strong>{axis === "module" ? bar.label : `모듈 #${bar.label}`}</strong>
                                            <span className="v2-tl-seg-days">{bar.days}일</span>
                                        </span>
                                        <span className="v2-tl-seg-range">
                                            {formatDateLabel(bar.visualStartDate)} ~ {bar.ongoing ? "현재 운영중" : formatDateLabel(bar.visualEndDate)}
                                        </span>
                                        {(bar.rawStart !== bar.visualStartDate || bar.rawEnd !== bar.visualEndDate) && (
                                            <span className="v2-muted">기록 구간 {bar.rawStart} ~ {bar.rawEnd}</span>
                                        )}
                                        <span className="v2-tl-tags">
                                            {bar.isCurrent && <span className="v2-status green">현재 구간</span>}
                                            {bar.confidence === "medium" && <span className="v2-status orange">추정 (신뢰도 중간)</span>}
                                            {(bar.start !== bar.visualStartDate || bar.end !== bar.visualEndDate) && (
                                                <span className="v2-status">범위 밖으로 이어짐</span>
                                            )}
                                        </span>
                                        <span className="v2-muted">{bar.freshnessText}</span>
                                    </span>
                                </li>
                            ))}
                            {selected.bars.length === 0 && <li className="v2-empty">이 기간에 구간이 없습니다.</li>}
                        </ul>
                        <button type="button" className="v2-menu-close" onClick={() => setSelectedKey(null)}>
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
