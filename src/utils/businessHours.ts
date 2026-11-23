export type BusinessState = 'open' | 'lunch' | 'before' | 'after' | 'weekend';

export interface BusinessStatus {
  state: BusinessState;
  /** 지금 전화 상담이 가능한 시간인지 */
  open: boolean;
  label: string;
}

// 고객센터 운영시간: 평일 09:00~18:00, 점심 12:00~13:00, 주말 휴무. (공휴일은 반영하지 않는다.)
const OPEN_MINUTES = 9 * 60;
const CLOSE_MINUTES = 18 * 60;
const LUNCH_START_MINUTES = 12 * 60;
const LUNCH_END_MINUTES = 13 * 60;

/** 한국 시간(KST) 기준으로 지금 전화 상담이 가능한지 알려준다. 접속한 기기의 시간대와 무관하다. */
export const getBusinessStatus = (date: Date = new Date()): BusinessStatus => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = read('weekday');
  const minutes = (Number(read('hour')) % 24) * 60 + Number(read('minute'));

  if (weekday === 'Sat' || weekday === 'Sun') {
    return { state: 'weekend', open: false, label: '주말 휴무 · 카톡·견적으로 남겨주세요' };
  }
  if (minutes < OPEN_MINUTES) {
    return { state: 'before', open: false, label: '오전 9시부터 상담 · 카톡·견적으로 남겨주세요' };
  }
  if (minutes >= CLOSE_MINUTES) {
    return { state: 'after', open: false, label: '운영 종료 · 카톡·견적으로 남겨주세요' };
  }
  if (minutes >= LUNCH_START_MINUTES && minutes < LUNCH_END_MINUTES) {
    return { state: 'lunch', open: false, label: '점심시간(12~13시) · 카톡·견적으로 남겨주세요' };
  }
  return { state: 'open', open: true, label: '지금 상담 가능' };
};
