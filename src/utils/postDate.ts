const SEOUL = 'Asia/Seoul';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 게시글 날짜(ISO)를 날짜 입력칸용 YYYY-MM-DD(한국 시간 기준)로 바꾼다. 잘못된 값이면 빈 문자열. */
export const toDateInputValue = (value?: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', { timeZone: SEOUL }).format(date);
};

/** 오늘 날짜(한국 시간) YYYY-MM-DD. */
export const todayDateInputValue = (now: Date = new Date()): string => toDateInputValue(now.toISOString());

/**
 * 날짜 입력값(YYYY-MM-DD)을 저장용 ISO 시각으로 바꾼다.
 * 한국 시간 정오로 저장해 어느 시간대에서 봐도 같은 날짜로 보이게 한다. 형식이 틀리면 null.
 */
export const fromDateInputValue = (value: string): string | null => {
    if (!DATE_ONLY.test(value)) return null;
    const date = new Date(`${value}T12:00:00+09:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
