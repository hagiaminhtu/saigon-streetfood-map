# 🍲 Ấm Lòng Sài Gòn - Bản Đồ Ẩm Thực Đường Phố (Quận 1 - 3 - 10)

Ứng dụng web bản đồ và hỗ trợ cộng đồng tìm kiếm, ủng hộ những cô chú, cụ bà lớn tuổi và những người có hoàn cảnh khó khăn bán thức ăn đường phố vỉa hè tại **Quận 1, Quận 3 và Quận 10 TP. Hồ Chí Minh**.

---

## 🌟 Tính Năng Nổi Bật

1. **Bản đồ tương tác (Interactive Leaflet Map)**:
   - Tọa độ chính xác các xe đẩy, gánh hàng rong tại Quận 1, Quận 3, Quận 10.
   - Ghim phân loại theo màu sắc từng Quận và biểu tượng từng món ăn (Bánh mì, Hủ tiếu, Bột chiên, Chuối nướng, Chè, Bánh tráng...).
   - Nút **"Vị trí của tôi"** để tự động định vị và đo khoảng cách từ bạn đến từng quán ăn.

2. **Bộ lọc món ăn & Giờ mở cửa (Food Choices & Open Now Status)**:
   - Tìm kiếm nhanh theo tên quán, tên cô chú, tên món ăn, tên đường/hẻm.
   - Lọc theo loại món ăn bằng các nút bấm trực quan.
   - Tính năng **"🟢 Đang mở cửa"**: Tự động đối chiếu giờ thực tế để lọc ra những quán đang bán lúc này.
   - Sắp xếp theo đánh giá, giá cả từ thấp đến cao.

3. **Chỉ đường (Find Direction)**:
   - Ước tính khoảng cách (km) và thời gian di chuyển bằng xe máy / đi bộ.
   - Tích hợp 1 chạm mở trực tiếp ứng dụng **Google Maps** dẫn đường đến tận nơi.

4. **Hộp đánh giá & Lời chúc (Review Box)**:
   - Thực khách có thể chọn số sao (1 đến 5 sao), gắn huy hiệu cảm xúc (*"Ngon bổ rẻ"*, *"Cô chú dễ thương"*, *"Ủng hộ hết mình"*...).
   - Viết lời chúc và động viên gửi đến cô chú bán rong.

5. **Dành cho Chủ Web / Quản trị viên (Owner / Admin Portal)**:
   - Nút **"Chủ Web / Admin"** ở góc phải (Mã PIN mặc định: `admin123`).
   - Thêm quán mới, chỉnh sửa thông tin, xóa quán.
   - Điền đầy đủ: Tên, loại món ăn, quận, địa chỉ, giờ mở cửa sáng/tối, khoảng giá, món đặc trưng, hoàn cảnh mưu sinh, hình ảnh.
   - **Tính năng chọn vị trí thông minh**: Bấm nút **"Bấm chọn vị trí trên bản đồ"** rồi nhấp trực tiếp vào bản đồ Sài Gòn để tự động điền tọa độ chính xác!
   - Nút khôi phục dữ liệu ban đầu (Reset DB) bất cứ lúc nào.

---

## 🚀 Hướng Dẫn Khởi Động

Chỉ cần Python 3 (sẵn có trên máy, không cần cài thêm bất kỳ thư viện pip nào):

```bash
cd /Users/hgmt/.gemini/antigravity/scratch/saigon-streetfood-map
python3 server.py 8080
```

Mở trình duyệt và truy cập:
👉 **http://localhost:8080**

---

## 🧪 Chạy Kiểm Thử Tự Động (Automated Tests)

```bash
python3 test_api.py
```

Tất cả kiểm thử API và cơ sở dữ liệu SQLite sẽ được chạy và báo cáo kết quả.
