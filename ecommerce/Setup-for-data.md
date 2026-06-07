# PROJECT CONTEXT - ĐỒ ÁN QUẢN LÝ SHOP ĐIỆN TỬ

## Mục tiêu dự án

Đây là đồ án tốt nghiệp về **hệ thống quản lý bán hàng và quản lý kho cho shop điện tử**.

Dự án không chỉ là website bán hàng đơn thuần mà còn tập trung vào:

- Quản lý sản phẩm.
- Quản lý xuất kho.
- Quản lý nhập kho.
- Theo dõi tồn kho.
- Cảnh báo sắp hết hàng.
- Dashboard thống kê.
- Quản lý đơn hàng.
- Phân quyền Admin/User.
- Tích hợp AI hỗ trợ tư vấn sản phẩm trong tương lai.

Ngoài file `PROJECT_SUMMARY.md`, hãy coi nội dung dưới đây là **nguồn sự thật mới nhất**.

---

# Những gì đã hoàn thành

## 1. Kiến trúc dữ liệu sản phẩm

Đã thống nhất sử dụng schema sản phẩm dạng:

```js
{
    name: "",
    category: "",
    brand: "",
    price: 0,
    stock: 0,
    minStockLevel: 0,
    images: [],
    description: "",
    specifications: {}
}
```

Trong đó:

- `stock`: số lượng tồn kho hiện tại.
- `minStockLevel`: ngưỡng cảnh báo tồn kho.
- `images`: để trống (`[]`) vì ảnh sẽ được thêm thủ công sau.
- `description`: mô tả dài chuẩn ecommerce + SEO.
- `specifications`: thông số kỹ thuật riêng theo danh mục.

---

# 2. Đã hoàn thành dữ liệu seed điện thoại

Đã thống nhất seed dữ liệu theo phong cách:

- Description dài.
- Chuẩn ecommerce.
- Có yếu tố SEO.
- Phù hợp cho AI tư vấn.
- Phù hợp trình diễn đồ án.

Mỗi description gồm:

1. Giới thiệu sản phẩm.
2. Hiệu năng.
3. Màn hình.
4. Pin.
5. Camera.
6. Đối tượng phù hợp.

---

# 3. Danh mục điện thoại đã hoàn thành

Tổng cộng: 36 sản phẩm.

## Apple (8)

- iPhone 16 128GB
- iPhone 16 Plus 128GB
- iPhone 16 Pro 256GB
- iPhone 16 Pro Max 256GB
- iPhone 15 128GB
- iPhone 15 Plus 128GB
- iPhone 15 Pro 256GB
- iPhone 15 Pro Max 256GB

---

## Samsung (8)

- Galaxy S26 256GB
- Galaxy S26+ 256GB
- Galaxy S26 Ultra 512GB
- Galaxy Z Fold 8 512GB
- Galaxy Z Flip 8 256GB
- Galaxy A56 256GB
- Galaxy A36 128GB
- Galaxy A26 128GB

---

## Xiaomi / Redmi / POCO (8)

- Xiaomi 16 256GB
- Xiaomi 16 Pro 512GB
- Xiaomi 16 Ultra 512GB
- Redmi Note 15 Pro 256GB
- Redmi Note 15 Pro+ 512GB
- Redmi 15 128GB
- POCO F8 Pro 512GB
- POCO X8 Pro 256GB

---

## OPPO (5)

- OPPO Find X9 256GB
- OPPO Find X9 Pro 512GB
- OPPO Reno 15 256GB
- OPPO Reno 15 Pro 512GB
- OPPO A5 Pro 128GB

---

## vivo (4)

- vivo X300 256GB
- vivo X300 Pro 512GB
- vivo V50 256GB
- vivo Y39 128GB

---

## Google Pixel (3)

- Google Pixel 10 128GB
- Google Pixel 10 Pro 256GB
- Google Pixel 10 Pro XL 512GB

---

# 4. Quy tắc seed dữ liệu

Ảnh:

```js
images: [];
```

Ảnh sẽ được thêm thủ công sau.

---

Stock:

- Flagship:
  - stock: 15–50
  - minStockLevel: 5–10

- Tầm trung:
  - stock: 40–80
  - minStockLevel: 10–15

- Phổ thông:
  - stock: 80–120
  - minStockLevel: 15–20

---

Description:

- 100–150 từ.
- Chuẩn ecommerce.
- Có yếu tố SEO.
- Không quá ngắn.
- Không dùng lorem ipsum.
- Đủ chất lượng để hiển thị ở Product Detail.

---

# 5. Hướng phát triển tiếp theo

Sau điện thoại sẽ seed thêm:

## Laptop (~20–25 sản phẩm)

Bao gồm:

- MacBook Air
- MacBook Pro
- ASUS Vivobook
- ASUS TUF Gaming
- Dell Inspiron
- Dell XPS
- Acer Nitro
- Lenovo LOQ
- Lenovo ThinkPad
- HP Pavilion

---

## Máy tính bảng (~8–10 sản phẩm)

- iPad Gen
- iPad Air
- iPad Pro
- Galaxy Tab
- Xiaomi Pad

---

## Tai nghe (~10–15 sản phẩm)

- AirPods
- Galaxy Buds
- Sony
- JBL
- Soundcore

---

## Đồng hồ thông minh (~8–10 sản phẩm)

- Apple Watch
- Galaxy Watch
- Xiaomi Watch
- Amazfit

---

## Phụ kiện (~15–20 sản phẩm)

- Cáp sạc
- Củ sạc
- Pin dự phòng
- Ốp lưng
- Dán màn hình
- Giá đỡ điện thoại

---

# 6. Mục tiêu tổng dữ liệu

Dự án hướng tới khoảng:

```text
100–120 sản phẩm
```

Mục đích:

- Test quản lý xuất nhập kho.
- Test cảnh báo tồn kho.
- Test dashboard thống kê.
- Test tìm kiếm/lọc sản phẩm.
- Test AI tư vấn sản phẩm.
- Trình diễn đồ án trước hội đồng.

---

# 7. Yêu cầu khi hỗ trợ tiếp

Khi hỗ trợ dự án này:

- Ưu tiên tính thực tế hơn là học thuật.
- Viết code theo hướng production-ready.
- Nếu tạo dữ liệu mẫu, phải đồng nhất format.
- Nếu viết prompt cho Codex:
  - yêu cầu Codex tự test;
  - tạo migration/seeder nếu cần;
  - không chỉ sinh code mà phải đảm bảo chạy được.

- Luôn cân nhắc đến module quản lý kho (xuất/nhập/tồn) vì đây là trọng tâm của đồ án.

Nếu có mâu thuẫn giữa PROJECT_SUMMARY.md và tài liệu này, hãy hỏi lại để xác nhận trước khi tiếp tục.
