# Đóng góp cho ViVu3D

- Dùng [mẫu issue](https://github.com/tang-vu/vietnam-driving-simulator/issues/new/choose) để báo lỗi hoặc đề xuất. Với lỗi trên bản đồ, ghi địa danh, tuyến hoặc vị trí nếu biết. Với nội dung sát hạch, gửi nguồn và số câu hoặc bài thi.
- Với thay đổi lớn hoặc đóng góp mã nguồn, hãy trao đổi trước trong issue. Nếu dự án cần quyền sử dụng thương mại đối với phần bạn viết, người duy trì sẽ trao đổi với bạn trước khi hợp nhất. Xem [thông báo bản quyền](LICENSE).
- Khi thêm dữ liệu, hình ảnh hoặc mô hình, ghi nguồn, tác giả và điều khoản phân phối lại trong pull request, rồi cập nhật tệp ghi công tương ứng.

## Chạy thử thay đổi

Các trang chơi và tài nguyên nằm trong `dist/`. Có thể sửa tại đây rồi tải lại trang trên máy. Các công cụ tạo dữ liệu bản đồ nằm trong `tools/`. [Hướng dẫn chạy trên máy](README.md#chạy-trên-máy).

- Khi đổi điều khiển hoặc HUD, thử chế độ liên quan bằng đầu vào bị ảnh hưởng. Khi đổi bản đồ, thử mở điểm xuất phát và lái qua vùng đã sửa. Ghi thiết bị, trình duyệt và kết quả trong pull request.
- Khi thêm mô hình địa danh, kiểm tra mô hình xuất hiện trong **Tùy chọn → Danh lam 3D**, ảnh xem trước tại `dist/landmark-previews/<id>.webp` và liên kết trực tiếp `http://127.0.0.1:8000/?landmark=<id>`. Thay `<id>` bằng mã của mô hình. Thử cả góc ngắm lẫn thao tác **Trở lại xe**. [Tư liệu đối chiếu địa danh](dist/landmark-references.txt).

## Tạo bản phát hành

Mỗi pull request chạy thử bản phát hành trên Chromium: cầm lái, tạm dừng và lái tiếp, xuất phát ở Cúp Bánh Mì, nộp bài lý thuyết và mở bài lý thuyết từ các màn 3D khi WebGL không khả dụng. Để chạy cùng bộ kiểm tra trên máy, build commit cần thử bằng lệnh bên dưới, sau đó vào `tools/smoke/` và chạy `npm ci`, `npx playwright-core install chromium` rồi `npm test`.

Sau khi checkout commit cần phát hành vào thư mục sạch, chạy lệnh sau ở thư mục gốc. Bước này cần Node.js, Git và `tar`.

```sh
node tools/build-site.mjs
```

Lệnh lấy tài nguyên đã commit từ `HEAD:dist`, đóng gói vào `dist/client/` và tạo Worker `dist/server/index.js` cùng `dist/server/wrangler.json`. Khi đóng gói cho Sites, chỉ lấy tài nguyên công khai từ `dist/client/`. Gói phát hành còn có `dist/server/`, cấu hình từ `.openai/hosting.json` và các migration D1 từ `drizzle/`.
