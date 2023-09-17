import styled from 'styled-components';

const ThumbnailStyle = styled.div`
    width: var(--site-info-width);
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: whitesmoke;

    > img {
        width: 100%;
        height: auto;
        border-radius: 10px 10px 0 0;
        transition: transform 0.1s ease-in-out;
        cursor: pointer;

        &:hover {
            transform: scaleX(1.015) scaleY(1.015);
            border-radius: 10px 10px 0px 0px;
        }
    }

    > .site-information {
        max-width: var(--site-info-width);
        margin-top: 5px;
        margin-bottom: 5px;
        display: flex;
        flex-direction: column;
        align-items: left;
        border-radius: 0px 0px 10px 10px;
    }

    > .site-information p {
        line-height: 1;
        height: calc(var(--site-info-width) / 2);
        display: grid;
        grid-template-rows: repeat(5, 1fr);
        width: var(--site-info-width);
        font-size: calc(var(--site-info-width) / 21);
        white-space: nowrap;
        border-radius: 5px;
        padding-left: 5px;
    }
`

export default ThumbnailStyle