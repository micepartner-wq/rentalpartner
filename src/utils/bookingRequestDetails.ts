export interface BookingCustomerInfo {
  customerName: string;
  companyName: string;
  contactPhone: string;
  customerEmail: string;
}

export interface BookingSiteInfo {
  siteType: string;
  elevatorLabel: string;
}

export interface BookingRequestDetails {
  customer: BookingCustomerInfo;
  site: BookingSiteInfo;
  extraRequest: string;
}

const SECTION_HEADER_REGEX = /^\[(.+)\]$/;

const normalizeValue = (value: string) => value.trim();

export const buildBookingRequestNote = ({
  customer,
  site,
  extraRequest,
}: BookingRequestDetails) => {
  const lines = [
    `[고객 정보]`,
    `고객명: ${customer.customerName.trim()}`,
    `회사명: ${customer.companyName.trim()}`,
    `연락처: ${customer.contactPhone.trim()}`,
    `이메일: ${customer.customerEmail.trim()}`,
    ``,
    `[현장 정보]`,
    `현장 유형: ${site.siteType.trim()}`,
    `엘리베이터 여부: ${site.elevatorLabel.trim()}`,
  ];

  if (extraRequest.trim()) {
    lines.push("", `[추가 요청사항]`, extraRequest.trim());
  }

  return lines.join("\n");
};

export const parseBookingRequestNote = (
  rawNote?: string,
): BookingRequestDetails => {
  const parsed: BookingRequestDetails = {
    customer: {
      customerName: "",
      companyName: "",
      contactPhone: "",
      customerEmail: "",
    },
    site: {
      siteType: "",
      elevatorLabel: "",
    },
    extraRequest: "",
  };

  if (!rawNote?.trim()) {
    return parsed;
  }

  let currentSection = "";
  const extraRequestLines: string[] = [];

  rawNote.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      if (currentSection === "추가 요청사항" && extraRequestLines.length > 0) {
        extraRequestLines.push("");
      }
      return;
    }

    const sectionMatch = line.match(SECTION_HEADER_REGEX);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      return;
    }

    if (currentSection === "추가 요청사항") {
      extraRequestLines.push(rawLine.trimEnd());
      return;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) return;

    const key = normalizeValue(line.slice(0, separatorIndex));
    const value = normalizeValue(line.slice(separatorIndex + 1));

    if (currentSection === "고객 정보") {
      if (key === "고객명") parsed.customer.customerName = value;
      if (key === "회사명") parsed.customer.companyName = value;
      if (key === "연락처") parsed.customer.contactPhone = value;
      if (key === "이메일") parsed.customer.customerEmail = value;
      return;
    }

    if (currentSection === "현장 정보") {
      if (key === "현장 유형") parsed.site.siteType = value;
      if (key === "엘리베이터 여부") parsed.site.elevatorLabel = value;
    }
  });

  parsed.extraRequest = extraRequestLines.join("\n").trim();
  return parsed;
};
