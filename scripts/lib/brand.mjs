// Dấu hiệu ProFind (v2): "bông hoa nguyên tử" 5 cánh theo dải quang phổ quanh một cặp KÍNH của nhà nghiên cứu (nhìn kỹ, tìm ra tri thức),
// hai electron quay quanh. Thiết kế gốc của dự án (5 cánh, nền chàm, tâm là kính), không sao chép logo có sẵn.
// Một nguồn duy nhất cho favicon, biểu tượng ứng dụng (any/maskable), logo tròn và hero.
const ink = "#14164a";
const PET = [ // [gradient trên, gradient dưới] theo thứ tự quang phổ, bắt đầu từ cánh trên cùng, quay thuận kim đồng hồ
  ["#35e0ff", "#0a8cff"], ["#5b7bff", "#7a3cff"], ["#ff5fb8", "#ff2f7a"], ["#ffb52e", "#ff8a1f"], ["#7bf0b0", "#17c5a0"],
];
const petal = (id, i) => `<g transform="rotate(${i * 72} 256 256)"><path d="M256 172C326 160 336 84 256 40C176 84 186 160 256 172Z" fill="url(#${id}p${i})"/><path d="M256 172C326 160 336 84 256 40Z" fill="#fff" fill-opacity=".2"/></g>`;
const glasses = `<circle cx="256" cy="256" r="80" fill="#fff"/>
  <g stroke="${ink}" stroke-width="10" stroke-linecap="round" fill="none"><circle cx="222" cy="258" r="30" fill="#35e0ff" fill-opacity=".55"/><circle cx="290" cy="258" r="30" fill="#35e0ff" fill-opacity=".55"/><path d="M251 252q5-8 10 0M193 250l-8-5M319 250l8-5"/></g>
  <path d="M208 248a18 18 0 0 1 12-10M276 248a18 18 0 0 1 12-10" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>`;
export const MARK = (id, shape = "circle", { maskable = false, anim = false } = {}) => {
  const clip = shape === "circle" ? '<circle cx="256" cy="256" r="240"/>' : `<rect width="512" height="512" rx="${maskable ? 0 : 118}"/>`;
  const scale = maskable ? "translate(51 51) scale(.8)" : "";
  const defs = PET.map(([a, b], i) => `<linearGradient id="${id}p${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join("");
  return `<defs><radialGradient id="${id}g" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#2b2f8f"/><stop offset=".6" stop-color="${ink}"/><stop offset="1" stop-color="#0b0c2e"/></radialGradient>${defs}<clipPath id="${id}c">${clip}</clipPath></defs>
<g clip-path="url(#${id}c)"><rect width="512" height="512" fill="url(#${id}g)"/><g${scale ? ` transform="${scale}"` : ""}>
<circle cx="256" cy="256" r="196" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="3"/>
${PET.map((_, i) => petal(id, i)).join("")}
${glasses}
<g${anim ? ' class="orb"' : ""}><circle cx="256" cy="60" r="0"/><circle cx="391" cy="141" r="11" fill="#fff"/><circle cx="127" cy="371" r="11" fill="#fff"/><circle cx="391" cy="141" r="22" fill="#fff" opacity=".18"/><circle cx="127" cy="371" r="22" fill="#fff" opacity=".18"/></g>
</g></g>`;
};
export const svg = (inner, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"${extra}>${inner}</svg>`;
export const APP_ICON = ({ maskable = false } = {}) => svg(MARK("ai", "rect", { maskable }));
export const DISC = () => svg(MARK("dm", "circle"));
