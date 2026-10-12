import type { Data } from "./types";

/** Trang #/doanh-nghiep (đang làm): tìm chuyên gia, nhóm nghiên cứu cho doanh nghiệp. */
export function BusinessPage({ d, query }: { d: Data; query: string }) {
  void d; void query;
  return <section className="business"><h1>Business</h1></section>;
}
