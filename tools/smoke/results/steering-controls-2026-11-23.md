# Đo phản hồi lái bằng bàn phím và cảm ứng, 23/11/2026

Trong Xuyên Việt, nhấn lái phải 100 ms rồi thả cho xe trôi thêm 900 ms. Độ lệch ngang là khoảng cách từ tâm xe đến đường thẳng theo hướng xuất phát. Góc quay là mức đổi hướng của thân xe sau một giây.

| Tốc độ lúc nhấn (km/h) | Lệch ngang trước (m) | Lệch ngang sau (m) | Góc quay trước | Góc quay sau |
|---:|---:|---:|---:|---:|
| 0 | 0,000 | 0,000 | 0,00° | 0,00° |
| 20 | 0,306 | 0,306 | 4,69° | 4,69° |
| 60 | 1,868 | 0,633 | 9,55° | 3,03° |
| 100 | 3,844 | 0,528 | 12,02° | 1,51° |
| 150 | 6,450 | 0,378 | 13,81° | 0,73° |
| 200 | 9,049 | 0,532 | 14,91° | 0,79° |

- Ở 12 km/h, giữ lái phải 650 ms vẫn đạt 99,45% hành trình lái ở cả hai bản. Thân xe quay 16,93° trong Xuyên Việt và 16,57° trong Cúp.
- Ở 60 km/h, giữ phải 250 ms, giữ trái 250 ms rồi thả 250 ms. Trong Xuyên Việt, độ lệch ngang cuối lượt giảm từ 1,505 xuống 0,869 m và góc quay còn lại giảm từ 1,40° xuống 0,78°. Cuối pha giữ trái, bản mới đạt 63,8% hành trình về bên trái. Trong Cúp, độ lệch ngang giảm từ 1,492 xuống 0,862 m và góc còn lại giảm từ 1,46° xuống 0,76°.
- Trong Cúp, cú nhấn 100 ms ở 100 km/h làm xe lệch ngang 3,810 m ở bản trước và 0,524 m ở bản sau. Ở 20 km/h, cả hai bản đều lệch 0,296 m.

## Điều kiện đo

Chromium 156.0.8078.4 trên Windows, khung nhìn 844 × 390. Mỗi bản chạy 24 lượt bằng siêu xe trên đường trống và 10 lượt có giao thông. Trên đường trống, Playwright gửi phím mũi tên, hoặc gửi sự kiện chạm qua Chromium đến các nút A/D hiển thị trên màn hình. Các lượt có cùng thao tác bằng phím và chạm cho kết quả khớp nhau trong 0,000001 m và 0,000001°. Cả 68 lượt đều giữ đủ 100 điểm thân xe và bộ xử lý va chạm không ghi nhận tiếp xúc.

Xuyên Việt dùng đoạn thẳng CT.04, cạnh đường 375982. Cúp dùng đường đua `river` tại mốc 90 m. Mỗi lượt bắt đầu từ cùng vị trí của chế độ tương ứng. Bộ thử giữ nguyên hình học đường và xử lý va chạm, rồi chạy hàm cập nhật gốc của trò chơi theo bước 10 ms. Phép đo này xác định quỹ đạo sau khi game nhận lệnh. FPS, độ trễ màn hình và độ nhạy của phần cứng điện thoại cần phép đo riêng.

## Khi có xe khác trên CT.04

Với mỗi bản, ở từng mức 20, 60, 100, 150 và 200 km/h, nhấn phím phải 100 ms rồi thả 900 ms. Trò chơi tự sinh xe theo chế độ đã chọn, cùng chuỗi số ngẫu nhiên và cùng giờ địa phương (12 giờ trưa). Bán kính 100 m tính từ tâm xe người chơi lúc bắt đầu. Chuyển động của từng xe được kiểm tra bằng vị trí đầu và cuối lượt.

| Chế độ | Số xe lúc xuất phát | Trong vòng 100 m | Đã di chuyển trên 1 m sau một giây |
|---|---:|---:|---:|
| Đường thoáng | 6 | 2 | 6 |
| Phố đông | 22 | 7 | 22 |

Trong cả hai chế độ, xe gần nhất cách 36,3 m lúc bắt đầu. Tại từng tốc độ, độ lệch ngang cuối lượt khớp với kết quả đường trống ở bảng trên đến 0,001 m.

## Chi phí CPU của một bước vật lý

Trên cùng máy, Node.js v24.21.0 đo trung vị `DriveBody.step` là **0,1514 µs trước và 0,2035 µs sau**, tăng 0,0521 µs mỗi bước. Mỗi bản khởi động nóng 216.000 bước, sau đó chạy 12 đợt đo, luân phiên thứ tự hai bản. Mỗi đợt đặt lại siêu xe 6.000 lần và cho xe trôi 90 bước mỗi lần, mỗi bước dài 1/90 giây. Tốc độ đầu luân phiên 0, 20, 60, 100, 150 và 200 km/h. Giữ lái phải 23 bước, lái trái 23 bước rồi thả 44 bước. Số liệu này chỉ đo xử lý vật lý trên CPU.

## Chạy lại

Hai lần chạy dùng cùng tài nguyên cục bộ, thay tệp `dist/drivetrain.js`. Bản trước lấy từ commit `8bf435f6`, bản sau có Git blob `75e536c4e91e66f6ad672cb3af5442966633de67`. Chạy từ thư mục gốc với Chromium của Playwright đã cài.

```powershell
node tools/smoke/steering-controls.mjs 8bf435f6 "$env:TEMP/steering-before.json"
node tools/smoke/steering-controls.mjs working "$env:TEMP/steering-after.json"
```
