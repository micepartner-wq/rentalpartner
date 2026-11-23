import { useEffect, useState } from 'react';
import { DEFAULT_CS_CENTER_SETTINGS, getCSCenterSettings, type CSCenterSettings } from '../api/siteSettingsApi';
import { getBusinessStatus, type BusinessStatus } from '../utils/businessHours';

// 고객센터 설정은 화면이 바뀌어도 한 번만 불러온다. 실패하면 기본값(전화번호·카톡 주소)을 쓴다.
let settingsPromise: Promise<CSCenterSettings> | null = null;
const loadSettings = () => {
  settingsPromise ??= getCSCenterSettings().catch(() => DEFAULT_CS_CENTER_SETTINGS);
  return settingsPromise;
};

const STATUS_REFRESH_MS = 60_000;

/** 하단 상담 바·플로팅 상담 카드가 함께 쓰는 연락처와 운영 상태. */
export const useConsultInfo = (): CSCenterSettings & { status: BusinessStatus } => {
  const [settings, setSettings] = useState<CSCenterSettings>(DEFAULT_CS_CENTER_SETTINGS);
  const [status, setStatus] = useState<BusinessStatus>(() => getBusinessStatus());

  useEffect(() => {
    let alive = true;
    loadSettings().then((loaded) => { if (alive) setSettings(loaded); });
    const timer = window.setInterval(() => setStatus(getBusinessStatus()), STATUS_REFRESH_MS);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  return { ...settings, status };
};
