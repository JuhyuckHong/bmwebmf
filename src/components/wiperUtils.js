// 와이퍼 설정 화면 표시 규칙 (relay wiper_control.py와 같은 기준)

export const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120];

export const WIPER_ACTION_LABELS = {
    changed: "변경됨",
    unchanged: "변경 없음",
    started: "작동 시작",
    failed: "실패",
};

export const LAST_RESULT_LABELS = {
    ok: "정상 작동",
    skipped: "건너뜀",
    error: "릴레이 오류",
    unknown: "끝난 기록 없음",
};

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2, 4));

// 와이퍼가 돌아가는 동안(앞뒤 1분 여유 포함) 촬영 시간대에 걸리면 true. 촬영 시간을 모르면 걸리는 것으로 본다.
export function overlapsShooting(timeStart, timeEnd, wiperTime, durationSec = 30) {
    const valid = (v) => /^\d{4}$/.test(v ?? "");
    if (!valid(timeStart) || !valid(timeEnd) || !valid(wiperTime)) return true;
    const day = 24 * 60;
    const start = toMinutes(timeStart);
    const end = toMinutes(timeEnd);
    const margin = Math.ceil(durationSec / 60) + 1;
    const span = end >= start ? end - start : end - start + day;
    if (span + 2 * margin >= day) return true;
    const begin = (((start - margin) % day) + day) % day;
    const finish = (end + margin) % day;
    const current = toMinutes(wiperTime);
    return begin <= finish ? begin <= current && current <= finish : current >= begin || current <= finish;
}

export const nowHHMM = (now = new Date()) =>
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
