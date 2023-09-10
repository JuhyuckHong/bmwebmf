import styled from 'styled-components';

const SortingStyle = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    white-space: pre;

    > button {
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
        font-size: clamp(0.8rem, 2.1vw, 1.0rem);
        font-weight: bold;

        transition: background-color 0.3s;

        &:hover {
            background-color: ${props => props.theme.color.main[500]};
        }
    }
`

export default SortingStyle