# Đo đồ họa khi lái xe trong ViVu3D · 23/11/2026

Qua 46 cặp đo trên RTX 3060, số khung phải vẽ cả gương và phản chiếu mặt nước/đường ướt giảm từ **282 xuống 0**. FPS gộp là **57.0 → 58.5**. Ở phố đông, 60 km/h, chế độ cảm ứng Tự động trong cabin đêm mưa đạt **43.9 → 59.9 FPS**, P99 **250.0 → 16.9 ms**. Ở 200 km/h, trung vị FPS ở khu thưa 720p là **54.0 → 55.2**. Mỗi lượt kéo dài 8 giây. [So sánh mặt tiền Hội An trước và sau](hoi-an-shopfront-before-after.png) · [CSV của từng lượt](graphics-drive-2026-11-23.csv).

## Kết quả

Cấu hình | Số cặp | FPS trước → sau | Trung vị P99 (ms) trước → sau | Khung vẽ cả gương lẫn mặt nước trước → sau
--- | ---: | ---: | ---: | ---:
PC 720p, Cao, cabin đêm mưa | 16 | 57.0 → 57.7 | 33.4 → 33.4 | 196 → 0
Cảm ứng, Thấp, sau xe ngày ráo | 12 | 59.9 → 59.9 | 16.9 → 16.8 | 0 → 0
PC 720p, Cao, sau xe ngày ráo | 4 | 58.2 → 58.5 | 33.4 → 33.4 | 0 → 0
Cảm ứng, Vừa, cabin đêm mưa | 4 | 58.3 → 59.3 | 33.4 → 16.9 | 17 → 0
Cảm ứng, Tự động, cabin đêm mưa | 4 | 47.1 → 59.8 | 258.4 → 16.9 | 0 → 0
PC 1440p, Cao, cabin đêm mưa | 6 | 56.0 → 56.5 | 41.7 → 33.5 | 69 → 0

### 200 km/h, cabin đêm mưa, cấu hình Cao

Khung nhìn và mật độ | FPS trước, trung vị (thấp nhất–cao nhất) | FPS sau, trung vị (thấp nhất–cao nhất) | Trung vị P99 trước → sau (ms)
--- | ---: | ---: | ---:
1280×720, đông | 56.9 (54.9–59.2) | 57.8 (57.7–58.9) | 50.0 → 33.4
1280×720, thưa | 54.0 (50.2–54.5) | 55.2 (54.9–55.2) | 50.0 → 49.9
2560×1440, đông | 57.5 (55.1–58.5) | 58.1 (56.6–58.7) | 33.4 → 33.4
2560×1440, thưa | 55.0 (54.5–55.5) | 55.5 (53.6–56.1) | 50.0 → 50.0

### Theo tốc độ

Mỗi ô ghi FPS trước → sau. Với điều kiện lặp, bảng dùng trung vị FPS.

Tốc độ (km/h) | PC 720p, cabin đêm mưa, đông | PC 720p, cabin đêm mưa, thưa | Cảm ứng Thấp, ngày ráo, đông | Cảm ứng Thấp, ngày ráo, thưa
---: | ---: | ---: | ---: | ---:
0 | 60.0 → 60.0 | 59.9 → 60.0 | 60.0 → 60.0 | 60.0 → 60.0
20 | 60.0 → 60.0 | 59.9 → 59.7 | 60.0 → 60.0 | 60.0 → 60.0
60 | 57.5 → 57.6 | 57.9 → 58.3 | 59.4 → 59.2 | 60.0 → 60.0
100 | 59.1 → 59.6 | 57.4 → 58.2 | 60.0 → 60.0 | 60.0 → 60.0
150 | 57.6 → 57.6 | 52.5 → 52.0 | 60.0 → 60.0 | 59.9 → 59.6
200 | 56.9 → 57.8 | 54.0 → 55.2 | 59.6 → 59.5 | 59.9 → 59.9

Trong 20,980 khung hình trước và 21,527 khung sau, số khung vẽ cả gương lẫn phản chiếu mặt nước/đường ướt giảm từ 282 xuống 0. Số khung mất trên 50 ms giảm từ 77 xuống 42. Số lượt vẽ gương là 2,131 → 2,157 và số lượt vẽ mặt nước/đường ướt là 1,464 → 1,452. FPS gộp bằng tổng số khung chia tổng thời gian. P99 trong bảng nhóm là trung vị các P99 của từng lượt. [Tải kết quả từng cặp](graphics-drive-2026-11-23.csv).

### Khởi hành và khung chậm ở chế độ Tự động

Ở 60 km/h, phố đông, đêm mưa, công cụ lấy mẫu CPU ghi nhận ba lượt vẽ gương bị kẹt **695, 532 và 651 ms** trên bản gốc. Phần lớn mẫu CPU nằm trong WebGL `getProgramParameter`, khi Three.js lấy thông tin shader. Bản thử đầu tiên tách lượt vẽ gương và mặt nước nhưng vẫn gặp cùng điểm nghẽn, ba lượt vẽ gương mất 705, 590 và 644 ms. Bản cuối chuẩn bị sẵn biến thể shader dùng khi vẽ gương. Trong lượt chẩn đoán bản cuối, cả ba đợt khựng dài ở gương đều biến mất. Khung dài nhất còn **116 ms**, ứng với một lần vẽ cảnh ra màn hình cũng chờ thông tin shader. Các lượt có bật bộ lấy mẫu CPU được giữ ngoài 46 cặp đo. [Dữ liệu chẩn đoán và ba lần khởi hành mỗi bản](graphics-auto-cpu-2026-11-23.json).

Đổi lại, trung vị ba lần mở tuyến từ đầu trên cùng PC cho thấy khâu chuẩn bị shader, mô hình và texture mất **2.03 → 2.99 giây**. Tổng thời gian từ lúc mở tuyến đến khi bấm được “Cầm lái” là **4.46 → 5.49 giây**. Mỗi mẫu dùng tiến trình Chromium và hồ sơ trình duyệt mới, dữ liệu lấy qua HTTP cục bộ. Toàn bộ 46 lượt sau trong CSV dùng mã bản cuối, không trộn các lượt bản thử đầu tiên (SHA-256 `731c8526b6e9e2626688de60673ee6058f14dae748723e6ccacd532641d62077`).

### Lái bằng bàn phím

Một lượt riêng dùng xe supercar trên CT.04 Hà Nội–Hải Phòng (đoạn 375982, bắt đầu ở làn vượt), cấu hình Cao, khung nhìn cabin 1280×720, mặt đường ướt. Dùng các phím thật của game qua trình duyệt (mũi tên lên, Shift và phím cách), xe đạt **200,93 km/h** sau khoảng **181 m**, sau đó phanh về 0 khi tổng quãng đường là **251,21 m**. Xe vẫn trên đường, HP 100. Lượt này xác minh khả năng tăng tốc và phanh thực tế trong mô phỏng. Các bảng bên trên dùng tốc độ điều khiển cố định để so cùng điều kiện.

## Điều kiện đo

- Windows 10 Pro 19045, Intel Xeon E5-2686 v4, NVIDIA GeForce RTX 3060, ANGLE/D3D11, Chromium 156.0.8078.4 chạy headless bằng GPU thật. Khung nhìn PC 1280×720 hoặc 2560×1440, DPR 1. Ở 1440p, cấu hình Cao tự giới hạn vùng vẽ theo ngân sách điểm ảnh của game. Nhóm cảm ứng giả lập màn hình ngang 844×390, DPR 2, vẫn chạy trên RTX 3060. Hiệu năng GPU, nhiệt độ và mạng của điện thoại thật cần đo riêng.
- Vùng vẽ GPU trên PC 720p 1280×720, PC 1440p 2529×1423, cảm ứng Thấp 759×351, cảm ứng Vừa 1055×487, cảm ứng Tự động 1055×487, 1266×585, 759×351. Chế độ Tự động có thể đổi độ phân giải trong một lượt.
- Trong bán kính 200 m quanh điểm xuất phát, tuyến Bách khoa Hà Nội → Hồ Gươm có 57 đoạn đường OSM, còn tuyến Thác Bạc → Sa Pa có 2 đoạn. Số này tính theo khoảng cách tới đoạn thẳng trong dữ liệu đường của tuyến. Cột edges trong CSV là số đoạn trong vùng mà game truy vấn quanh xe. Lượng xe được đặt Đông ở nội đô và Thưa ở đường núi. Cảnh đêm mưa đặt ánh sáng 21 giờ, lượng mưa 3 mm, mây phủ 90%. Cảnh ngày ráo đặt 12 giờ, mưa và mây bằng 0.
- PC 720p cabin đêm mưa và cấu hình cảm ứng Thấp ngày ráo chạy đủ 0, 20, 60, 100, 150, 200 km/h ở cả hai nơi. Cảm ứng Vừa, cảm ứng Tự động đêm mưa và PC 720p sau xe ngày ráo chạy 60 và 200 km/h. Cabin đêm mưa cấu hình Cao ở 720p và 1440p lặp ba lần mỗi bản trên mỗi tuyến ở 200 km/h.
- Trình kiểm thử bám cùng chuỗi đoạn đường và làn xe ở tốc độ định sẵn, bỏ qua điều khiển tay, tăng tốc bằng động cơ và va chạm xe người chơi. Vòng khung hình của game vẫn xử lý mô phỏng xe khác, camera theo tốc độ, HUD, hình học đường, tải vùng và vẽ cảnh. Xe được gieo cùng hạt ngẫu nhiên, tài nguyên lấy qua HTTP cục bộ, có giai đoạn làm nóng trước khi ghi kết quả. Nguồn thời tiết và bảng xếp hạng được giả lập. Lịch GPU, bộ nhớ đệm, đèn giao thông, tiến trình nền và mức chất lượng Tự động có thể thay đổi giữa các lượt. Hầu hết điều kiện có một cặp đo. Trần khoảng 60 Hz giới hạn mức cải thiện FPS quan sát được ở những cảnh đã đạt tần số quét.
- Mỗi cửa sổ đo ghi thời điểm khung từ requestAnimationFrame, khoảng cách giữa hai khung, số xe, kích thước vùng vẽ GPU, các lượt vẽ gương và mặt nước, cùng số tâm vùng dựng cảnh và tâm vùng đã tải khác nhau. P99 chọn mẫu ở vị trí làm tròn lên của 99% số khung đã sắp xếp. Tốc độ thực bằng quãng đường đã tiến theo tuyến chia thời gian thực. Mọi lượt 200 km/h đi hơn 440 m và đều chuyển vùng dựng cảnh lẫn vùng tải dữ liệu. CSV giữ cả các lượt có kết quả chậm hơn.
- Commit gốc `b5cfb0cb525ddf0a7342bdaffc73b5b2556d24a9`. SHA-256 của bốn mô-đun đồ họa được ghép theo tên và nội dung theo thứ tự của script, trước `190b1035295e92c6c607294704db3b10915bc3759df7f857c2c63da8f1d1a26d` và sau `916f0ba86953c399807a64830ad5b81b7adcedc91c35f37429ded71a4bcbad9a` (bytes CRLF thực sự phục vụ từ máy Windows). Cùng nội dung bản cuối chuẩn hóa LF như Git có SHA-256 `61127f7dd74808b05de90faf8dfe221d0b12d362e7d26f644263cae24e9def87`.

## Đo lại

Từ thư mục gốc dự án, dùng các gói và Chromium đúng phiên bản của tools/smoke. Chế độ working lấy bốn mô-đun đồ họa từ thư mục làm việc, còn HTML, CSS và JavaScript chính từ commit gốc. Dùng cùng bộ dữ liệu, trình duyệt, cài đặt màn hình và GPU khi so sánh hai bản.

```powershell
$env:BENCH_BASE = 'b5cfb0cb525ddf0a7342bdaffc73b5b2556d24a9'
node tools/smoke/graphics-drive-benchmark.mjs $env:BENCH_BASE before.json
node tools/smoke/graphics-drive-benchmark.mjs working after.json
```

Các biến môi trường ở đầu script cho phép lọc điều kiện và tiếp tục lượt đo còn thiếu.
