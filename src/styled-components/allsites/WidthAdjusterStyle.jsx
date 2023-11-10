import styled from "styled-components"

const WidthAdjusterStyle = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    white-space: pre;

    > .title {
        font-size: clamp(0.9rem, 2.5vw, 1.2rem);
        font-weight: bold;
    }
    > .adjuster {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    > .adjuster > button {
        display: flex;
        justify-content: center;
        align-items: center;

        height: 30px;
        cursor: pointer;
        padding: 8px 10px;
        margin: 0 5px;
        border: none;
        border-radius: ${props => props.theme.button.border_radius.sm};
        background-color: ${props => props.theme.color.main[800]};
        color: ${props => props.theme.color.highlight[50]};
        font-size: clamp(0.5rem, 2.1vw, 0.8rem);
        font-weight: bold;

        transition: background-color 0.3s;

        &:hover {
            background-color: ${props => props.theme.color.main[500]};
        }
    }
`

export default WidthAdjusterStyle