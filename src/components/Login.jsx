import { API } from "../API";
import Cookies from "js-cookie";
import { useState } from "react";

import { TitleBox, InputFormBox, BtnBox } from "../styled-components/auth";

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
                Cookies.set("BM", "Bearer " + res.data.access_token);
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

                <InputFormBox onSubmit={RequestLogin}>
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
                </InputFormBox>
            </div>
        </div>
    );
}

export default Login;
