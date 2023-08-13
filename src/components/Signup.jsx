import { API } from "../API";
import { useState, useEffect } from "react";

function Signup({ handleLoginToggle }) {
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [code, setCode] = useState("");

    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [isPasswordConfirmed, setIsPasswordConfirmed] = useState(false);

    const idEventHandler = (event) => setId(event.target.value);
    const pwEventHandler = (event) => {
        setPw(event.target.value);
        const regex =
            /^(?=.*[A-Za-z])(?=.*[\d~!@#$%^&*()_+])[A-Za-z\d~!@#$%^&*()_+]{8,}$/;
        setIsPasswordValid(regex.test(event.target.value));
    };
    const pwConfirmEventHandler = (event) => {
        setPwConfirm(event.target.value);
        setIsPasswordConfirmed(pw === event.target.value);
    };
    const codeEventHandler = (event) => setCode(event.target.value);

    const RequestSignup = (event) => {
        event.preventDefault();
        const data = {
            username: id,
            password: pw,
            code,
        };

        API.signUp(data)
            .then((res) => alert(res.data.message))
            .catch((err) => alert(err.response.data.message));
    };

    return (
        <div className="SignupMain">
            <div className="SignupContent">
                <h2 className="title">
                    빌드모션 웹 모니터링
                    <br />
                    <h3 className="subtitle">회원가입</h3>
                    <br />
                </h2>

                <form className="SignupBox" onSubmit={RequestSignup}>
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
                    {!isPasswordValid && pw !== "" ? (
                        <span>
                            8글자 이상의 영문과 숫자/특수문자 조합이 필요합니다.
                        </span>
                    ) : null}

                    <input
                        type="password"
                        placeholder="비밀번호 확인"
                        value={pwConfirm}
                        onChange={pwConfirmEventHandler}
                        className="FormInput"
                    />
                    {!isPasswordConfirmed && pwConfirm !== "" ? (
                        <span>비밀번호가 일치하지 않습니다.</span>
                    ) : null}

                    <input
                        type="text"
                        placeholder="회원가입 코드"
                        value={code}
                        onChange={codeEventHandler}
                        className="FormInput"
                    />
                    <div className="button-container">
                        <button
                            type="button"
                            className="login-toggle"
                            onClick={handleLoginToggle}>
                            로그인
                        </button>
                        <button
                            className="Submit"
                            disabled={!isPasswordValid || !isPasswordConfirmed}>
                            {" "}
                            회원가입
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Signup;
