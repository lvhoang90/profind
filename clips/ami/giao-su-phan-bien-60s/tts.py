import json, numpy as np
from piper import PiperVoice
from piper.voice import SynthesisConfig
v=PiperVoice.load("/tmp/vi/vi_VN-vais1000-medium.onnx")
L=[
"Ngày bảo vệ đến. Hội đồng ngồi đối diện. Nếu bạn được bảo vệ trước một lần, ngay trên bản thảo của mình?",
"Giáo sư phản biện. Tính năng cao cấp của Ami!",
"Chọn loại văn bản, tải mẫu phiếu nhận xét của đơn vị bạn. Ami làm theo từng mục của mẫu.",
"Ami đọc toàn văn, rồi nhận xét từng phần như một giáo sư khó tính nhưng công bằng.",
"Mỗi nhận xét kèm trích dẫn nguyên văn, và được máy đối chiếu với bản gốc. Không bịa, không đoán!",
"Điểm đề xuất do mã lệnh cộng lên, kèm kết luận. Gặp lỗi nghiêm trọng, kết luận không thể tốt hơn sửa lớn.",
"Kèm câu hỏi dành cho tác giả. Tập trả lời trước, để ngày bảo vệ không còn bất ngờ.",
"Sửa ngay trên màn hình, tổng điểm tự tính lại. Một chạm, xuất ra Word.",
"Là giảng viên? Chấm một lúc ba mươi bài, mỗi bài một tệp Word.",
"Ami chỉ là trợ thủ soạn thảo: không thay hội đồng thật, không kiểm tra đạo văn. Người phản biện vẫn chịu trách nhiệm cuối cùng.",
"Dành cho nhà nghiên cứu đã xác thực và được quản trị viên phê duyệt. Gửi yêu cầu kèm minh chứng ngay hôm nay!",
"Giáo sư phản biện của Ami. Đến trước hội đồng một bước.",
]
cfg=SynthesisConfig(length_scale=1.08,noise_scale=0.6,noise_w_scale=0.7)
sr=v.config.sample_rate; tl=[]
for i,l in enumerate(L):
    a=np.concatenate([np.frombuffer(c.audio_int16_bytes,dtype=np.int16) for c in v.synthesize(l,cfg)]).astype(np.float32)/32768
    np.save(f"s{i+1}.npy",a); tl.append({"text":l,"dur":round(len(a)/sr,2)}); print(i+1,round(len(a)/sr,2))
json.dump({"sr":sr,"lines":tl},open("tl.json","w"),ensure_ascii=False,indent=1); print(sum(x['dur'] for x in tl))
