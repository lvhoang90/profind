// Dấu hiệu ProFind: cùng "họ" với EduFind (quả cầu gradient + kinh tuyến + quả cầu nhỏ góc trên) nhưng nhân vật là
// một nhà khoa học đeo kính. Một nguồn duy nhất cho favicon, biểu tượng ứng dụng (any/maskable), logo ngang và hero.
const ink = "#0a1a5c";
const person = (id, dy = 0) => `<g transform="translate(0 ${dy})">
  <g transform="translate(12 14)" fill="${ink}" fill-opacity=".38"><circle cx="256" cy="206" r="74"/><path d="M104 470C112 356 176 316 256 316s144 40 152 154z"/></g>
  <path d="M104 470C112 356 176 316 256 316s144 40 152 154z" fill="url(#${id}b)"/>
  <path d="M214 322l42 58 42-58" fill="none" stroke="${ink}" stroke-opacity=".28" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="226" y="268" width="60" height="62" rx="26" fill="#cfe6ff"/>
  <circle cx="256" cy="206" r="74" fill="url(#${id}b)"/>
  <path d="M184 190c4-44 36-66 74-64 38 2 66 26 70 64-18-22-46-32-74-32-28 0-52 10-70 32z" fill="${ink}" fill-opacity=".85"/>
  <g stroke="${ink}" stroke-width="11" stroke-linecap="round" fill="none">
    <circle cx="223" cy="212" r="31" fill="#7dd3fc" fill-opacity=".5"/><circle cx="289" cy="212" r="31" fill="#7dd3fc" fill-opacity=".5"/>
    <path d="M253 208q3-8 6 0M192 206l-16-8M320 206l16-8"/>
  </g>
  <path d="M207 200a20 20 0 0 1 14-9M273 200a20 20 0 0 1 14-9" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/>
</g>`;
export const MARK = (id, shape = "circle", { maskable = false, anim = false } = {}) => {
  const clip = shape === "circle" ? '<circle cx="256" cy="256" r="240"/>' : `<rect width="512" height="512" rx="${maskable ? 0 : 118}"/>`;
  const m = (rx) => `<ellipse cx="256" cy="256" rx="${rx}" ry="${shape === "circle" ? 246 : 262}"/>`;
  const scale = maskable ? "translate(51 51) scale(.8)" : "";
  return `<defs>
<radialGradient id="${id}g" cx=".3" cy=".22" r=".98"><stop offset="0" stop-color="#6fd8ff"/><stop offset=".5" stop-color="#2a56e0"/><stop offset="1" stop-color="#4a1fb8"/></radialGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe6ff"/></linearGradient>
<clipPath id="${id}c">${clip}</clipPath></defs>
<g clip-path="url(#${id}c)"><rect width="512" height="512" fill="url(#${id}g)"/><g${scale ? ` transform="${scale}"` : ""}>
<g fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="5">${m(164)}${m(90)}${m(148)}</g>
<circle cx="256" cy="256" r="244" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="5"/>
${person(id)}
<g${anim ? ' class="orb"' : ""}><circle cx="410" cy="78" r="26" fill="#7dd3fc" opacity=".35"/><circle cx="410" cy="78" r="13" fill="#fff"/></g>
</g></g>`;
};
export const svg = (inner, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"${extra}>${inner}</svg>`;
export const APP_ICON = ({ maskable = false } = {}) => svg(MARK("ai", "rect", { maskable }));
export const DISC = () => svg(MARK("dm", "circle"));
