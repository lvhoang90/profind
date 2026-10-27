// scripts/lib/scopus.mjs: đọc CSV danh sách nguồn Scopus và gộp ISSN -> trạng thái (không gọi mạng).
import assert from "node:assert/strict";
import { normIssn, scopusStatus } from "../scripts/lib/scopus.mjs";

assert.equal(normIssn("20349130"), "2034-9130"); assert.equal(normIssn("2034-9130"), "2034-9130"); assert.equal(normIssn("1234567x"), "1234-567X");
assert.equal(normIssn("866757"), "0086-6757", "mất số 0 đầu khi mở bằng bảng tính"); assert.equal(normIssn(""), null); assert.equal(normIssn("abc"), null);

const csv = 'Sourcerecord ID,Source Title,ISSN,EISSN,Active or Inactive,Source Type\n1,"Journal, A",20349130,22959149,Active,Journal\n2,Old,00181390,,Inactive,Journal\n3,Book,11111111,,Active,Book Series\n4,Dup,00181390,,Active,Journal\n5,Bad,12-3,,Active,Journal\n';
const all = scopusStatus(csv);
assert.equal(all["2034-9130"], "A"); assert.equal(all["2295-9149"], "A", "cả eISSN"); assert.equal(all["0018-1390"], "A", "Active thắng khi trùng ISSN");
assert.equal(all["1111-1111"], undefined, "chỉ Source Type = Journal");
assert.deepEqual(Object.keys(scopusStatus(csv, new Set(["2034-9130"]))), ["2034-9130"]);
assert.deepEqual(scopusStatus("a,b\n1,2\n"), {}, "thiếu cột trạng thái thì bỏ qua");
console.log("OK scopus");
