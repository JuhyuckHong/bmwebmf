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

    .site-information {
        max-width: var(--site-info-width);
        margin-top: 5px;
        margin-bottom: 5px;
        border-radius: 0px 0px 10px 10px;

        display: grid;
        height: calc(var(--site-info-width) / 2);
        grid-template-rows: repeat(5, 1fr);
        font-size: calc(var(--site-info-width) / 21);
    }

    .row {
        width: var(--site-info-width);
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        white-space: nowrap;
        border-radius: 5px;
        padding-left: 5px;
    }

    .site-name {
        cursor: pointer;
        font-weight: 800;
        color: midnightblue;
        border-radius: 4px;
        padding: 0px 3px;
        display: inline-block;
        width: 80%;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        line-height: 1.5;
    }

    .missing-high {
        padding: 0 2px;
        color: ${props => props.theme.color.warning};
        font-weight: 800;
    }

    .ok {
        padding: 0 2px;
        color: ${props => props.theme.color.main[800]};
        font-weight: 600;
    }

    .today-total-photo {
        font-size: smaller;
    }

    .remote-status.remote-on {
        color: ${props => props.theme.color.main[800]};
        font-weight: 800;
    }

    .remote-status.remote-off {
        color: ${props => props.theme.color.highlight[900]};
        font-weight: 800;
    }

    .device-number {
        font-weight: lighter;
        margin-left: 0.5vw;
    }

    .thumbnails-individual.non-operational {
        filter: grayscale(70%);
        opacity: 0.7;
    }
`

export default ThumbnailStyle