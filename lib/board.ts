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
export const GROUPS: Record<Group, { name: string; color: string; flag: string }> = {
  levant: { name: "The Levant", color: "#986c56", flag: "/flags/sy.svg?v=2" },
  jordan: { name: "Jordan & Palestine", color: "#83c8d3", flag: "/flags/jo.svg" },
  egypt: { name: "Egypt & Lebanon", color: "#c577a6", flag: "/flags/eg.svg" },
  kuwait: { name: "kuwait", color: "#ec9b4b", flag: "/flags/kw.svg" },
  algeria: { name: "Algeria", color: "#e4c355", flag: "/flags/dz.svg" },
  oman: { name: "Oman", color: "#df7770", flag: "/flags/om.svg" },
  arabia: { name: "Arabian Peninsula", color: "#73a88a", flag: "/flags/sa.svg" },
  qatar: { name: "Qatar", color: "#6f8fb9", flag: "/flags/qa.svg" },
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
  { id: 0, name: "Start", arabic: "البداية", type: "go" },
  city(1, "Damascus", "دمشق", "levant", 60, [2, 10, 30, 90, 160, 250], 50),
  { id: 2, name: "Community", arabic: "صندوق المجتمع", type: "community" },
  city(3, "Aleppo", "حلب", "levant", 60, [4, 20, 60, 180, 320, 450], 50),
  { id: 4, name: "Income tax", arabic: "ضريبة الدخل", type: "tax", price: 200 },
  {
    id: 5,
    name: "Hejaz Railway",
    arabic: "قطار الحجاز",
    type: "rail",
    price: 200,
  },
  city(6, "Amman", "عمّان", "jordan", 100, [6, 30, 90, 270, 400, 550], 50),
  { id: 7, name: "Chance", arabic: "فرصة", type: "chance" },
  city(8, "Zarqa", "الزرقاء", "jordan", 100, [6, 30, 90, 270, 400, 550], 50),
  city(9, "Aqaba", "العقبة", "jordan", 120, [8, 40, 100, 300, 450, 600], 50),
  { id: 10, name: "Just visiting", arabic: "زيارة السجن", type: "jail" },
  city(11, "Cairo", "القاهرة", "egypt", 140, [10, 50, 150, 450, 625, 750], 100),
  {
    id: 12,
    name: "Solar company",
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
    name: "Nile Railway",
    arabic: "قطار النيل",
    type: "rail",
    price: 200,
  },
  city(16, "Algiers", "الجزائر", "algeria", 180, [14, 70, 200, 550, 750, 950], 100),
  { id: 17, name: "Community", arabic: "صندوق المجتمع", type: "community" },
  city(18, "Sétif", "سطيف", "algeria", 180, [14, 70, 200, 550, 750, 950], 100),
  city(
    19,
    "oran",
    "وهران",
    "algeria",
    200,
    [16, 80, 220, 600, 800, 1000],
    100,
  ),
  { id: 20, name: "Free parking", arabic: "استراحة", type: "parking" },
  city(
    21,
    "Kuwait City",
    "العاصمة",
    "kuwait",
    220,
    [18, 90, 250, 700, 875, 1050],
    150,
  ),
  { id: 22, name: "Chance", arabic: "فرصة", type: "chance" },
  city(23, "al-jahra", "الجهراء", "kuwait", 220, [18, 90, 250, 700, 875, 1050], 150),
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
    name: "Arabian Sea Train",
    arabic: "قطار بحر العرب",
    type: "rail",
    price: 200,
  },
  city(
    26,
    "Muscat",
    "مسقط",
    "oman",
    260,
    [22, 110, 330, 800, 975, 1150],
    150,
  ),
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
    name: "Water company",
    arabic: "شركة المياه",
    type: "utility",
    price: 150,
  },
  city(
    29,
    "Nizwa",
    "نزوى",
    "oman",
    280,
    [24, 120, 360, 850, 1025, 1200],
    150,
  ),
  { id: 30, name: "Go to jail", arabic: "اذهب للسجن", type: "go-jail" },
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
  { id: 33, name: "Community", arabic: "صندوق المجتمع", type: "community" },
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
    name: "Arabian Railway",
    arabic: "قطار الجزيرة",
    type: "rail",
    price: 200,
  },
  { id: 36, name: "Chance", arabic: "فرصة", type: "chance" },
  city(37, "doha", "الدوحة", "qatar", 350, [35, 175, 500, 1100, 1300, 1500], 200),
  {
    id: 38,
    name: "Luxury tax",
    arabic: "ضريبة الرفاهية",
    type: "tax",
    price: 100,
  },
  city(
    39,
    "dubai",
    "دبي",
    "qatar",
    400,
    [50, 200, 600, 1400, 1700, 2000],
    200,
  ),
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
  arabicTitle: string;
  text: string;
  arabicText: string;
  effect: CardEffect;
  amount?: number;
  target?: number;
  hotel?: number;
};
export const CHANCE: Card[] = [
  {
    id: "c0",
    title: "A fresh beginning",
    arabicTitle: "بداية مبهرة",
    text: "Advance to Start. Collect 200 dirhams.",
    arabicText: "تقدم إلى البداية. احصل على 200 درهم.",
    effect: "move",
    target: 0,
  },
  {
    id: "c1",
    title: "The city of jasmine",
    arabicTitle: "مدينة الياسمين",
    text: "Advance to Damascus. Collect 200 dirhams if you pass Start.",
    arabicText: "تقدم إلى دمشق. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 1,
  },
  {
    id: "c2",
    title: "Cairo is calling",
    arabicTitle: "القاهرة تنادي",
    text: "Advance to Cairo. Collect 200 dirhams if you pass Start.",
    arabicText: "تقدم إلى القاهرة. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 11,
  },
  {
    id: "c3",
    title: "A journey south",
    arabicTitle: "رحلة جنوباً",
    text: "Advance to Sana’a. Collect 200 dirhams if you pass Start.",
    arabicText: "تقدم إلى صنعاء. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 39,
  },
  {
    id: "c4",
    title: "All aboard",
    arabicTitle: "الكل راكب",
    text: "Advance to the next railway. If owned, pay double the usual rent.",
    arabicText: "تقدم إلى السكة الحديدية التالية. إذا كانت مملوكة، ادفع ضعف الإيجار المعتادي.",
    effect: "rail",
  },
  {
    id: "c5",
    title: "The scenic route",
    arabicTitle: "الطريق المنظرة",
    text: "Advance to the next railway. If owned, pay double the usual rent.",
    arabicText: "تقدم إلى السكة الحديدية التالية. إذا كانت مملوكة، ادفع ضعف الإيجار المعتادي.",
    effect: "rail",
  },
  {
    id: "c6",
    title: "Powering the future",
    arabicTitle: "طاقة المستقبل",
    text: "Advance to the next utility. If owned, pay 10 times a fresh dice roll.",
    arabicText: "تقدم إلى الخدمة العامة التالية. إذا كانت مملوكة، ادفع 10 مرات نتيجة النرد الجديد.",
    effect: "utility",
  },
  {
    id: "c7",
    title: "Your investment pays off",
    arabicTitle: "أرباحك تتوفق",
    text: "Collect a dividend of 50 dirhams.",
    arabicText: "اخصل على توزيع بقيمة 50 درهم.",
    effect: "money",
    amount: 50,
  },
  {
    id: "c8",
    title: "A little freedom",
    arabicTitle: "قليل من الحرية",
    text: "Get out of jail free. Keep this card until you need it.",
    arabicText: "خروج من السجن مجاناً. احتفظ بهذه البطاقة حتى تحتاجها.",
    effect: "escape",
  },
  {
    id: "c9",
    title: "A wrong turn",
    arabicTitle: "خطأ في التوجيه",
    text: "Go back three spaces and follow the instructions there.",
    arabicText: "ارجع ثلاثة مسافات واتبع التعليمات هناك.",
    effect: "back",
    amount: 3,
  },
  {
    id: "c10",
    title: "Take a time-out",
    arabicTitle: "وقت للراحة",
    text: "Go directly to jail. Do not collect 200 dirhams.",
    arabicText: "اذهب مباشرة إلى السجن. لا تتلقى 200 درهم.",
    effect: "jail",
  },
  {
    id: "c11",
    title: "Renovation season",
    arabicTitle: "موسم التجديد",
    text: "Pay 25 dirhams per house and 100 per hotel you own.",
    arabicText: "اخترط 25 درهماً لكل منزل و100 لكل فندق تمتلكه.",
    effect: "repairs",
    amount: 25,
    hotel: 100,
  },
  {
    id: "c12",
    title: "A speeding ticket",
    arabicTitle: "تذنيب مروري",
    text: "Pay a fine of 15 dirhams.",
    arabicText: "اخترط غرامة قدرها 15 درهماً.",
    effect: "money",
    amount: -15,
  },
  {
    id: "c13",
    title: "Ride the Hejaz",
    arabicTitle: "رحلة الحجاز",
    text: "Advance to Hejaz Railway. Collect 200 dirhams if you pass Start.",
    arabicText: "تقدم إلى قطار الحجاز. احصل على 200 درهم إذا مررت بالبداية.",
    effect: "move",
    target: 5,
  },
  {
    id: "c14",
    title: "Host the neighborhood",
    arabicTitle: "ضيافة الحي",
    text: "Pay each other player 50 dirhams.",
    arabicText: "اخصل من كل لاعب آخر 50 درهماً.",
    effect: "each",
    amount: -50,
  },
  {
    id: "c15",
    title: "Your savings mature",
    arabicTitle: "أرباحك تنضج",
    text: "Collect 150 dirhams from the bank.",
    arabicText: "اخصل على 150 درهم من البنك.",
    effect: "money",
    amount: 150,
  },
];
export const COMMUNITY: Card[] = [
  {
    id: "m0",
    title: "Homeward bound",
    arabicTitle: "إلى الوطن",
    text: "Advance to Start. Collect 200 dirhams.",
    arabicText: "تقدم إلى البداية. احصل على 200 درهم.",
    effect: "move",
    target: 0,
  },
  {
    id: "m1",
    title: "A happy bank error",
    arabicTitle: "خطأ سعيد في البنك",
    text: "Collect 200 dirhams.",
    arabicText: "اخصل على 200 درهم.",
    effect: "money",
    amount: 200,
  },
  {
    id: "m2",
    title: "A visit to the doctor",
    arabicTitle: "زيارة إلى الطبيب",
    text: "Pay 50 dirhams.",
    arabicText: "اخترط 50 درهماً.",
    effect: "money",
    amount: -50,
  },
  {
    id: "m3",
    title: "From the art market",
    arabicTitle: "من سوق الفن",
    text: "Your artwork sells. Collect 50 dirhams.",
    arabicText: "يُباع فنك. احصل على 50 درهماً.",
    effect: "money",
    amount: 50,
  },
  {
    id: "m4",
    title: "A little freedom",
    arabicTitle: "قليل من الحرية",
    text: "Get out of jail free. Keep this card until you need it.",
    arabicText: "خروج من السجن مجاناً. احتفظ بهذه البطاقة حتى تحتاجها.",
    effect: "escape",
  },
  {
    id: "m5",
    title: "Take a time-out",
    arabicTitle: "وقت للراحة",
    text: "Go directly to jail. Do not collect 200 dirhams.",
    arabicText: "اذهب مباشرة إلى السجن. لا تتلقى 200 درهم.",
    effect: "jail",
  },
  {
    id: "m6",
    title: "Holiday savings",
    arabicTitle: "ادّخرات العطلات",
    text: "Your holiday fund matures. Collect 100 dirhams.",
    arabicText: "يتحقق صندوق عطلاتك. احصل على 100 درهم.",
    effect: "money",
    amount: 100,
  },
  {
    id: "m7",
    title: "A tax refund",
    arabicTitle: "استرداد ضريبي",
    text: "Collect 20 dirhams.",
    arabicText: "اخصل على 20 درهماً.",
    effect: "money",
    amount: 20,
  },
  {
    id: "m8",
    title: "Happy birthday",
    arabicTitle: "عيد ميلاد سعيد",
    text: "Collect 10 dirhams from each other player.",
    arabicText: "اخصل على 10 دراهم من كل لاعب آخر.",
    effect: "each",
    amount: 10,
  },
  {
    id: "m9",
    title: "A little security",
    arabicTitle: "قليل من الأمان",
    text: "Your insurance matures. Collect 100 dirhams.",
    arabicText: "يتحقق تأمينك. احصل على 100 درهم.",
    effect: "money",
    amount: 100,
  },
  {
    id: "m10",
    title: "Hospital bill",
    arabicTitle: "فاتورة المستشفى",
    text: "Pay 100 dirhams.",
    arabicText: "اخترط 100 درهماً.",
    effect: "money",
    amount: -100,
  },
  {
    id: "m11",
    title: "School fees",
    arabicTitle: "رسوم المدرسة",
    text: "Pay 50 dirhams.",
    arabicText: "اخترط 50 درهماً.",
    effect: "money",
    amount: -50,
  },
  {
    id: "m12",
    title: "Consulting work",
    arabicTitle: "عمل استشاري",
    text: "Collect a fee of 25 dirhams.",
    arabicText: "اخصل على أجر قدره 25 درهماً.",
    effect: "money",
    amount: 25,
  },
  {
    id: "m13",
    title: "Street improvements",
    arabicTitle: "تحسينات شارعية",
    text: "Pay 40 dirhams per house and 115 per hotel you own.",
    arabicText: "اخترط 40 درهماً لكل منزل و115 لكل فندق تمتلكه.",
    effect: "repairs",
    amount: 40,
    hotel: 115,
  },
  {
    id: "m14",
    title: "Neighborhood competition",
    arabicTitle: "منافسية الحي",
    text: "Your courtyard wins second prize. Collect 10 dirhams.",
    arabicText: "ساحتك تفوز بجائزة المركز الثاني. احصل على 10 دراهم.",
    effect: "money",
    amount: 10,
  },
  {
    id: "m15",
    title: "A family inheritance",
    arabicTitle: "إرث عائلي",
    text: "Collect 100 dirhams.",
    arabicText: "اخصل على 100 درهم.",
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
export const money = (amount: number) => `${amount.toLocaleString("en-US")} DH`;
