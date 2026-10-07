// Áp dụng giao diện sáng/tối đã chọn trước khi vẽ trang (tránh nháy). Tệp riêng vì CSP không cho script nội tuyến.
try { var t = localStorage.getItem("profind.theme"); if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); } catch (e) {}
