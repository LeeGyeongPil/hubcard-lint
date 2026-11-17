// 공개 타입과 예외. 라이브러리 사용자와 CLI 가 같은 모양을 쓴다.
/** 라이브러리 사용 오류. 카드 내용 문제는 예외가 아니라 진단으로 돌려준다. */
export class HubcardLintError extends Error {
    code;
    constructor(code, message, options) {
        super(message, options);
        this.name = "HubcardLintError";
        this.code = code;
    }
}
