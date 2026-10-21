export type SpaceType =
  | "go"
  | "city"
  | "rail"
  | "utility"
  | "chance"
  | "community"
  | "tax"
  | "jail"
  | "parking"
  | "go-jail";
export type Group =
  | "levant"
  | "jordan"
  | "egypt"
  | "kuwait"
  | "algeria"
  | "oman"
  | "arabia"
  | "qatar";
export type Space = {
  id: number;
  name: string;
  arabic: string;
  type: SpaceType;
  group?: Group;
  price?: number;
  rents?: number[];
  build?: number;
  icon?: string;
};
export const GROUPS: Record<
  Group,
  { name: string; color: string; flag: string }
> = {
  levant: { name: "بلاد الشام", color: "#986c56", flag: "/flags/sy.svg?v=2" },
  jordan: { name: "الأردن وفلسطين", color: "#83c8d3", flag: "/flags/jo.svg" },
  egypt: { name: "مصر ولبنان", color: "#c577a6", flag: "/flags/eg.svg" },
  kuwait: { name: "الكويت", color: "#ec9b4b", flag: "/flags/kw.svg" },
  algeria: { name: "الجزائر", color: "#e4c355", flag: "/flags/dz.svg" },
  oman: { name: "عُمان", color: "#df7770", flag: "/flags/om.svg" },
  arabia: {
    name: "شبه الجزيرة العربية",
    color: "#73a88a",
    flag: "/flags/sa.svg",
  },
  qatar: { name: "قطر", color: "#6f8fb9", flag: "/flags/qa.svg" },
};
const city = (
  id: number,
  name: string,
  arabic: string,
  group: Group,
  price: number,
  rents: number[],
  build: number,
): Space => ({ id, name, arabic, type: "city", group, price, rents, build });
export const BOARD: Space[] = [
  { id: 0, name: "البداية", arabic: "البداية", type: "go" },
  city(1, "Damascus", "دمشق", "levant", 60, [2, 10, 30, 90, 160, 250], 50),
  { id: 2, name: "صندوق المجتمع", arabic: "صندوق المجتمع", type: "community" },
  city(3, "Aleppo", "حلب", "levant", 60, [4, 20, 60, 180, 320, 450], 50),
  {
    id: 4,
    name: "ضريبة الدخل",
    arabic: "ضريبة الدخل",
    type: "tax",
    price: 200,
  },
  {
    id: 5,
    name: "قطار الحجاز",
    arabic: "قطار الحجاز",
    type: "rail",
    price: 200,
  },
  city(6, "Amman", "عمّان", "jordan", 100, [6, 30, 90, 270, 400, 550], 50),
  { id: 7, name: "فرصة", arabic: "فرصة", type: "chance" },
  city(8, "Zarqa", "الزرقاء", "jordan", 100, [6, 30, 90, 270, 400, 550], 50),
  city(9, "Aqaba", "العقبة", "jordan", 120, [8, 40, 100, 300, 450, 600], 50),
  { id: 10, name: "زيارة السجن", arabic: "زيارة السجن", type: "jail" },
  city(11, "Cairo", "القاهرة", "egypt", 140, [10, 50, 150, 450, 625, 750], 100),
  {
    id: 12,
    name: "الطاقة الشمسية",
    arabic: "الطاقة الشمسية",
    type: "utility",
    price: 150,
  },
  city(
    13,
    "Alexandria",
    "الإسكندرية",
    "egypt",
    140,
    [10, 50, 150, 450, 625, 750],
    100,
  ),
  city(14, "matrouh", "مطروح", "egypt", 160, [12, 60, 180, 500, 700, 900], 100),
  {
    id: 15,
    name: "قطار النيل",
    arabic: "قطار النيل",
    type: "rail",
    price: 200,
  },
  city(
    16,
    "Algiers",
    "الجزائر",
    "algeria",
    180,
    [14, 70, 200, 550, 750, 950],
    100,
  ),
  { id: 17, name: "صندوق المجتمع", arabic: "صندوق المجتمع", type: "community" },
  city(18, "Sétif", "سطيف", "algeria", 180, [14, 70, 200, 550, 750, 950], 100),
  city(19, "oran", "وهران", "algeria", 200, [16, 80, 220, 600, 800, 1000], 100),
  { id: 20, name: "استراحة", arabic: "استراحة", type: "parking" },
  city(
    21,
    "Kuwait City",
    "العاصمة",
    "kuwait",
    220,
    [18, 90, 250, 700, 875, 1050],
    150,
  ),
  { id: 22, name: "فرصة", arabic: "فرصة", type: "chance" },
  city(
    23,
    "al-jahra",
    "الجهراء",
    "kuwait",
    220,
    [18, 90, 250, 700, 875, 1050],
    150,
  ),
  city(
    24,
    "al-ahmadi",
    "الأحمدي",
    "kuwait",
    240,
    [20, 100, 300, 750, 925, 1100],
    150,
  ),
  {
    id: 25,
    name: "قطار بحر العرب",
    arabic: "قطار بحر العرب",
    type: "rail",
    price: 200,
  },
  city(26, "Muscat", "مسقط", "oman", 260, [22, 110, 330, 800, 975, 1150], 150),
  city(
    27,
    "Salalah",
    "صلالة",
    "oman",
    260,
    [22, 110, 330, 800, 975, 1150],
    150,
  ),
  {
    id: 28,
    name: "شركة المياه",
    arabic: "شركة المياه",
    type: "utility",
    price: 150,
  },
  city(29, "Nizwa", "نزوى", "oman", 280, [24, 120, 360, 850, 1025, 1200], 150),
  { id: 30, name: "اذهب للسجن", arabic: "اذهب للسجن", type: "go-jail" },
  city(
    31,
    "Riyadh",
    "الرياض",
    "arabia",
    300,
    [26, 130, 390, 900, 1100, 1275],
    200,
  ),
  city(
    32,
    "Jeddah",
    "جدة",
    "arabia",
    300,
    [26, 130, 390, 900, 1100, 1275],
    200,
  ),
  { id: 33, name: "صندوق المجتمع", arabic: "صندوق المجتمع", type: "community" },
  city(
    34,
    "al-Madinah",
    "المدينة المنورة",
    "arabia",
    320,
    [28, 150, 450, 1000, 1200, 1400],
    200,
  ),
  {
    id: 35,
    name: "قطار الجزيرة",
    arabic: "قطار الجزيرة",
    type: "rail",
    price: 200,
  },
  { id: 36, name: "فرصة", arabic: "فرصة", type: "chance" },
  city(
    37,
    "doha",
    "الدوحة",
    "qatar",
    350,
    [35, 175, 500, 1100, 1300, 1500],
    200,
  ),
  {
    id: 38,
    name: "ضريبة الرفاهية",
    arabic: "ضريبة الرفاهية",
    type: "tax",
    price: 100,
  },
  city(39, "dubai", "دبي", "qatar", 400, [50, 200, 600, 1400, 1700, 2000], 200),
];
export type CardEffect =
  | "money"
  | "move"
  | "jail"
  | "escape"
  | "back"
  | "rail"
  | "utility"
  | "repairs"
  | "each";
export type Card = {
  id: string;
  title: string;
  text: string;
  effect: CardEffect;
  amount?: number;
  target?: number;
  hotel?: number;
};
export const CHANCE: Card[] = [
  {
    id: "c0",
    title: "بداية جديدة",
    text: "تقدّم إلى البداية. احصل على 200 درهم.",
    effect: "move",
    target: 0,
  },
  {
    id: "c1",
    title: "مدينة الياسمين",
    text: "تقدّم إلى دمشق. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 1,
  },
  {
    id: "c2",
    title: "القاهرة تناديك",
    text: "تقدّم إلى القاهرة. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 11,
  },
  {
    id: "c3",
    title: "رحلة إلى الخليج",
    text: "تقدّم إلى دبي. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 39,
  },
  {
    id: "c4",
    title: "الكل إلى القطار",
    text: "تقدّم إلى أقرب محطة قطار. إذا كانت مملوكة، ادفع ضعف الإيجار المعتاد.",
    effect: "rail",
  },
  {
    id: "c5",
    title: "الطريق الأجمل",
    text: "تقدّم إلى أقرب محطة قطار. إذا كانت مملوكة، ادفع ضعف الإيجار المعتاد.",
    effect: "rail",
  },
  {
    id: "c6",
    title: "طاقة المستقبل",
    text: "تقدّم إلى أقرب شركة خدمات. إذا كانت مملوكة، ادفع 10 أضعاف رمية نرد جديدة.",
    effect: "utility",
  },
  {
    id: "c7",
    title: "استثمارك يؤتي ثماره",
    text: "احصل على أرباح بقيمة 50 درهماً.",
    effect: "money",
    amount: 50,
  },
  {
    id: "c8",
    title: "قليل من الحرية",
    text: "اخرج من السجن مجاناً. احتفظ بهذه البطاقة حتى تحتاجها.",
    effect: "escape",
  },
  {
    id: "c9",
    title: "منعطف خاطئ",
    text: "ارجع ثلاث خانات واتبع التعليمات هناك.",
    effect: "back",
    amount: 3,
  },
  {
    id: "c10",
    title: "وقت مستقطع",
    text: "اذهب مباشرة إلى السجن. لا تحصل على 200 درهم.",
    effect: "jail",
  },
  {
    id: "c11",
    title: "موسم الترميم",
    text: "ادفع 25 درهماً عن كل منزل و100 عن كل فندق تملكه.",
    effect: "repairs",
    amount: 25,
    hotel: 100,
  },
  {
    id: "c12",
    title: "مخالفة سرعة",
    text: "ادفع غرامة قدرها 15 درهماً.",
    effect: "money",
    amount: -15,
  },
  {
    id: "c13",
    title: "رحلة الحجاز",
    text: "تقدّم إلى قطار الحجاز. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 5,
  },
  {
    id: "c14",
    title: "ضيافة الحي",
    text: "ادفع 50 درهماً لكل لاعب آخر.",
    effect: "each",
    amount: -50,
  },
  {
    id: "c15",
    title: "مدّخراتك تنضج",
    text: "احصل على 150 درهماً من البنك.",
    effect: "money",
    amount: 150,
  },
];
export const COMMUNITY: Card[] = [
  {
    id: "m0",
    title: "العودة إلى الديار",
    text: "تقدّم إلى البداية. احصل على 200 درهم.",
    effect: "move",
    target: 0,
  },
  {
    id: "m1",
    title: "خطأ سعيد من البنك",
    text: "احصل على 200 درهم.",
    effect: "money",
    amount: 200,
  },
  {
    id: "m2",
    title: "زيارة إلى الطبيب",
    text: "ادفع 50 درهماً.",
    effect: "money",
    amount: -50,
  },
  {
    id: "m3",
    title: "من سوق الفن",
    text: "بيعت لوحتك. احصل على 50 درهماً.",
    effect: "money",
    amount: 50,
  },
  {
    id: "m4",
    title: "قليل من الحرية",
    text: "اخرج من السجن مجاناً. احتفظ بهذه البطاقة حتى تحتاجها.",
    effect: "escape",
  },
  {
    id: "m5",
    title: "وقت مستقطع",
    text: "اذهب مباشرة إلى السجن. لا تحصل على 200 درهم.",
    effect: "jail",
  },
  {
    id: "m6",
    title: "مدّخرات العطلة",
    text: "حان موعد صندوق عطلتك. احصل على 100 درهم.",
    effect: "money",
    amount: 100,
  },
  {
    id: "m7",
    title: "استرداد ضريبي",
    text: "احصل على 20 درهماً.",
    effect: "money",
    amount: 20,
  },
  {
    id: "m8",
    title: "عيد ميلاد سعيد",
    text: "احصل على 10 دراهم من كل لاعب آخر.",
    effect: "each",
    amount: 10,
  },
  {
    id: "m9",
    title: "قليل من الأمان",
    text: "استحق تأمينك. احصل على 100 درهم.",
    effect: "money",
    amount: 100,
  },
  {
    id: "m10",
    title: "فاتورة المستشفى",
    text: "ادفع 100 درهم.",
    effect: "money",
    amount: -100,
  },
  {
    id: "m11",
    title: "رسوم المدرسة",
    text: "ادفع 50 درهماً.",
    effect: "money",
    amount: -50,
  },
  {
    id: "m12",
    title: "عمل استشاري",
    text: "احصل على أتعاب قدرها 25 درهماً.",
    effect: "money",
    amount: 25,
  },
  {
    id: "m13",
    title: "تحسين الشوارع",
    text: "ادفع 40 درهماً عن كل منزل و115 عن كل فندق تملكه.",
    effect: "repairs",
    amount: 40,
    hotel: 115,
  },
  {
    id: "m14",
    title: "مسابقة الحي",
    text: "فاز فناء بيتك بالجائزة الثانية. احصل على 10 دراهم.",
    effect: "money",
    amount: 10,
  },
  {
    id: "m15",
    title: "إرث عائلي",
    text: "احصل على 100 درهم.",
    effect: "money",
    amount: 100,
  },
];
export const ALL_CARDS = [...CHANCE, ...COMMUNITY];
export const COLORS = [
  "#218e7a",
  "#dd8054",
  "#678bc0",
  "#b37ca8",
  "#c3a347",
  "#819b61",
];
export const TOKENS = ["◆", "☀", "✦", "☾", "❋", "♜"];
export const money = (amount: number) =>
  `${amount.toLocaleString("en-US")} درهم`;
