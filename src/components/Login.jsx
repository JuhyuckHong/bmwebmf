import { API } from "../API";
import cookie from "react-cookies";
import { useState } from "react";
import styled from "styled-components"

import { TitleBox } from '../styled-components/auth';

// const TitleBox = styled.div`
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     width: 40vw;
//     height: 20vh;
//     min-width: ${props => props.theme.box.width_min};
//     font-size: clamp(1rem, 2vw, 1.2rem);
//     border-radius: ${props => props.theme.box.border_radius};
//     background-color: white;
//     /* box-shadow: ${props => props.theme.box.shadow}; */
//     margin: ${props => props.theme.layout.space.default};

//     > .ci {
//         width: 300px;
//         height: 250px;
//         background-image: url("/buildMotion_ci.jpeg");
//         background-size: contain;
//         background-repeat: no-repeat;
//         background-position: center;
//     }
//     > h2 {
//         font-size: clamp(1.4rem, 2.2vw, 1.8rem);
//         color: ${props => props.theme.color.main[600]};
//         letter-spacing: ${props => props.theme.font.letter_space};
//     }
// `

const LoginBox = styled.form`
    min-width: ${props => props.theme.box.width_min};
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    margin: ${props => props.theme.layout.space.default};
    gap: ${props => props.theme.layout.space.default};

    > input {
        height: 54px;
        width: 90%;
        font-size: clamp(1rem, 2vw, 1.2rem);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: ${props => props.theme.box.border_radius};
        box-shadow: ${props => props.theme.box.shadow};
        text-indent: ${props => props.theme.layout.space.xs};
        &:focus {
            border: none;
            outline: 2px solid ${props => props.theme.color.main[100]};
        }
    }
`

const BtnBox = styled.div`
    width: 90%;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.layout.space.sm};
    margin-top: ${props => props.theme.layout.space.sm};

    > button {
        cursor: pointer;
        height: 48px;
        border: none;
        border-radius: ${props => props.theme.box.border_radius};
        flex: 1;
        background-color: ${props => props.theme.color.main[400]};
        color: white;
        font-size: clamp(1rem, 2vw, 1.2rem);
        transition: background-color 0.3s ease;
        &:hover {
            background-color: ${props => props.theme.color.main[200]};
        }
    }
`



function Login({ setAuth, handleLoginToggle }) {
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const idEventHandler = (event) => setId(event.target.value);
    const pwEventHandler = (event) => setPw(event.target.value);

    const RequestLogin = (event) => {
        event.preventDefault();
        const data = {
            username: id,
            password: pw,
        };

        API.signIn(data)
            .then((res) => {
                cookie.save("BM", "Bearer " + res.data.access_token);
                alert(res.data.message);
                setAuth(true);
            })
            .catch((err) => {
                alert(err.response.data.message);
            });
    };

    return (
        <div className="LoginMain">
            <div className="LoginContent">
                <TitleBox>
                    <div className="ci"></div>
                    <h2>웹 모니터링 로그인</h2>
                </TitleBox>

                <LoginBox>
                    <input
                        type="text"
                        placeholder="아이디"
                        value={id}
                        onChange={idEventHandler}
                        className="FormInput"
                    />

                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={pw}
                        onChange={pwEventHandler}
                        className="FormInput"
                    />
                    <BtnBox>
                        <button
                            type="button"
                            className="login-toggle"
                            onClick={handleLoginToggle}>
                            {" "}
                            가입하기{" "}
                        </button>
                        <button className="Submit"> 로그인 </button>
                    </BtnBox>
                </LoginBox>
            </div>
        </div>
    );
}

export default Login;
