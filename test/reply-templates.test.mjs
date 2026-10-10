// Thử mẫu thư báo: npx esbuild src/replyTemplates.ts --bundle --format=esm --outfile=/tmp/rt.mjs && TEMPLATES=/tmp/rt.mjs node test/reply-templates.test.mjs
const { replyTemplate, detectLang, profileUrl } = await import(process.env.TEMPLATES ?? "/tmp/rt.mjs");
let ok = 0; const eq = (a, b, m) => { if (a !== b) { console.error("FAIL", m, a, b); process.exit(1); } ok++; };
eq(detectLang("Please add my profile!", "Nguyen Le"), "en", "tiếng Anh");
eq(detectLang("Số công trình chưa đủ", "Đoàn Thị Hương Giang"), "vi", "tiếng Việt");
eq(detectLang("", "Nguyen Van A", ""), "en", "không dấu thì tiếng Anh");
for (const kind of ["add", "claim", "correct", "remove"]) for (const lang of ["vi", "en"]) {
  const t = replyTemplate(kind, lang, { name: "Người Mẫu", email: "mau@example.vn", id: "A5000000001" });
  eq(/undefined|null|\[object/.test(t.subject + t.body), false, `${kind}/${lang}: không có undefined`);
  eq(t.subject.startsWith("ProFind:"), true, `${kind}/${lang}: tiêu đề`);
  eq(t.body.startsWith(lang === "vi" ? "Chào Người Mẫu," : "Hello Người Mẫu,"), true, `${kind}/${lang}: lời chào`);
  eq(/Trân trọng|Kind regards/.test(t.body), true, `${kind}/${lang}: lời kết`);
  eq(lang === "vi" ? /[ăâđêôơư]/i.test(t.body) : !/[ăâđêôơư]/i.test(t.body.replace("Người Mẫu", "")), true, `${kind}/${lang}: đúng ngôn ngữ`);
}
eq(replyTemplate("add", "vi", { name: "X", email: "x@y.vn", id: "A5000000001" }).body.includes(profileUrl("A5000000001")), true, "có liên kết hồ sơ");
eq(replyTemplate("add", "en", { name: "", email: "", id: "" }).body.includes("https://"), false, "không mã hồ sơ thì không có liên kết");
eq(replyTemplate("add", "en", { name: "", email: "", id: "" }).body.startsWith("Hello,"), true, "không tên: Hello,");
console.log(`OK ${ok} kiểm tra`);
