const PasswordChecker = ({ password }) => {
    const classify = (password) => {
        if (password === "") {
            return {
                color: "gray",
                message: "8자 이상의 영문과 숫자 조합이 필요합니다.",
            };
        } else if (
            password.match(
                /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d~!@#$%^&*()_+]{8,}$/,
            )
        ) {
            return { color: "green", message: "사용 가능한 비밀번호입니다." };
        }
        return {
            color: "red",
            message: "8자 이상의 영문과 숫자 조합이 필요합니다.",
        };
    };
    const { color, message } = classify(password);
    return <span style={{ color }}>{message}</span>;
};

export default PasswordChecker;
