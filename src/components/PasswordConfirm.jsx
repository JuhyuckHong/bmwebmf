const PasswordConfirm = ({ password, passwordConfirm }) => {
    const classify = (password, passwordConfirm) => {
        if (password !== passwordConfirm) {
            return { color: "red", message: "비밀번호가 일치하지 않습니다" };
        } else {
            return { color: "green", message: "비밀번호 입력 일치" };
        }
    };
    const { color, message } = classify(password, passwordConfirm);
    return <span style={{ color }}>{message}</span>;
};

export default PasswordConfirm;
