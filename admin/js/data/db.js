// Illustrative mock data, generated deterministically. No real customers, emails or orders.
// Shapes follow the legacy endpoints described in the discovery report so the prototype
// exercises the same enums (order status 3 = paid / 1 = not completed, productType 1/3/6, ...).

let seed = 20261012;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const TODAY = new Date("2026-10-13T09:00:00");
const daysAgo = (d, h = int(8, 22)) => {
  const x = new Date(TODAY);
  x.setDate(x.getDate() - d);
  x.setHours(h, int(0, 59), 0, 0);
  return x.toISOString();
};

export const COLORS = ["var(--coral)", "var(--yellow)", "var(--sky)", "var(--green)", "var(--pink)", "var(--orange)", "var(--teal)", "var(--lilac)"];

const FIRST = [
  ["محمد", "Mohamed"], ["سارة", "Sara"], ["أحمد", "Ahmed"], ["نورة", "Noura"], ["خالد", "Khaled"], ["ريم", "Reem"],
  ["عبدالله", "Abdullah"], ["هند", "Hind"], ["فهد", "Fahad"], ["لمى", "Lama"], ["يوسف", "Youssef"], ["مريم", "Maryam"],
  ["عمر", "Omar"], ["دانة", "Dana"], ["سلطان", "Sultan"], ["جود", "Joud"], ["ماجد", "Majed"], ["أمل", "Amal"],
];
const LAST = [
  ["العتيبي", "Alotaibi"], ["الشمري", "Alshammari"], ["القحطاني", "Alqahtani"], ["الحربي", "Alharbi"], ["الزهراني", "Alzahrani"],
  ["المصري", "Elmasry"], ["الدوسري", "Aldosari"], ["السيد", "Elsayed"], ["الغامدي", "Alghamdi"], ["حسن", "Hassan"],
];
function person(i) {
  const f = FIRST[i % FIRST.length];
  const l = LAST[(i * 7) % LAST.length];
  return { ar: `${f[0]} ${l[0]}`, en: `${f[1]} ${l[1]}`, initials: f[1][0] + l[1][0] };
}

export const categories = [
  { id: 1, name: { ar: "القيادة", en: "Leadership" }, parentId: null, courses: 0 },
  { id: 2, name: { ar: "الإدارة", en: "Management" }, parentId: null, courses: 0 },
  { id: 3, name: { ar: "التسويق", en: "Marketing" }, parentId: null, courses: 0 },
  { id: 4, name: { ar: "الموارد البشرية", en: "Human resources" }, parentId: null, courses: 0 },
  { id: 5, name: { ar: "المالية", en: "Finance" }, parentId: null, courses: 0 },
  { id: 6, name: { ar: "التسويق الرقمي", en: "Digital marketing" }, parentId: 3, courses: 0 },
  { id: 7, name: { ar: "إدارة المشاريع", en: "Project management" }, parentId: 2, courses: 0 },
  { id: 8, name: { ar: "الجودة", en: "Quality" }, parentId: 2, courses: 0 },
  { id: 9, name: { ar: "التوظيف", en: "Recruitment" }, parentId: 4, courses: 0 },
  { id: 10, name: { ar: "المهارات الشخصية", en: "Soft skills" }, parentId: null, courses: 0 },
  { id: 11, name: { ar: "ريادة الأعمال", en: "Entrepreneurship" }, parentId: null, courses: 0 },
  { id: 12, name: { ar: "سلاسل الإمداد", en: "Supply chain" }, parentId: 2, courses: 0 },
  { id: 13, name: { ar: "خدمة العملاء", en: "Customer service" }, parentId: 10, courses: 0 },
];

export const instructors = Array.from({ length: 14 }, (_, i) => {
  const p = person(i + 40);
  return {
    id: 300 + i,
    name: { ar: `د. ${p.ar}`, en: `Dr. ${p.en}` },
    initials: p.initials,
    title: pick([{ ar: "مستشار قيادة", en: "Leadership consultant" }, { ar: "خبير تسويق", en: "Marketing expert" }, { ar: "مدرب معتمد", en: "Certified trainer" }, { ar: "أستاذ إدارة", en: "Management professor" }]),
    courses: 0,
    students: 0,
    rating: (4 + rnd()).toFixed(1),
    active: rnd() > 0.15,
  };
});

const COURSE_TITLES = [
  ["القيادة التحويلية", "Transformational leadership", 1],
  ["إدارة الفرق عن بعد", "Managing remote teams", 2],
  ["أساسيات التسويق الرقمي", "Digital marketing fundamentals", 6],
  ["إدارة المشاريع الاحترافية PMP", "Professional project management (PMP)", 7],
  ["التخطيط الاستراتيجي", "Strategic planning", 2],
  ["مهارات التفاوض", "Negotiation skills", 10],
  ["إدارة الموارد البشرية الحديثة", "Modern HR management", 4],
  ["التحليل المالي لغير الماليين", "Finance for non-finance managers", 5],
  ["تسويق المحتوى", "Content marketing", 6],
  ["الذكاء العاطفي في العمل", "Emotional intelligence at work", 10],
  ["إدارة الجودة الشاملة", "Total quality management", 8],
  ["مقابلات التوظيف الفعالة", "Effective hiring interviews", 9],
  ["ريادة الأعمال والشركات الناشئة", "Entrepreneurship and startups", 11],
  ["إدارة سلاسل الإمداد", "Supply chain management", 12],
  ["خدمة العملاء المتميزة", "Customer service excellence", 13],
  ["القيادة الموقفية", "Situational leadership", 1],
  ["إدارة التغيير", "Change management", 2],
  ["التسويق عبر وسائل التواصل", "Social media marketing", 6],
  ["إعداد الموازنات", "Budget preparation", 5],
  ["إدارة الوقت والأولويات", "Time and priority management", 10],
  ["تقييم الأداء الوظيفي", "Performance appraisal", 4],
  ["الإدارة الرشيقة Agile", "Agile management", 7],
  ["بناء العلامة التجارية", "Brand building", 3],
  ["مهارات العرض والإلقاء", "Presentation skills", 10],
  ["دبلوم القيادة التنفيذية", "Executive leadership diploma", 1],
  ["دبلوم الموارد البشرية", "HR professional diploma", 4],
  ["دبلوم التسويق الرقمي", "Digital marketing diploma", 6],
  ["حل المشكلات واتخاذ القرار", "Problem solving and decisions", 10],
  ["إدارة المخاطر", "Risk management", 2],
  ["تحليلات الموارد البشرية", "HR analytics", 4],
  ["التسويق بالبريد الإلكتروني", "Email marketing", 6],
  ["حوكمة الشركات", "Corporate governance", 2],
  ["قيادة الاجتماعات", "Leading meetings", 1],
  ["تجربة العميل", "Customer experience", 13],
  ["المبيعات الاستشارية", "Consultative selling", 3],
  ["التفكير التصميمي", "Design thinking", 11],
];

export const courses = COURSE_TITLES.map(([ar, en, cat], i) => {
  const isDiploma = ar.startsWith("دبلوم");
  const price = isDiploma ? pick([1890, 2450, 2990]) : pick([0, 149, 199, 249, 299, 349, 449, 590]);
  const ins = instructors[i % instructors.length];
  const students = int(40, 4200);
  const status = i % 9 === 5 ? "draft" : i % 13 === 7 ? "archived" : "published";
  const c = {
    id: 380 + i,
    title: { ar, en },
    categoryId: cat,
    type: isDiploma ? "diploma" : price === 0 ? "free" : "course",
    price,
    originalPrice: price ? Math.round(price * pick([1, 1, 1.25, 1.4])) : 0,
    status,
    instructorId: ins.id,
    students,
    revenue: price * Math.round(students * (0.35 + rnd() * 0.4)),
    rating: (3.8 + rnd() * 1.2).toFixed(1),
    ratings: int(8, 640),
    units: int(4, 12),
    lessons: 0,
    hours: int(3, 40),
    certificates: Math.round(students * (0.2 + rnd() * 0.4)),
    updatedAt: daysAgo(int(0, 120)),
    color: COLORS[i % COLORS.length],
    language: rnd() > 0.85 ? "en" : "ar",
  };
  c.lessons = c.units * int(3, 6);
  categories.find((x) => x.id === cat).courses++;
  ins.courses++;
  ins.students += students;
  return c;
});

export const packages = [
  ["حزمة القائد الشامل", "Complete leader bundle"],
  ["دبلوم الإدارة المتكامل", "Integrated management diploma"],
  ["مسار التسويق الرقمي", "Digital marketing track"],
  ["حزمة الموارد البشرية", "HR essentials bundle"],
  ["مسار ريادة الأعمال", "Entrepreneur track"],
  ["حزمة المهارات الشخصية", "Soft skills bundle"],
  ["دبلوم إدارة المشاريع", "Project management diploma"],
  ["حزمة المدير الجديد", "New manager bundle"],
].map(([ar, en], i) => {
  const items = Array.from({ length: int(3, 8) }, (_, k) => courses[(i * 5 + k * 3) % courses.length].id);
  const unique = [...new Set(items)];
  const sum = unique.reduce((s, id) => s + courses.find((c) => c.id === id).price, 0) || 625;
  return {
    id: i + 1,
    title: { ar, en },
    courseIds: unique,
    price: Math.round(sum * 0.7),
    coursesPrice: sum,
    status: i === 6 ? "draft" : "published",
    revenue: int(8000, 90000),
    students: int(30, 900),
    isDiploma: ar.startsWith("دبلوم"),
    color: COLORS[(i + 3) % COLORS.length],
  };
});

export const customers = Array.from({ length: 140 }, (_, i) => {
  const p = person(i);
  return {
    id: 10500 + i * 37,
    name: { ar: p.ar, en: p.en },
    initials: p.initials,
    email: `student${String(i + 1).padStart(3, "0")}@example.com`,
    phone: `+9665${String(10000000 + i * 7919).slice(0, 8)}`,
    country: pick(["SA", "SA", "SA", "EG", "AE", "KW", "JO"]),
    confirmed: rnd() > 0.13,
    joinedAt: daysAgo(int(1, 900)),
    lastSeen: daysAgo(int(0, 60)),
    orders: 0,
    spent: 0,
    enrollments: [],
    certificates: int(0, 4),
    status: i % 31 === 4 ? "suspended" : "active",
    segment: pick(["new", "loyal", "atRisk", "corporate"]),
  };
});

const GATEWAYS = ["stripe", "tamara", "applepay", "bank", "mada"];
export const GATEWAY_LABEL = {
  stripe: { ar: "بطاقة (Stripe)", en: "Card (Stripe)" },
  tamara: { ar: "تمارا", en: "Tamara" },
  applepay: { ar: "Apple Pay", en: "Apple Pay" },
  bank: { ar: "تحويل بنكي", en: "Bank transfer" },
  mada: { ar: "مدى", en: "mada" },
  free: { ar: "مجاني", en: "Free" },
};

export const coupons = Array.from({ length: 48 }, (_, i) => {
  const code = ["MASTERY", "LEAD", "HR", "SALE", "VIP", "AFF", "BANK", "GIFT"][i % 8] + (10 + i * 3);
  const reason = [1, 2, 3, 4, 5, 6, 7][i % 7];
  const start = int(10, 200);
  return {
    id: 5400 + i,
    code,
    percent: pick([10, 15, 20, 25, 30, 50, 100]),
    reason,
    active: i % 6 !== 3,
    startsAt: daysAgo(start),
    endsAt: daysAgo(start - int(30, 260)),
    minTotal: pick([0, 0, 100, 200]),
    maxDiscount: pick([null, 150, 300]),
    usageLimit: pick([null, 50, 100, 500]),
    used: int(0, 380),
    scope: pick(["all", "category", "course", "package"]),
    affiliateId: i % 5 === 0 ? 700 + (i % 30) : null,
  };
});
export const COUPON_REASON = {
  1: { label: { ar: "دورة ضمن عرض", en: "Course in an offer" }, confirmed: true },
  2: { label: { ar: "تحويل بنكي", en: "Bank transfer" }, confirmed: true },
  3: { label: { ar: "بطلب من الإدارة", en: "Admin request" }, confirmed: true },
  4: { label: { ar: "سبب 4", en: "Reason 4" }, confirmed: false },
  5: { label: { ar: "سبب 5", en: "Reason 5" }, confirmed: false },
  6: { label: { ar: "سبب 6", en: "Reason 6" }, confirmed: false },
  7: { label: { ar: "سبب 7", en: "Reason 7" }, confirmed: false },
};

// Orders: status 3 = paid, 1 = not completed (abandoned). Refund states are new-admin states.
export const orders = Array.from({ length: 320 }, (_, i) => {
  const id = 1042 - i;
  const cust = customers[(i * 11) % customers.length];
  const nItems = rnd() > 0.85 ? 2 : 1;
  const items = Array.from({ length: nItems }, (_, k) => {
    const r = rnd();
    if (r < 0.12) {
      const p = packages[(i + k) % packages.length];
      return { productType: 6, productId: p.id, title: p.title, price: p.price };
    }
    if (r < 0.2) return { productType: 3, productId: 900 + (i % 8), title: { ar: "جلسة استشارية - قيادة", en: "Consultation session - leadership" }, price: pick([350, 500, 750]) };
    const c = courses[(i * 3 + k * 7) % courses.length];
    return { productType: 1, productId: c.id, title: c.title, price: c.price };
  });
  const subtotal = items.reduce((s, x) => s + x.price, 0);
  const coupon = rnd() > 0.72 ? coupons[i % coupons.length] : null;
  const discount = coupon ? Math.min(Math.round((subtotal * coupon.percent) / 100), coupon.maxDiscount ?? Infinity) : 0;
  const total = Math.max(0, subtotal - discount);
  let status = rnd() > 0.28 ? "paid" : "pending";
  if (status === "paid" && i % 23 === 2) status = "refunded";
  if (status === "paid" && i % 37 === 5) status = "partially_refunded";
  if (status === "pending" && i % 4 === 0) status = "failed";
  const gateway = total === 0 ? "free" : pick(GATEWAYS);
  const o = {
    id,
    number: `ORD-${id}`,
    customerId: cust.id,
    items,
    subtotal,
    discount,
    total,
    fee: total ? Math.round(total * 0.0275 * 100) / 100 : 0,
    couponId: coupon && discount ? coupon.id : null,
    status,
    legacyStatus: status === "pending" || status === "failed" ? 1 : 3,
    gateway,
    createdAt: daysAgo(Math.floor(i / 4), int(7, 23)),
    affiliateId: rnd() > 0.85 ? 700 + (i % 30) : null,
  };
  if (o.status !== "pending" && o.status !== "failed") {
    cust.orders++;
    cust.spent += total;
    for (const it of items) if (it.productType === 1 && !cust.enrollments.includes(it.productId)) cust.enrollments.push(it.productId);
  }
  return o;
});

export const ORDER_STATUS = {
  paid: { label: { ar: "مدفوع", en: "Paid" }, tone: "success" },
  pending: { label: { ar: "غير مكتمل", en: "Not completed" }, tone: "warning" },
  failed: { label: { ar: "فشل الدفع", en: "Payment failed" }, tone: "danger" },
  refunded: { label: { ar: "مسترد", en: "Refunded" }, tone: "neutral" },
  partially_refunded: { label: { ar: "مسترد جزئيًا", en: "Partially refunded" }, tone: "info" },
};
export const PRODUCT_TYPE = {
  1: { ar: "دورة", en: "Course" },
  3: { ar: "استشارة", en: "Consultation" },
  6: { ar: "حزمة", en: "Package" },
};

export const refunds = orders
  .filter((o) => o.status === "refunded" || o.status === "partially_refunded" || (o.status === "paid" && o.id % 29 === 0))
  .slice(0, 14)
  .map((o, i) => ({
    id: 80 + i,
    orderId: o.id,
    amount: o.status === "partially_refunded" ? Math.round(o.total / 2) : o.total,
    reason: pick([{ ar: "طلب العميل", en: "Customer request" }, { ar: "دفع مكرر", en: "Duplicate payment" }, { ar: "مشكلة تقنية", en: "Technical issue" }]),
    status: o.status === "paid" ? "requested" : i % 5 === 1 ? "processing" : "completed",
    gateway: o.gateway,
    requestedAt: o.createdAt,
    requestedBy: pick([{ ar: "سارة (الدعم)", en: "Sara (support)" }, { ar: "خالد (المبيعات)", en: "Khaled (sales)" }]),
  }));
export const REFUND_STATUS = {
  requested: { label: { ar: "بانتظار الموافقة", en: "Awaiting approval" }, tone: "warning" },
  processing: { label: { ar: "قيد المعالجة لدى البوابة", en: "Processing at gateway" }, tone: "info" },
  completed: { label: { ar: "مكتمل", en: "Completed" }, tone: "success" },
};

export const tickets = Array.from({ length: 26 }, (_, i) => {
  const cust = customers[(i * 5 + 3) % customers.length];
  const types = [
    { ar: "تعديل اسم الشهادة", en: "Certificate name change" },
    { ar: "مشكلة في الدفع", en: "Payment issue" },
    { ar: "مشكلة في الوصول للدورة", en: "Course access issue" },
    { ar: "طلب استرداد", en: "Refund request" },
    { ar: "استفسار عام", en: "General enquiry" },
    { ar: "مشكلة تقنية", en: "Technical problem" },
  ];
  return {
    id: 157 - i,
    type: (i % 6) + 1,
    subject: types[i % 6],
    customerId: cust.id,
    status: [1, 1, 3, 4, 1, 3][i % 6],
    priority: [2, 3, 4, 2, 3][i % 5],
    createdAt: daysAgo(Math.floor(i * 1.5)),
    assignee: i % 3 ? pick([{ ar: "سارة", en: "Sara" }, { ar: "يوسف", en: "Youssef" }]) : null,
    messages: int(1, 6),
  };
});
// Numeric legacy enums; labels are our best reading and still need business confirmation.
export const TICKET_STATUS = {
  1: { label: { ar: "مفتوحة", en: "Open" }, tone: "warning" },
  3: { label: { ar: "قيد المتابعة", en: "In progress" }, tone: "info" },
  4: { label: { ar: "مغلقة", en: "Closed" }, tone: "neutral" },
};
export const TICKET_PRIORITY = {
  2: { label: { ar: "منخفضة", en: "Low" }, tone: "neutral" },
  3: { label: { ar: "متوسطة", en: "Medium" }, tone: "warning" },
  4: { label: { ar: "عالية", en: "High" }, tone: "danger" },
};

export const affiliates = Array.from({ length: 30 }, (_, i) => {
  const p = person(i + 70);
  return {
    id: 700 + i,
    name: { ar: p.ar, en: p.en },
    initials: p.initials,
    email: `affiliate${i + 1}@example.com`,
    status: i % 7 === 3 ? 0 : 2,
    code: `AFF${100 + i}`,
    sales: int(0, 160),
    revenue: int(0, 52000),
    unpaid: int(0, 4200),
    paid: int(0, 18000),
    joinedAt: daysAgo(int(20, 700)),
  };
});
export const AFFILIATE_STATUS = {
  0: { label: { ar: "بانتظار المراجعة", en: "Pending review" }, tone: "warning" },
  2: { label: { ar: "معتمد", en: "Approved" }, tone: "success" },
};
export const commissions = courses.slice(0, 22).map((c, i) => ({ id: 1 + i, courseId: c.id, amount: Math.round(c.price * pick([0.1, 0.15, 0.2])), productType: 1 }));
export const payouts = Array.from({ length: 12 }, (_, i) => ({
  id: 30 - i,
  affiliateId: 700 + ((i * 7) % 30),
  amount: int(300, 4500),
  status: i < 4 ? 1 : i === 5 ? 3 : 2,
  requestedAt: daysAgo(i * 6 + 1),
}));
export const PAYOUT_STATUS = {
  1: { label: { ar: "جديد", en: "New" }, tone: "warning" },
  2: { label: { ar: "مدفوع", en: "Paid" }, tone: "success" },
  3: { label: { ar: "مرفوض", en: "Rejected" }, tone: "danger" },
};

export const applications = Array.from({ length: 18 }, (_, i) => {
  const p = person(i + 100);
  return {
    id: 900 + i,
    name: { ar: p.ar, en: p.en },
    initials: p.initials,
    field: pick([{ ar: "القيادة", en: "Leadership" }, { ar: "التسويق", en: "Marketing" }, { ar: "المالية", en: "Finance" }, { ar: "الموارد البشرية", en: "HR" }]),
    years: int(3, 25),
    status: i < 7 ? "new" : i % 3 === 0 ? "rejected" : "shortlisted",
    submittedAt: daysAgo(i * 3),
  };
});

export const qa = Array.from({ length: 28 }, (_, i) => {
  const c = courses[(i * 5) % courses.length];
  const cust = customers[(i * 13) % customers.length];
  return {
    id: 14800 + i,
    courseId: c.id,
    customerId: cust.id,
    lecture: { ar: `الدرس ${int(1, 9)}: ${pick(["مقدمة", "تطبيق عملي", "دراسة حالة", "مراجعة"])}`, en: `Lesson ${int(1, 9)}: ${pick(["Introduction", "Practice", "Case study", "Review"])}` },
    comment: pick([
      { ar: "هل يمكن توضيح الفرق بين الأسلوبين بمثال من بيئة العمل؟", en: "Can you explain the difference between the two styles with a workplace example?" },
      { ar: "الملف المرفق في هذا الدرس لا يفتح عندي.", en: "The attached file in this lesson does not open for me." },
      { ar: "متى يتم إصدار الشهادة بعد إكمال الدورة؟", en: "When is the certificate issued after completing the course?" },
      { ar: "هل توجد قراءات إضافية لهذا الموضوع؟", en: "Are there additional readings on this topic?" },
    ]),
    replied: i > 9,
    at: daysAgo(Math.floor(i / 2)),
  };
});

export const consultants = Array.from({ length: 8 }, (_, i) => {
  const p = person(i + 120);
  return {
    id: 900 + i,
    name: { ar: p.ar, en: p.en },
    initials: p.initials,
    topic: pick([{ ar: "القيادة", en: "Leadership" }, { ar: "التسويق", en: "Marketing" }, { ar: "المالية", en: "Finance" }, { ar: "الموارد البشرية", en: "HR" }]),
    sessions: int(5, 120),
    payments: int(1500, 60000),
    nextSlot: daysAgo(-int(1, 10)),
    active: i !== 5,
  };
});

export const certificateTemplates = Array.from({ length: 10 }, (_, i) => ({
  id: 480 + i,
  name: { ar: `قالب ${["إتمام", "حضور", "دبلوم", "تميز", "مشاركة"][i % 5]} ${i + 1}`, en: `${["Completion", "Attendance", "Diploma", "Excellence", "Participation"][i % 5]} template ${i + 1}` },
  courses: int(1, 30),
  granted: int(20, 4000),
  color: COLORS[i % COLORS.length],
}));

export const priceLists = Array.from({ length: 8 }, (_, i) => ({
  id: 15 - i,
  name: pick([{ ar: "عرض اليوم الوطني", en: "National day sale" }, { ar: "الجمعة البيضاء", en: "White Friday" }, { ar: "عودة المدارس", en: "Back to school" }, { ar: "عرض رمضان", en: "Ramadan offer" }]),
  courses: int(4, 60),
  discount: pick([20, 30, 40, 50]),
  startsAt: daysAgo(int(-20, 200)),
  endsAt: daysAgo(int(-60, 150)),
  active: i < 2,
}));

export const offers = [
  { id: 1, type: "amount", name: { ar: "خصم 100 على 500+", en: "100 off orders over 500" }, active: true, uses: 214 },
  { id: 2, type: "discount", name: { ar: "خصم 25% على الدبلومات", en: "25% off diplomas" }, active: true, uses: 88 },
  { id: 3, type: "buyget", name: { ar: "اشترِ دورتين واحصل على الثالثة", en: "Buy 2 get 1" }, active: false, uses: 431 },
  { id: 4, type: "general", name: { ar: "عرض الشركاء", en: "Partners offer" }, active: true, uses: 37 },
];
export const OFFER_TYPE = {
  amount: { ar: "مبلغ", en: "Amount" },
  discount: { ar: "نسبة خصم", en: "Discount" },
  buyget: { ar: "اشترِ واحصل", en: "Buy-get" },
  general: { ar: "عام", en: "General" },
};

export const announcements = Array.from({ length: 6 }, (_, i) => ({
  id: 14 - i,
  text: pick([{ ar: "خصم 30% على جميع دورات القيادة حتى نهاية الشهر", en: "30% off all leadership courses until month end" }, { ar: "سجّل الآن في دبلوم الموارد البشرية - مقاعد محدودة", en: "Enrol now in the HR diploma - limited seats" }, { ar: "جلسات استشارية مجانية للمشتركين الجدد", en: "Free consultation sessions for new subscribers" }]),
  place: pick(["home", "course", "checkout"]),
  active: i < 2,
  color: COLORS[i % COLORS.length],
}));
export const banners = Array.from({ length: 6 }, (_, i) => ({
  id: 20 + i,
  kind: i < 3 ? "slider" : "banner",
  title: pick([{ ar: "ابدأ رحلتك القيادية", en: "Start your leadership journey" }, { ar: "دبلومات معتمدة", en: "Accredited diplomas" }, { ar: "تعلم من الخبراء", en: "Learn from experts" }]),
  target: pick([{ ar: "دورة", en: "Course" }, { ar: "حزمة", en: "Package" }, { ar: "استشارة", en: "Consultation" }]),
  order: i + 1,
  active: i !== 4,
  color: COLORS[(i + 2) % COLORS.length],
}));

export const adminUsers = Array.from({ length: 9 }, (_, i) => {
  const p = person(i + 160);
  return { id: 50 + i, name: { ar: p.ar, en: p.en }, initials: p.initials, email: `staff${i + 1}@example.com`, role: ["super", "sales", "sales", "content", "content", "support", "support", "support", "content"][i], lastActive: daysAgo(int(0, 12)) };
});

export const auditLog = Array.from({ length: 40 }, (_, i) => {
  const u = adminUsers[i % adminUsers.length];
  const acts = [
    { ar: "عدّل سعر دورة", en: "Changed a course price", target: "course" },
    { ar: "أصدر استردادًا", en: "Issued a refund", target: "order" },
    { ar: "أنشأ كوبونًا", en: "Created a coupon", target: "coupon" },
    { ar: "سجّل عميلًا في دورة", en: "Enrolled a customer", target: "customer" },
    { ar: "نشر دورة", en: "Published a course", target: "course" },
    { ar: "حدّث صلاحيات دور", en: "Updated role scopes", target: "role" },
    { ar: "أغلق تذكرة", en: "Closed a ticket", target: "ticket" },
  ];
  const a = acts[i % acts.length];
  return { id: 9000 - i, userId: u.id, action: { ar: a.ar, en: a.en }, target: a.target, targetId: int(100, 1100), at: daysAgo(Math.floor(i / 3)), ip: `10.0.${i % 7}.${20 + i}` };
});

// Daily paid revenue (SUM(total) of status=3 orders) for the last 120 days.
export const dailySales = Array.from({ length: 120 }, (_, i) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - (119 - i));
  const weekly = [0.8, 1.15, 1.1, 1, 1.05, 0.7, 0.75][d.getDay()];
  const trend = 1 + i / 260;
  const spike = i % 31 === 17 ? 2.1 : 1;
  const amount = Math.round(1350 * weekly * trend * spike * (0.75 + rnd() * 0.5));
  return { date: d.toISOString().slice(0, 10), amount, orders: Math.round(amount / int(180, 260)) };
});

export const kpis = {
  trainees: 54547,
  activeToday: 152,
  usersConfirmed: 88215,
  usersUnconfirmed: 13240,
  certificates: 26202,
  coursesPublished: 280,
  coursesUnpublished: 101,
  videos: 22261,
  videoSeconds: 13545760,
  files: 3293,
  trainerApplications: 907,
  affiliates: 432,
  couponsUsed: 3777,
  freeEnrollments: 69626,
};

export const ops = {
  refunds: refunds.filter((r) => r.status === "requested").length,
  tickets: tickets.filter((t) => t.status === 1).length,
  payouts: payouts.filter((p) => p.status === 1).length,
  applications: applications.filter((a) => a.status === "new").length,
  qa: qa.filter((q) => !q.replied).length,
};
ops.inbox = ops.refunds + ops.tickets + ops.payouts + ops.applications + ops.qa;

// Course studio content (would come from the LMS via lms_integration).
export function curriculumFor(course) {
  const s0 = seed;
  seed = course.id * 977;
  const kinds = ["video", "video", "file", "quiz", "video", "assignment", "live"];
  const units = Array.from({ length: Math.min(course.units, 6) }, (_, u) => ({
    id: `${course.id}-u${u + 1}`,
    title: { ar: `الوحدة ${u + 1}: ${pick(["المفاهيم الأساسية", "الأدوات والأساليب", "التطبيق العملي", "دراسات حالة", "التقييم والمتابعة", "الخلاصة والمراجعة"])}`, en: `Unit ${u + 1}: ${pick(["Core concepts", "Tools and methods", "Hands-on practice", "Case studies", "Evaluation", "Summary and review"])}` },
    items: Array.from({ length: int(3, 5) }, (_, k) => {
      const kind = kinds[(u + k) % kinds.length];
      return {
        id: `${course.id}-u${u + 1}-i${k + 1}`,
        kind,
        title: {
          video: { ar: `فيديو: الدرس ${k + 1}`, en: `Video: lesson ${k + 1}` },
          file: { ar: "ملف: ملخص الوحدة", en: "File: unit summary" },
          quiz: { ar: "اختبار قصير", en: "Short quiz" },
          assignment: { ar: "واجب تطبيقي", en: "Applied assignment" },
          live: { ar: "جلسة مباشرة", en: "Live session" },
        }[kind],
        duration: kind === "video" ? int(240, 1500) : null,
        published: rnd() > 0.1,
      };
    }),
  }));
  seed = s0;
  return units;
}

export const byId = (list, id) => list.find((x) => String(x.id) === String(id));
