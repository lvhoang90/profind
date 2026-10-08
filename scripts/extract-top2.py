# Trích dòng Việt Nam (cntry = vnm) từ bảng Top 2% (Ioannidis et al., bản 9, tháng 8/2026) -> data/top2/top2-vn-{career,singleyr}-2025.json
#   python3 scripts/extract-top2.py <Table_1_Authors_career_...xlsx> <Table_1_Authors_singleyr_...xlsx>
# Giấy phép dữ liệu gốc: CC BY-NC 3.0 (xem data/top2/LICENSE-NC.md). Chỉ giữ các cột cần dùng cho đối chiếu và hiển thị.
import sys, json, openpyxl
COLS = {"name": "authfull", "inst": "inst_name", "field": "sm-field", "subfield": "sm-subfield-1", "rank": "rank", "rankNs": "rank (ns)", "selfPct": "self%", "np": "np6025", "firstyr": "firstyr", "lastyr": "lastyr", "topCntry": "top_cntry_career", "topShare": "top_cntry_share", "sfRank": "rank sm-subfield-1", "sfRankNs": "rank sm-subfield-1 (ns)", "sfN": "sm-subfield-1 count"}
def run(src, out, label):
    ws = openpyxl.load_workbook(src, read_only=True)["Data"]; it = ws.iter_rows(values_only=True); h = next(it); ix = {k: i for i, k in enumerate(h)}
    rows = []
    for r in it:
        if str(r[ix["cntry"]]).lower() != "vnm": continue
        o = {}
        for k, c in COLS.items():
            v = r[ix[c]]; o[k] = round(v, 4) if isinstance(v, float) else v
        # đạt tiêu chí danh sách (top 100.000 theo c hoặc top 2% trong tiểu lĩnh vực) khi LOẠI tự trích dẫn?
        try: o["inNs"] = bool(float(o["rankNs"]) <= 100000 or float(o["sfRankNs"]) / float(o["sfN"]) <= 0.02)
        except (TypeError, ValueError): o["inNs"] = None
        for k in ("sfRank", "sfRankNs", "sfN"): o.pop(k, None)
        rows.append(o)
    json.dump({"meta": {"source": "Ioannidis, Baas, Klavans, Boyack. Updated science-wide author databases of standardized citation indicators. Elsevier BV (Mendeley Data), DOI 10.17632/btchxktzyw.9", "version": 9, "snapshot": "2026-08", "list": label, "license": "CC BY-NC 3.0", "rows": len(rows)}, "authors": rows}, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(label, len(rows))
run(sys.argv[1], "data/top2/top2-vn-career-2025.json", "career")
run(sys.argv[2], "data/top2/top2-vn-singleyr-2025.json", "singleyr")
