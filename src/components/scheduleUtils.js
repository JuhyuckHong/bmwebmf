// 모듈의 촬영 목록은 HHMM 정수에 간격을 더하는 방식이라 40분 이하 또는 60분만 시각이 맞는다
export const INTERVAL_OPTIONS = [...Array.from({ length: 40 }, (_, i) => i + 1), 60];

export const SCHEDULE_STATUS_LABELS = {
    pending: "반영 예정",
    applied: "반영 완료",
    failed: "실패",
};

export const toTimeInput = (hhmm) => (hhmm && hhmm.length >= 4 ? `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}` : "");
export const toHHMM = (value) => value.replace(":", "");
const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2, 4));

export function validateSchedule(type, timeStart, timeEnd, interval) {
    if (!/^\d{4}$/.test(timeStart) || !/^\d{4}$/.test(timeEnd)) return "시작·종료 시각을 입력해 주세요.";
    if (timeStart === timeEnd) return "시작과 종료 시각이 같습니다.";
    if (timeStart > timeEnd && type !== "modern") return "레거시 모듈은 자정을 넘는 촬영 시간대를 지원하지 않습니다.";
    let span = toMinutes(timeEnd) - toMinutes(timeStart);
    if (span < 0) span += 24 * 60;
    if (span < interval) return "촬영 시간대가 간격보다 짧습니다.";
    return null;
}

export function isInShootingHours(timeStart, timeEnd, now = new Date()) {
    if (!timeStart || !timeEnd) return false;
    const current = now.getHours() * 60 + now.getMinutes();
    const start = toMinutes(timeStart);
    const end = toMinutes(timeEnd);
    return start <= end ? start <= current && current <= end : current >= start || current <= end;
}
