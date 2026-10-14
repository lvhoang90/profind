// scripts/lib/wos.mjs: đọc CSV danh sách tạp chí Web of Science và gộp ISSN -> chỉ mục (không gọi mạng).
import assert from "node:assert/strict";
import { parseCsv, indexOfFile, issnsOf, mergeLists, INDEXES } from "../scripts/lib/wos.mjs";

const esci = '﻿"Journal title","ISSN","eISSN","Publisher name"\r\n"Tạp chí, Khoa học ""A""","1859-1234","2734-9527","NXB X"\r\n"Journal B","0866-7578","","Y"\r\n"Bad","12-34","","Z"\r\n';
const scie = 'Journal title,ISSN,eISSN\nJournal B,0866-7578,\nJournal C,1234-567X,2345-6789\n';

const r = parseCsv(esci); assert.equal(r.length, 4); assert.equal(r[1][0], 'Tạp chí, Khoa học "A"'); assert.equal(r[0][0], "Journal title", "bỏ BOM");
assert.deepEqual(issnsOf(r[0], r[1]), ["1859-1234", "2734-9527"]); assert.deepEqual(issnsOf(r[0], r[3]), [], "ISSN sai định dạng bị loại");
assert.equal(indexOfFile("WoS-ESCI-2026.csv"), "ESCI"); assert.equal(indexOfFile("scie.csv"), "SCIE"); assert.equal(indexOfFile("khac.csv"), null);

const by = mergeLists([{ index: "ESCI", text: esci }, { index: "SCIE", text: scie }]);
assert.deepEqual(by["0866-7578"], ["SCIE", "ESCI"], "một tạp chí ở hai chỉ mục, giữ thứ tự ưu tiên"); assert.deepEqual(by["1859-1234"], ["ESCI"]); assert.deepEqual(by["2345-6789"], ["SCIE"]);
const kept = mergeLists([{ index: "ESCI", text: esci }, { index: "SCIE", text: scie }], new Set(["0866-7578"])); assert.deepEqual(Object.keys(kept), ["0866-7578"]);
assert.deepEqual(INDEXES, ["SCIE", "SSCI", "AHCI", "ESCI"]);
console.log("OK wos");
