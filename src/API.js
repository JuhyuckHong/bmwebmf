import axios from "axios";

// axios에 baseURL, header, cors 설정 추가
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {},
    withCredentials: false,
});

// API 목록
export const API = {
    // 회원가입
    signUp: (body) => api.post("/signup", body),
    // 로그인
    signIn: (body) => api.post("/login", body),
    // 사용자 토큰 확인
    auth: (headers) => api.get("/auth", { headers }),
    // Thumbnail 목록 조회
    getThumbnails: (headers) => api.get("/thumbnails", { headers }),
    // 사진 조회 date: YYYY-MM-DD, time: hh-mm-ss
    getImage: (headers, site, date, time) => api.get(`/image/${site}/${date}/${time}`, { headers }),
};
