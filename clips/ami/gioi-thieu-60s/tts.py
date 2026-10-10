import json, wave, numpy as np
from piper import PiperVoice
from piper.voice import SynthesisConfig
v=PiperVoice.load("/tmp/vi/vi_VN-vais1000-medium.onnx")
L=[
"Năm mươi bài báo cần đọc, mà chỉ còn ba ngày?",
"Đừng đọc hết. Hãy để Ami đọc trước, bạn chỉ đọc đúng chỗ cần.",
"Gặp Ami, trợ lý học thuật A I, đọc tài liệu thay bạn!",
"Nhập tóm tắt đề tài. Tải lên tài liệu: P D F, Word, cả bản scan.",
"Chỉ vài giây, Ami chấm độ phù hợp trên thang một trăm điểm, theo năm tiêu chí.",
"Gợi ý đoạn đáng trích dẫn, và đối chiếu nguyên văn với tài liệu. Không bịa, không đoán!",
"Một chạm, có ngay trích dẫn: A P A, Harvard, I triple E, Vancouver, và hơn mười nghìn kiểu tạp chí.",
"Chín định dạng, tiếng Việt hoặc tiếng Anh. Dán vào Word vẫn giữ nguyên chữ nghiêng.",
"Tài liệu của bạn không bị lưu trữ. Ami đọc ngay trên máy của bạn.",
"Sắp bảo vệ? Giáo sư phản biện giả lập hội đồng, nhận xét từng phần cho đề cương, luận văn, luận án.",
"Cùng EduFind, ProFind và Mây: bốn công cụ, một tài khoản.",
"Ami. Đọc nhanh, trích đúng. Miễn phí một lượt mỗi tuần. Thử ngay hôm nay!",
]
cfg=SynthesisConfig(length_scale=1.08,noise_scale=0.6,noise_w_scale=0.7)
sr=v.config.sample_rate; tl=[]; t=0; chunks=[]
for i,l in enumerate(L):
    a=np.concatenate([np.frombuffer(c.audio_int16_bytes,dtype=np.int16) for c in v.synthesize(l,cfg)]).astype(np.float32)/32768
    d=len(a)/sr; tl.append({"text":l,"dur":round(d,2)}); np.save(f"s{i+1}.npy",a); print(i+1,round(d,2))
json.dump({"sr":sr,"lines":tl},open("tl.json","w"),ensure_ascii=False,indent=1)
