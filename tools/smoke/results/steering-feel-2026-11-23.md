# Phản hồi vô lăng theo thời gian giữ phím, 23/11/2026

Trên CT.04 ở 200 km/h, một cú nhấn 50 ms đưa siêu xe sang phải 0,24 m sau một giây, trước đây là 0,05 m. Giữ 250 ms đưa xe sang phải 1,46 m, trước đây là 5,84 m. Trong khoảng đã đo, mỗi 50 ms giữ thêm làm tăng độ lệch khoảng 0,29–0,32 m ở 200 km/h và 0,30–0,33 m ở 100 km/h.

## Nhấn ngắn trên CT.04

Mỗi lượt bắt đầu khi xe chạy thẳng. Nhấn lái phải rồi thả và đo độ lệch ngang ở đúng một giây tính từ lúc nhấn. Bàn phím và hai nút chạm trên màn hình được kiểm tra riêng.

| Thời gian nhấn | 100 km/h trước (m) | 100 km/h sau (m) | 200 km/h trước (m) | 200 km/h sau (m) |
|---:|---:|---:|---:|---:|
| 50 ms | 0,091 | 0,246 | 0,054 | 0,235 |
| 100 ms | 0,528 | 0,565 | 0,532 | 0,540 |
| 150 ms | 1,317 | 0,894 | 1,713 | 0,857 |
| 200 ms | 2,352 | 1,215 | 3,553 | 1,166 |
| 250 ms | 3,513 | 1,519 | 5,844 | 1,461 |

## Giữ và đảo lái

Khi giữ lái phải liên tục 650 ms, gia tốc ngang cực đại đo từ vận tốc thực của tâm xe trong trò chơi giảm ở cả hai tốc độ. Góc đổi hướng và độ lệch được đo ngay cuối 650 ms.

| Tốc độ lúc nhấn | Gia tốc ngang cực đại trước → sau | Góc quay thân xe trước → sau | Độ lệch ngang trước → sau |
|---:|---:|---:|---:|
| 100 km/h | 4,74 → 1,15 g | 48,79° → 13,05° | 3,406 → 1,040 m |
| 200 km/h | 9,05 → 1,14 g | 48,83° → 6,72° | 6,413 → 1,017 m |

Ở 60 km/h, giữ phải 250 ms, đổi sang trái 250 ms rồi thả 250 ms. Trong Xuyên Việt, góc lệch còn lại giảm từ 0,783° xuống 0,330° và độ lệch ngang giảm từ 0,869 m xuống 0,584 m. Trong Cúp, góc lệch còn lại giảm từ 0,765° xuống 0,279°.

Ở 12 km/h, sau 650 ms giữ phải, thân xe quay 16,93° trong Xuyên Việt và 16,57° trong Cúp, bằng với bản trước. Khi đứng yên, xe giữ nguyên vị trí. Nhấn 100 ms ở 20 km/h vẫn lệch 0,306 m trong Xuyên Việt và 0,296 m trong Cúp. Cùng thao tác ở 100 km/h trong Cúp, độ lệch tăng từ 0,524 lên 0,561 m.

## Giao thông thưa và đông

Trên CT.04, ở mỗi mức 20, 60, 100, 150 và 200 km/h, nhấn phải 100 ms bằng bàn phím rồi thả 900 ms. Trò chơi tự sinh 6 xe ở chế độ Đường thoáng và 22 xe ở chế độ Phố đông, lần lượt có 2 và 7 xe trong bán kính 100 m khi bắt đầu. Mọi xe khác đều di chuyển hơn 1 m trong mỗi lượt. Kết quả ở hai mật độ và trên đường trống khớp nhau đến 0,001 m.

| Tốc độ lúc nhấn | Độ lệch ngang sau 1 s trước → sau |
|---:|---:|
| 20 km/h | 0,306 → 0,306 m |
| 60 km/h | 0,633 → 0,678 m |
| 100 km/h | 0,528 → 0,565 m |
| 150 km/h | 0,378 → 0,551 m |
| 200 km/h | 0,532 → 0,540 m |

## Cách đo và giới hạn

### Cơ sở từ nghiên cứu người chơi

- **Khả năng đoán được một cú nhấn.** Brown và cộng sự cho 12 người lần lượt chơi *Colin McRae Rally DiRT* bằng bàn phím, tay cầm và vô-lăng. Trong nhận xét về bàn phím, độ dễ dùng có 10 ý kiến tích cực, còn độ nhạy có 3 tích cực và 8 tiêu cực. Có người thích nhấp phím để sửa từng chút, có người khó ước lượng phải nhấn bao nhiêu. Đây là số nhận xét, và 11 trong 12 người ít chơi hoặc chưa chơi game đua xe. Với ViVu3D, điều này gợi ý đo cả dải 50–250 ms thay vì chọn một cú nhấn đại diện. [Brown và cộng sự, bảng 9](https://doi.org/10.1007/978-1-84882-963-3_12)
- **Giữ làn và ôm cua là hai thao tác khác nhau.** Trong mô phỏng bằng vô-lăng ở 100 km/h, 24 tài xế làm tốt hơn với độ nhạy thấp trên đoạn thẳng và độ nhạy cao trong cua. Trong bốn cấu hình, 12 người thích nhất phương án tự đổi độ nhạy, nhưng 10 người xếp nó thứ ba hoặc cuối. Vì vậy phép thử ở đây gồm cả căn làn, giữ lái và bẻ trả. Cách ViVu3D thay đổi góc lái theo tốc độ là quyết định thiết kế riêng. [Melman và cộng sự, *Human Factors*](https://pmc.ncbi.nlm.nih.gov/articles/PMC10900860/)
- **Cảm giác tự nhiên và cảm giác làm chủ xe cần được hỏi riêng.** Trong thử nghiệm *Mario Kart Wii* với 78 người, vô-lăng nghiêng được đánh giá tự nhiên hơn, còn tay cầm analog được chấm cao hơn về khả năng làm chủ và cho thứ hạng về đích tốt hơn. Trên thiết bị di động, thử nghiệm năm cách điều khiển với 24 trẻ 6–14 tuổi chơi game đua xe nhìn từ trên xuống cho thấy cần điều khiển ảo phù hợp hơn với nhóm ít kinh nghiệm trong mẫu đó. Cả hai kết quả đều phụ thuộc vào thiết bị, đối tượng và trò chơi. [Vanden Abeele và cộng sự, FDG](https://www.fdg2013.org/program/papers/paper23_vandenabeele_etal.pdf) · [Rocha và cộng sự, CHI PLAY](https://doi.org/10.1145/3341215.3356302)
- **Đo phản hồi và đo va chạm trả lời hai câu hỏi khác nhau.** Trong mô phỏng lái từ xa với 31 người, cảm giác làm chủ giảm ở độ trễ toàn hệ thống 289 ms so với 89 và 189 ms. Số va chạm không thay đổi có ý nghĩa thống kê. Nghiên cứu thay đổi độ trễ từ lệnh tới phản hồi, còn phép đo 50–250 ms của ViVu3D thay đổi thời gian giữ phím. Để xử lý riêng sai số do khung hình, Xuyên Việt và Cúp tính phần thời gian nút thực sự được giữ trong từng bước vật lý. [Jernberg và cộng sự, 2024](https://doi.org/10.1016/j.trip.2024.101152)

Các nghiên cứu trên định hướng tiêu chí. Các hệ số lái được chọn từ các bản thử trong game, kết hợp phản hồi trực tiếp rằng bản trước có cảm giác cứng. Chưa có thử nghiệm sở thích trên mẫu người chơi ViVu3D. Để đo điều đó có thể cho mỗi người lái cùng một xe trên hai bản giấu tên, đổi thứ tự giữa người chơi, rồi hỏi riêng về độ dễ căn làn, khả năng ôm cua và bản muốn chơi tiếp. Nên ghi nhận bàn phím và điện thoại thật riêng.

### Kiểm thử tự động

Mỗi bản có 54 lượt, tổng cộng 108 lượt đều giữ đủ điểm thân xe và không có tiếp xúc. Chromium 156.0.8078.4 trên Windows nhận phím mũi tên từ Playwright hoặc sự kiện chạm từ Chromium trên nút lái của game. Các cặp phím và chạm có cùng thao tác cho độ lệch, góc quay và gia tốc ngang cực đại khớp trong 0,000001 ở đơn vị tương ứng. Độ lệch ngang tính theo hướng xuất phát, gia tốc ngang tính từ biến thiên vận tốc chiếu lên phương vuông góc với hướng chuyển động ở giữa mỗi bước, lấy 1 g bằng 9,80665 m/s².

Hàm cập nhật gốc chạy theo bước 10 ms, xe trôi tự do sau khi đặt vận tốc đầu. Xuyên Việt dùng siêu xe trên cạnh đường 375982 của CT.04, Cúp dùng siêu xe trên đường đua `river` tại mốc 90 m. Số liệu mô tả phản ứng mô phỏng sau khi game nhận lệnh. Cảm giác của người chơi, độ trễ hiển thị trên điện thoại và FPS cần phép đo riêng.

Để chạy lại, giữ nguyên mã HTML, CSS và JavaScript ngoài bộ truyền động ở commit `aa8bf722` bằng đối số cuối. Đối số đầu chỉ phiên bản `dist/drivetrain.js` cần đo. Tệp JSON ghi từng lượt, gồm cả số xe đang di chuyển và số lần bộ xử lý va chạm ghi nhận tiếp xúc.

```powershell
node tools/smoke/steering-controls.mjs aa8bf722 "$env:TEMP/steering-feel-before.json" aa8bf722
node tools/smoke/steering-controls.mjs working "$env:TEMP/steering-feel-after.json" aa8bf722
```
