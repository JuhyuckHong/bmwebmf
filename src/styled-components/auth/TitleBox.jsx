import styled, { keyframes } from "styled-components"

const fadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`

const TitleBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    margin-bottom: 2rem;
    animation: ${fadeInUp} 0.6s ease-out;

    > h2 {
        font-size: 1.8rem;
        font-weight: 700;
        color: #1a1a2e;
        letter-spacing: -0.02em;
        margin: 0 0 0.5rem 0;
    }

    &::after {
        content: '계정 정보를 입력해주세요';
        font-size: 0.95rem;
        color: #6b7280;
    }
`

export default TitleBox