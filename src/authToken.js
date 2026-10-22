import { decodeJwt } from "jose";

// 401 응답이 현재 저장된 토큰으로 보낸 요청에서 온 경우에만 로그아웃 대상
// (재로그인 직후 이전 토큰 요청의 늦은 401이 새 토큰을 지우지 않도록)
export const isCurrentTokenUnauthorized = (error, currentToken) => {
    if (error?.response?.status !== 401) return false;
    const sentToken = error?.config?.headers?.Authorization;
    return Boolean(sentToken) && sentToken === currentToken;
};

// BM 쿠키 옵션: https일 때만 secure, JWT exp를 쿠키 만료로 사용
// JS가 읽어 Authorization 헤더로 보내는 쿠키라 HttpOnly는 불가하고,
// sameSite는 심층 방어 정도이며 XSS 토큰 탈취는 막지 못한다.
export const buildAuthCookieOptions = (token, protocol) => {
    const options = {
        sameSite: "strict",
        secure: protocol === "https:",
    };
    try {
        const { exp } = decodeJwt(token);
        if (exp) options.expires = new Date(exp * 1000);
    } catch (error) {
        // exp를 읽지 못하면 세션 쿠키로 저장
    }
    return options;
};
