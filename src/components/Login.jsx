import { API } from "../API";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const LoginWrapper = styled.div`
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    left: 0;
    overflow: hidden;
    background: var(--bg-color);
    color: var(--text-color);

    .video-bg {
        position: absolute;
        top: 50%;
        left: 50%;
        min-width: 100%;
        min-height: 100%;
        width: auto;
        height: auto;
        transform: translate(-50%, -50%);
        object-fit: cover;
    }
`;

const LoginContainer = styled.div`
    position: relative;
    z-index: 1;
    width: 1600px;
    max-width: calc(100% - 2rem);
    margin: 1rem;
    animation: ${fadeIn} 0.6s ease-out;
`;

const BrandSection = styled.div`
    text-align: center;
    margin-bottom: 2.5rem;

    .brand-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;

        .logo {
            width: 44px;
            height: 44px;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
                filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
            }
        }

        h1 {
            font-size: 2rem;
            font-weight: 700;
            margin: 0;
            color: var(--text-color);
        }
    }

    p {
        font-size: 1rem;
        color: var(--muted-text-color);
        margin: 0;
    }
`;

const LoginCard = styled.div`
    position: relative;
    overflow: hidden;
    background:
        linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.04) 35%,
            rgba(255, 255, 255, 0.08) 70%
        ),
        linear-gradient(
            120deg,
            rgba(234, 73, 46, 0.08),
            rgba(234, 73, 46, 0)
        ),
        var(--card-bg);
    backdrop-filter: blur(24px) saturate(140%);
    -webkit-backdrop-filter: blur(24px) saturate(140%);
    border-radius: 20px;
    padding: clamp(1.75rem, 4vw, 2.75rem)
        clamp(1.5rem, 4vw, 2.25rem);
    box-shadow:
        0 25px 70px rgba(0, 0, 0, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        inset 0 0 0 1px rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    width: min(520px, 94vw);
    max-width: 640px;
    margin: 0 auto;
    color: var(--text-color);

    &::before,
    &::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    &::before {
        background: radial-gradient(
            circle at 20% 18%,
            rgba(255, 255, 255, 0.4),
            transparent 36%
        );
        opacity: 0.9;
    }

    &::after {
        background: linear-gradient(
            110deg,
            rgba(255, 255, 255, 0.25) 0%,
            rgba(255, 255, 255, 0.08) 20%,
            rgba(255, 255, 255, 0) 38%
        );
        mix-blend-mode: screen;
        opacity: 0.9;
    }
`;

const FormTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
`;

const FormSubtitle = styled.p`
    font-size: 0.9rem;
    color: var(--muted-text-color);
    margin: 0 0 1.5rem 0;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const Input = styled.input`
    height: 52px;
    width: 100%;
    font-size: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0 1rem;
    background: var(--input-bg);
    color: var(--text-color);
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder {
        color: var(--muted-text-color);
    }

    &:hover {
        border-color: var(--input-border-hover);
    }

    &:focus {
        border-color: #ea492e;
        background: var(--input-bg-focus);
        outline: none;
        box-shadow: 0 0 0 4px rgba(234, 73, 46, 0.2);
    }
`;

const SubmitButton = styled.button`
    height: 52px;
    width: 100%;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    background: #ea492e;
    color: white;
    box-shadow: 0 4px 15px rgba(234, 73, 46, 0.35);
    transition: all 0.2s ease;
    margin-top: 0.5rem;

    &:hover {
        transform: translateY(-2px);
        background: #d4402a;
        box-shadow: 0 8px 25px rgba(234, 73, 46, 0.45);
    }

    &:active {
        transform: translateY(0);
    }

    &:disabled {
        cursor: not-allowed;
        background: #e5e7eb;
        color: #9ca3af;
        box-shadow: none;
        transform: none;
    }
`;

const ToggleButton = styled.button`
    background: transparent;
    border: none;
    color: var(--muted-text-color);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.75rem;
    transition: color 0.2s ease;

    &:hover {
        color: #ea492e;
    }
`;

const ToastContainer = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    z-index: 10;
    width: calc(100% - 2rem);
    max-width: 480px;
`;

const Toast = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(234, 73, 46, 0.95);
    color: #fff;
    padding: 0.875rem 1rem;
    border-radius: 14px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    animation: ${fadeIn} 0.3s ease-out;
    gap: 0.75rem;

    span {
        font-size: 0.95rem;
        line-height: 1.4;
    }
`;

const ToastCloseButton = styled.button`
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: #fff;
    padding: 0.4rem 0.75rem;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.15s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.25);
    }
`;

function Login({ setAuth, onLoginSuccess, onSwitchToSignup }) {
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(""), 3000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    const RequestLogin = (event) => {
        event.preventDefault();
        setIsLoading(true);
        const data = {
            username: id,
            password: pw,
        };

        API.signIn(data)
            .then((res) => {
                Cookies.set("BM", "Bearer " + res.data.access_token);
                setAuth(true);
                if (onLoginSuccess) {
                    onLoginSuccess();
                }
            })
            .catch((err) => {
                const message =
                    err?.response?.data?.message ||
                    "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
                setToastMessage(message);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <LoginWrapper>
            <video
                className="video-bg"
                autoPlay
                muted
                loop
                playsInline
            >
                <source src="https://video.wixstatic.com/video/11062b_4f14b356c1df4854968cf1cc94ca98c5/1080p/mp4/file.mp4" type="video/mp4" />
            </video>

            <LoginContainer>
                <BrandSection>
                    <div className="brand-title">
                        <div className="logo">
                            <img src="/android-chrome-512x512.png" alt="BuildMotion" />
                        </div>
                        <h1>BuildMotion</h1>
                    </div>
                    <p>웹사이트 모니터링 시스템</p>
                </BrandSection>

                <LoginCard>
                    <FormTitle>로그인</FormTitle>
                    <FormSubtitle>계정 정보를 입력해주세요</FormSubtitle>

                    <Form onSubmit={RequestLogin}>
                        <Input
                            type="text"
                            placeholder="아이디"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="비밀번호"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                        />
                        <SubmitButton type="submit" disabled={isLoading}>
                            {isLoading ? "로그인 중..." : "로그인"}
                        </SubmitButton>
                        <ToggleButton
                            type="button"
                            onClick={onSwitchToSignup}>
                            계정이 없으신가요? 가입하기
                        </ToggleButton>
                    </Form>
                </LoginCard>
            </LoginContainer>
            {toastMessage && (
                <ToastContainer>
                    <Toast>
                        <span>{toastMessage}</span>
                        <ToastCloseButton
                            type="button"
                            aria-label="알림 닫기"
                            onClick={() => setToastMessage("")}
                        >
                            닫기
                        </ToastCloseButton>
                    </Toast>
                </ToastContainer>
            )}
        </LoginWrapper>
    );
}

export default Login;
