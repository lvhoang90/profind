// Năm y có nằm trong Coverage của tạp chí không: Coverage gồm các đoạn "YYYY" hoặc "YYYY-YYYY" phân cách bằng ";" hoặc ",".
export const inCoverage = (cov, y) => !!y && String(cov ?? "").split(/[;,]/).some((p) => { const m = /^(\d{4})(?:-(\d{4}))?$/.exec(p); return m && y >= +m[1] && y <= +(m[2] ?? m[1]); });
