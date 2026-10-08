// Quy đổi địa phương của đơn vị sang 34 tỉnh/thành từ 01/07/2025 (data/unit-province.json).
// provinceOf(inst) trả tên tỉnh/thành mới; "" nếu chưa quy đổi được (khi đó giữ nguyên city gốc).
import { readFileSync } from "node:fs";
export const UP = JSON.parse(readFileSync("data/unit-province.json", "utf8"));
export const provinceOf = (u) => UP.unit[u.id] ?? UP.city[String(u.city ?? "").trim()] ?? "";
export const cityOut = (u) => provinceOf(u) || u.city || null;
