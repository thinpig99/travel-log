export const PHRASE_KO = ['안녕하세요', '감사합니다', '실례합니다', '이거 주세요', '얼마예요?', '화장실은 어디예요?', '계산해 주세요', '영어 메뉴 있나요?'];

export const LANG_NAME: Record<string, string> = {
  ja: '일본어', zh: '중국어', en: '영어', fr: '프랑스어', es: '스페인어', de: '독일어', it: '이탈리아어', th: '태국어', vi: '베트남어',
};

// [현지어, 한글 발음]
export const PHRASES: Record<string, [string, string][]> = {
  ja: [
    ['こんにちは', '곤니치와'], ['ありがとうございます', '아리가토 고자이마스'], ['すみません', '스미마센'], ['これをください', '고레오 쿠다사이'],
    ['いくらですか', '이쿠라 데스카'], ['トイレはどこですか', '토이레와 도코 데스카'], ['お会計お願いします', '오카이케 오네가이시마스'], ['英語のメニューはありますか', '에이고노 메뉴와 아리마스카'],
  ],
  zh: [
    ['你好', '니하오'], ['谢谢', '셰셰'], ['不好意思', '뿌하오이쓰'], ['我要这个', '워 야오 쩌거'],
    ['多少钱?', '뚸사오 첸'], ['洗手间在哪里?', '시서우젠 짜이 나리'], ['买单', '마이단'], ['有英文菜单吗?', '여우 잉원 차이단 마'],
  ],
  en: [
    ['Hello', ''], ['Thank you', ''], ['Excuse me', ''], ["I'd like this, please", ''],
    ['How much is it?', ''], ['Where is the restroom?', ''], ['Check, please', ''], ['Do you have an English menu?', ''],
  ],
  fr: [
    ['Bonjour', '봉주르'], ['Merci', '메르시'], ['Excusez-moi', '엑스퀴제 무아'], ['Je voudrais ceci', '주 부드레 스시'],
    ["C'est combien ?", '세 콩비앙'], ['Où sont les toilettes ?', '우 송 레 투알레트'], ["L'addition, s'il vous plaît", '라디시옹 실 부 플레'], ['Vous avez un menu en anglais ?', '부 자베 앙 므뉘 앙 앙글레'],
  ],
  es: [
    ['Hola', '올라'], ['Gracias', '그라시아스'], ['Perdón', '페르돈'], ['Quiero esto, por favor', '키에로 에스토 포르 파보르'],
    ['¿Cuánto cuesta?', '콴토 쿠에스타'], ['¿Dónde está el baño?', '돈데 에스타 엘 바뇨'], ['La cuenta, por favor', '라 쿠엔타 포르 파보르'], ['¿Tienen menú en inglés?', '티에넨 메누 엔 잉글레스'],
  ],
  de: [
    ['Hallo', '할로'], ['Danke', '당케'], ['Entschuldigung', '엔트슐디궁'], ['Ich hätte gern das', '이히 헤테 게른 다스'],
    ['Wie viel kostet das?', '비 필 코스테트 다스'], ['Wo ist die Toilette?', '보 이스트 디 토일레테'], ['Die Rechnung, bitte', '디 레히눙 비테'], ['Haben Sie eine englische Speisekarte?', '하벤 지 아이네 엥글리셰 슈파이제카르테'],
  ],
  it: [
    ['Buongiorno', '본조르노'], ['Grazie', '그라치에'], ['Mi scusi', '미 스쿠지'], ['Vorrei questo', '보레이 쿠에스토'],
    ['Quanto costa?', '콴토 코스타'], ["Dov'è il bagno?", '도베 일 바뇨'], ['Il conto, per favore', '일 콘토 페르 파보레'], ['Avete un menù in inglese?', '아베테 운 메누 인 잉글레제'],
  ],
  th: [
    ['สวัสดีครับ/ค่ะ', '사왓디 캅/카'], ['ขอบคุณครับ/ค่ะ', '콥쿤 캅/카'], ['ขอโทษครับ/ค่ะ', '코톳 캅/카'], ['เอาอันนี้', '아오 안니'],
    ['เท่าไหร่', '타오라이'], ['ห้องน้ำอยู่ที่ไหน', '헝남 유 티나이'], ['เช็คบิล', '첵빈'], ['มีเมนูภาษาอังกฤษไหม', '미 메누 파사 앙끄릿 마이'],
  ],
  vi: [
    ['Xin chào', '신 짜오'], ['Cảm ơn', '깜 언'], ['Xin lỗi', '신 로이'], ['Cho tôi cái này', '쪼 또이 까이 나이'],
    ['Bao nhiêu tiền?', '바오 니에우 띠엔'], ['Nhà vệ sinh ở đâu?', '냐 베 신 어 다우'], ['Tính tiền', '띤 띠엔'], ['Có thực đơn tiếng Anh không?', '꼬 특 던 띠엥 아잉 콩'],
  ],
};

export const WEATHER: Record<number, string> = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림', 45: '안개', 48: '안개',
  51: '이슬비', 53: '이슬비', 55: '이슬비', 56: '어는 이슬비', 57: '어는 이슬비',
  61: '비', 63: '비', 65: '강한 비', 66: '어는 비', 67: '어는 비',
  71: '눈', 73: '눈', 75: '많은 눈', 77: '싸락눈', 80: '소나기', 81: '소나기', 82: '강한 소나기',
  85: '눈 소나기', 86: '눈 소나기', 95: '뇌우', 96: '뇌우와 우박', 99: '뇌우와 우박',
};
