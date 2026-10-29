import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import V2Header from "./V2Header";
import { computeSiteSummary, formatDeviceNumber, formatTime } from "../siteMetrics";
import { STATUS_META, formatAgo, readStored, writeStored } from "./v2Utils";
import "./v2.css";

const FILTERS = [
    { key: "all", label: "전체" },
    { key: "issue", label: "확인 필요" },
    { key: "ok", label: "정상" },
    { key: "off", label: "촬영 시간 외" },
];

const SORTS = [
    { key: "status", label: "상태순" },
    { key: "name", label: "이름순" },
    { key: "device", label: "모듈순" },
];

export default function V2AllSites({ admin, setAuth, thumbnails = [], siteInformation = {}, staticURLs = {} }) {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState(() => readStored("bm-v2-sort", "status"));

    const sites = useMemo(() => thumbnails.map((thumbnail) => {
        const info = siteInformation[thumbnail.site] || {};
        const summary = computeSiteSummary(info);
        return {
            site: thumbnail.site,
            label: thumbnail.site.replaceAll("_", " "),
            info,
            device: formatDeviceNumber(info.device_number),
            ...summary,
            meta: STATUS_META[summary.siteStatus] ?? STATUS_META[""],
        };
    }), [thumbnails, siteInformation]);

    const counts = useMemo(() => {
        const c = { all: sites.length, issue: 0, ok: 0, off: 0 };
        sites.forEach((s) => { c[s.meta.group] += 1; });
        return c;
    }, [sites]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = sites.filter((s) => {
            if (filter !== "all" && s.meta.group !== filter) return false;
            if (!q) return true;
            return s.label.toLowerCase().includes(q) || String(s.device) === q;
        });
        const byName = (a, b) => a.site.toUpperCase().localeCompare(b.site.toUpperCase());
        return list.sort((a, b) => {
            if (sort === "device") return (Number(a.device) || 9999) - (Number(b.device) || 9999) || byName(a, b);
            if (sort === "status") return a.meta.priority - b.meta.priority || byName(a, b);
            return byName(a, b);
        });
    }, [sites, query, filter, sort]);

    const changeSort = (key) => {
        setSort(key);
        writeStored("bm-v2-sort", key);
    };

    return (
        <div className="v2">
            <V2Header title="전체 현장" subtitle={`${sites.length}곳`} admin={admin} setAuth={setAuth} legacyPath="/all">
                <div className="v2-toolbar">
                    <input
                        className="v2-search"
                        type="search"
                        inputMode="search"
                        placeholder="현장 이름 또는 모듈 번호"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="v2-chips">
                        {FILTERS.map((f) => (
                            <button key={f.key} type="button" className={filter === f.key ? "active" : ""}
                                onClick={() => setFilter(f.key)}>
                                {f.label} <span className="v2-chip-count">{counts[f.key]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="v2-segment" role="group" aria-label="정렬">
                        {SORTS.map((s) => (
                            <button key={s.key} type="button" className={sort === s.key ? "active" : ""}
                                onClick={() => changeSort(s.key)}>{s.label}</button>
                        ))}
                    </div>
                </div>
            </V2Header>

            <main className="v2-content">
                {thumbnails.length === 0 && <p className="v2-empty">현장 목록을 불러오는 중...</p>}
                {thumbnails.length > 0 && visible.length === 0 && <p className="v2-empty">해당하는 현장이 없습니다.</p>}
                <div className="v2-grid">
                    {visible.map((s) => (
                        <button
                            key={s.site}
                            type="button"
                            className={`v2-site-card ${s.meta.tone}`}
                            onClick={() => navigate(`/v2/site/${encodeURIComponent(s.site)}`)}
                        >
                            <span className="v2-thumb">
                                {staticURLs[s.site] && <img src={staticURLs[s.site]} alt="" loading="lazy" />}
                                <span className={`v2-status ${s.meta.tone}`}>{s.meta.label}</span>
                            </span>
                            <span className="v2-site-body">
                                <span className="v2-site-title">
                                    <strong>{s.label}</strong>
                                    {s.device && <span className="v2-muted">#{s.device}</span>}
                                </span>
                                <span className="v2-site-meta">
                                    <span>최근 {formatAgo(s.info.recent_photo)}</span>
                                    <span>
                                        {formatTime(s.info.time_start) || "--:--"}~{formatTime(s.info.time_end) || "--:--"}
                                        {s.info.time_interval ? ` · ${s.info.time_interval}분` : ""}
                                    </span>
                                </span>
                                <span className="v2-site-meta">
                                    <span className={`v2-count ${s.missingClass}`}>
                                        {s.uploaded} / {s.plannedShots || "-"}장 · 누락 {s.missingCount}
                                    </span>
                                    <span className={`v2-remote ${s.info.ssh === true ? "on" : s.info.ssh === false ? "off" : ""}`}>
                                        {s.info.ssh === true ? "원격 연결" : s.info.ssh === false ? "원격 끊김" : "원격 정보 없음"}
                                    </span>
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}
