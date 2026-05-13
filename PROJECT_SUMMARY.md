# PROJECT SUMMARY

## 1. Thông Tin Chung

- Tên project: `ecommerce-ai-project`
- Mục tiêu hiện tại: demo website ecommerce ReactJS với shopping flow hoàn chỉnh ở mức frontend, có khu vực Admin để quản lý sản phẩm bằng mock data + `localStorage`
- Trạng thái hiện tại:
  - Frontend shopping flow đã chạy được end-to-end
  - Product source đã chuyển sang mô hình `seed từ JSON -> lưu localStorage -> toàn app đọc cùng một nguồn`
  - Admin frontend đã có CRUD sản phẩm đầy đủ
  - Cart, favorites, orders đang là frontend-only
  - Backend chưa ổn định, không phải phạm vi chính hiện tại
- Cập nhật gần nhất trong summary này: `2026-05-13`

---

## 2. Stack Và Kiến Trúc Đang Dùng

### 2.1 Frontend Stack

- ReactJS
- Vite
- React Router DOM
- Context API
- Axios
- CSS thuần

### 2.2 Backend Stack

- Node.js
- Express
- MongoDB

### 2.3 Nguyên tắc triển khai hiện tại

- Không dùng Redux
- Không dùng UI library
- Không sửa backend trong các task frontend gần đây
- Ưu tiên code đơn giản, dễ đọc, dễ demo
- Ưu tiên `localStorage` cho các tính năng chưa có backend thật

---

## 3. Kiến Trúc Dữ Liệu Sản Phẩm Hiện Tại

Đây là thay đổi quan trọng nhất của project ở giai đoạn hiện tại.

### 3.1 Nguồn seed ban đầu

- File seed: [src/data/products.json](./src/data/products.json)
- Dữ liệu seed hiện có: `20 sản phẩm`
- Nhóm danh mục đang có trong seed:
  - `Laptop`
  - `Điện thoại`
  - `Máy tính bảng`
  - `Màn hình`
  - `Âm thanh`
  - `Phụ kiện`
  - `Nội thất`
- Có sẵn sản phẩm `stock = 0` để test trạng thái hết hàng

### 3.2 Nguồn dữ liệu runtime đang dùng thực tế

- Key localStorage chính cho sản phẩm: `datn_products`
- Tầng xử lý chính: [src/services/productStorage.js](./src/services/productStorage.js)

Flow hiện tại:

1. App load lần đầu
2. `productStorage` kiểm tra `localStorage`
3. Nếu chưa có `datn_products`, hệ thống seed dữ liệu từ `src/data/products.json`
4. Sau đó toàn bộ app đọc sản phẩm từ `localStorage`
5. Admin CRUD sẽ sửa trực tiếp trên `datn_products`
6. Các trang `Home`, `Products`, `ProductDetail`, `Admin` đều dùng cùng nguồn này

### 3.3 Hệ quả quan trọng

- Thêm/sửa/xóa sản phẩm ở Admin sẽ phản ánh ra storefront
- Nếu xóa sạch dữ liệu localStorage rồi reload app, dữ liệu sẽ được seed lại từ `products.json`
- Không cần backend products để demo frontend hiện tại

### 3.4 Chuẩn hóa id

- Toàn app đang chuẩn hóa id theo logic: `product._id || product.id`
- Utility liên quan nằm ở: [src/utils/product.js](./src/utils/product.js)
- Sản phẩm mới trong Admin được tạo id bằng:
  - `crypto.randomUUID()` nếu khả dụng
  - fallback chuỗi theo `Date.now()` + random suffix

---

## 4. Route Map Hiện Tại

Khai báo route nằm ở: [src/App.jsx](./src/App.jsx)

### 4.1 Public/storefront routes

- `/` -> `Home`
- `/products` -> `Products`
- `/products/:id` -> `ProductDetail`
- `/cart` -> `Cart`
- `/favorites` -> `Favorites`
- `/orders` -> `Orders`
- `/login` -> `Login`
- `/register` -> `Register`

### 4.2 Admin routes

- `/admin` -> `AdminDashboard`
- `/admin/products` -> `AdminProducts`

### 4.3 Fallback route

- `*` -> `NotFound`

### 4.4 Lưu ý routing

- App dùng `BrowserRouter`
- Nếu deploy hoặc mở trực tiếp bằng server không có SPA fallback, các route như `/admin`, `/products/abc`, `/orders` có thể bị `404` khi refresh hoặc paste URL trực tiếp
- Khi chạy bằng Vite dev server thì route SPA hoạt động bình thường

---

## 5. Main Layout, Header, Footer

File chính: [src/components/MainLayout.jsx](./src/components/MainLayout.jsx)

### 5.1 Header hiện tại

- Logo: `Nexora`
- Search box ở header
- Link `Admin` luôn hiển thị để tiện test
- Icon `Yêu thích` có badge số lượng
- Icon `Giỏ hàng` có badge số lượng
- Dropdown tài khoản khi user đã đăng nhập:
  - `Đơn hàng`
  - `Đăng xuất`
- Nếu chưa đăng nhập:
  - `Đăng nhập`
  - `Đăng ký`

### 5.2 Những gì đã bỏ khỏi nav chính

- `Yêu thích` và `Giỏ hàng` không còn hiện dạng text trong nav chính
- Chúng chỉ còn ở cụm action cạnh tài khoản

### 5.3 Search hiện tại

- Search dùng `SearchContext`
- Khi submit search ở header:
  - điều hướng sang `/products?search=...`
- Trang `Products` sẽ đồng bộ query string với state search
- Trang `Home` cũng đọc keyword hiện tại để lọc nhóm sản phẩm nổi bật

### 5.4 Dropdown tài khoản

- Hiển thị/ẩn theo hover/focus
- Có transition mượt hơn so với bản đầu
- `Đơn hàng` đã được đưa vào dropdown thay vì nằm riêng trên nav

### 5.5 Footer hiện tại

Footer vừa được nâng cấp để nổi bật hơn.

Nội dung:

- Thương hiệu: `Nexora`
- Mô tả ngắn về project
- Số điện thoại: `0982241317`
- Email: `nguyenminhquang0325@gmail.com`
- Cơ sở 1: `52B ngõ 4 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội`
- Cơ sở 2: `55 Nghiêm Quý Ngãi, Hầm Rồng, tỉnh Thanh Hóa`

Đặc điểm giao diện:

- Nền gradient tối
- Chia block thương hiệu và block thông tin liên hệ
- Có icon điện thoại, email, địa chỉ
- Responsive cơ bản

### 5.6 Icon đang dùng ở header/footer

- Đã import Font Awesome CSS từ thư mục vendor local:
  - `fontawesome-free-7.2.0-web/css/all.min.css`
- `eslint.config.js` đã được chỉnh để bỏ qua lint cho thư mục vendor này

---

## 6. Các Context Và State Chính

### 6.1 AuthProvider

File: [src/context/AuthProvider.jsx](./src/context/AuthProvider.jsx)

Vai trò:

- Quản lý trạng thái user/token frontend
- Giữ logic auth hiện có
- Chưa thay đổi theo hướng mock

### 6.2 SearchProvider

File: [src/context/SearchProvider.jsx](./src/context/SearchProvider.jsx)

Vai trò:

- Đồng bộ keyword search giữa header và các trang
- Đang được `Home` và `Products` sử dụng rõ nhất

### 6.3 CartProvider

File: [src/context/CartProvider.jsx](./src/context/CartProvider.jsx)

Key localStorage:

- `cartItems`

Hành vi hiện tại:

- Lưu giỏ hàng vào `localStorage`
- Chuẩn hóa item bằng utility product
- Tự loại item lỗi
- Tự loại item có `stock = 0` khi đọc từ storage
- Có clamp số lượng theo stock nếu stock tồn tại
- Không cho quantity nhỏ hơn `1`

API context hiện có:

- `cartItems`
- `cartItemCount`
- `cartTotal`
- `addToCart(product, quantity)`
- `removeFromCart(productId)`
- `updateQuantity(productId, quantity)`
- `clearCart()`

### 6.4 FavoritesProvider

File: [src/context/FavoritesProvider.jsx](./src/context/FavoritesProvider.jsx)

Key localStorage:

- `favoriteItems`

Hành vi hiện tại:

- Lưu danh sách yêu thích vào `localStorage`
- Chuẩn hóa item theo id chuẩn
- Không thêm trùng
- Toggle theo `product.id`

API context hiện có:

- `favoriteItems`
- `isFavorite(productId)`
- `toggleFavorite(product)`
- `removeFavorite(productId)`

---

## 7. Services Hiện Tại

### 7.1 Product service

File: [src/services/productService.js](./src/services/productService.js)

Interface hiện tại vẫn giữ dạng async để không phá code cũ:

- `getProducts()`
- `getProductById(id)`
- `createProduct(productData)`
- `updateProduct(productId, productData)`
- `deleteProduct(productId)`

Thực tế phía sau:

- Tất cả gọi vào `productStorage`
- Không gọi backend products

### 7.2 Product storage

File: [src/services/productStorage.js](./src/services/productStorage.js)

Các điểm chính:

- Seed dữ liệu từ JSON
- Persist vào `localStorage`
- Chuẩn hóa:
  - `id`
  - `name`
  - `category`
  - `image`
  - `description`
  - `price`
  - `stock`
  - `createdAt`
  - `updatedAt`
- Có placeholder image mặc định:
  - `https://placehold.co/600x400/e2e8f0/475569?text=No+Image`

### 7.3 Auth service

File: [src/services/authService.js](./src/services/authService.js)

Đã chuẩn hóa base URL:

- đọc từ `import.meta.env.VITE_API_URL`
- fallback: `http://localhost:5000/api`

### 7.4 Product API URL

File: [src/services/productService.js](./src/services/productService.js)

Hiện tại product service không còn phụ thuộc API backend để render storefront và admin. Nguồn chính là `localStorage`.

---

## 8. Trang Chủ - Home

File: [src/pages/Home.jsx](./src/pages/Home.jsx)

### 8.1 Hero section

- Đã đổi từ block nhỏ sang hero slider toàn section
- Có 3 slide placeholder:
  - `Shadow Black`
  - `Pulse Red`
  - `Neon Purple`
- Tự chuyển slide mỗi `3 giây`
- Có dot indicator để chuyển tay
- Nội dung hero overlay lên toàn bộ nền slide

### 8.2 CTA trong hero

- `Xem sản phẩm` -> chuyển tới `/products`
- `Tư vấn AI` -> mở AI chat widget nổi

### 8.3 Sản phẩm nổi bật

- Hiện đang lấy ngẫu nhiên
- Số lượng hiện tại trong code: `12`
- `Xem tất cả` đã được làm lại đẹp hơn, không còn là link xanh mặc định

### 8.4 Search ở Home

- Nếu header có keyword, Home sẽ lọc ngay nhóm featured products theo keyword đó

---

## 9. Trang Products

File: [src/pages/Products.jsx](./src/pages/Products.jsx)

Tính năng hiện tại:

- Lấy danh sách từ product service
- Có loading state
- Có error state
- Có empty state
- Có filter category
- Có search đồng bộ từ header

### 9.1 Logic title hiện tại

- Nếu category là `Tất cả` -> tiêu đề là `Sản phẩm`
- Nếu chọn category cụ thể -> tiêu đề đổi theo category đó

### 9.2 Card sản phẩm

- Toàn bộ card có thể click để vào trang chi tiết
- Không cần bấm đúng nút `Xem chi tiết`

---

## 10. Product Detail

File: [src/pages/ProductDetail.jsx](./src/pages/ProductDetail.jsx)

Đã hoàn thiện:

- Lấy sản phẩm theo `id`
- Chuẩn hóa id theo `product._id || product.id`
- Có loading state
- Có error state
- Có empty state fallback
- Có quantity selector
- Có clamp quantity theo stock
- Nút `Thêm vào giỏ hàng` gọi `CartContext`
- Nút `Yêu thích` gọi `FavoritesContext`
- Nếu hết hàng:
  - disable add to cart
  - hiển thị `Hết hàng`
- Có feedback message sau khi thêm giỏ/yêu thích

---

## 11. Cart

File: [src/pages/Cart.jsx](./src/pages/Cart.jsx)

Tính năng đã có:

- Lấy dữ liệu từ `CartContext`
- Lưu `localStorage`
- Tăng số lượng
- Giảm số lượng
- Không cho nhỏ hơn `1`
- Không cho vượt stock nếu stock tồn tại
- Xóa từng sản phẩm
- Xóa toàn bộ giỏ
- Tính subtotal từng item
- Tính total toàn giỏ
- Có empty cart UI
- Có nút `Tiếp tục mua sắm`
- Có nút `Đặt hàng`

---

## 12. Favorites

File: [src/pages/Favorites.jsx](./src/pages/Favorites.jsx)

Tính năng đã có:

- Lấy dữ liệu từ `FavoritesContext`
- Lưu `localStorage`
- Toggle yêu thích theo product id
- Không thêm trùng sản phẩm
- Có empty favorite UI
- Có thể xóa favorite
- Có thể chuyển sản phẩm yêu thích sang giỏ hàng

---

## 13. Orders

File: [src/pages/Orders.jsx](./src/pages/Orders.jsx)

Đây là checkout frontend-only.

### 13.1 Form hiện có

- `fullname`
- `phone`
- `address`
- `note`

### 13.2 Validation hiện có

- `fullname` bắt buộc
- `phone` bắt buộc
- `address` bắt buộc
- `phone` validate theo regex số Việt Nam:
  - `/^(0|\\+84)(3|5|7|8|9)\\d{8}$/`

### 13.3 Summary hiện có

- Hiển thị danh sách item từ cart
- Tính:
  - `cartTotal`
  - `shippingFee`
  - `total`

### 13.4 Shipping fee

- Hằng số hiện tại: `30000`

### 13.5 Hành vi submit

- Không gọi backend
- Hiển thị message thành công
- Clear cart
- Reset form
- Tự điều hướng về `/products` sau khoảng `1.2s`

### 13.6 Trường hợp giỏ trống

- Hiển thị empty state
- Có nút quay lại `/products`

---

## 14. AI Consultant

File: [src/components/AIConsultantWidget.jsx](./src/components/AIConsultantWidget.jsx)

### 14.1 Trạng thái hiện tại

- Không còn là page/route riêng
- Đã chuyển thành chat widget nổi ở góc màn hình
- Khi đóng là nút tròn `AI`
- Khi mở là panel chat

### 14.2 Cách mở widget

- Bấm nút tròn ở góc màn hình
- Hoặc bấm CTA `Tư vấn AI` trên hero của trang Home
- `Home` mở widget qua custom event:
  - `open-ai-consultant-widget`

### 14.3 Logic tư vấn hiện tại

- Chưa gọi AI thật
- Đang là rule-based keyword matching
- Một số keyword đang có:
  - `học`
  - `làm việc`
  - `nghe nhạc`
  - `chơi game`
  - `rẻ`

### 14.4 UI/UX hiện tại

- Có transition mở/đóng mượt hơn trước
- Panel không còn bật tắt cứng
- Có FAB thu gọn

---

## 15. Admin Frontend

Đây là module lớn nhất được thêm gần đây.

### 15.1 Route Admin

- `/admin`
- `/admin/products`

### 15.2 Admin link

- Luôn hiển thị trên header
- Chưa có protected route
- Chưa có kiểm tra role thật

### 15.3 Admin layout

File: [src/components/admin/AdminLayout.jsx](./src/components/admin/AdminLayout.jsx)

Có:

- heading khu vực quản trị
- sidebar điều hướng
- 2 mục:
  - `Tổng quan`
  - `Quản lý sản phẩm`

### 15.4 Admin dashboard

File: [src/pages/admin/AdminDashboard.jsx](./src/pages/admin/AdminDashboard.jsx)

Hiển thị:

- Tổng số sản phẩm
- Tổng số sản phẩm còn hàng
- Tổng số sản phẩm hết hàng
- Tổng số danh mục
- Nút `Quản lý sản phẩm`

### 15.5 Admin products

File: [src/pages/admin/AdminProducts.jsx](./src/pages/admin/AdminProducts.jsx)

#### Dữ liệu

- Đọc từ cùng product source với storefront
- Có loading state
- Có error state
- Có success message bằng state

#### Bảng quản lý

Các cột:

- Ảnh
- Tên sản phẩm
- Danh mục
- Giá
- Tồn kho
- Trạng thái
- Hành động

#### Search / filter / sort

- Search theo tên sản phẩm
- Filter category
- Filter trạng thái:
  - `Tất cả`
  - `Còn hàng`
  - `Hết hàng`
- Sort:
  - `Mới nhất`
  - `Giá tăng dần`
  - `Giá giảm dần`
  - `Tồn kho tăng dần`
  - `Tồn kho giảm dần`

#### Tạo sản phẩm

Form có:

- `name`
- `category`
- `price`
- `image`
- `description`
- `stock`

Validation:

- name bắt buộc
- category bắt buộc
- price bắt buộc và `>= 0`
- stock bắt buộc và `>= 0`
- image trống thì dùng placeholder
- description có thể trống

Sau khi tạo:

- lưu vào `datn_products`
- cập nhật lại list tại chỗ
- hiện message thành công
- reset form

#### Sửa sản phẩm

- Có nút `Sửa` trên từng dòng
- Dữ liệu đổ sẵn vào form
- Không đổi id sản phẩm
- Save xong cập nhật localStorage và danh sách hiển thị

#### Xóa sản phẩm

- Có nút `Xóa`
- Có `window.confirm`
- Xóa khỏi `localStorage`
- Tự cập nhật lại bảng
- Nếu sản phẩm đang được mở trong form hoặc modal detail thì có xử lý reset an toàn

#### Xem chi tiết nhanh

- Có nút `Xem`
- Mở modal chi tiết nhanh
- Hiển thị:
  - ảnh
  - tên
  - category
  - giá
  - tồn kho
  - trạng thái
  - mô tả

### 15.6 Layout Admin đã được nới

Đã có điều chỉnh để route Admin rộng hơn storefront:

- `main-content admin-page-content`
- mục tiêu: tránh layout quá chật cho bảng quản trị

### 15.7 Tối ưu UI admin gần đây

- Cột `Hành động` đã được nới
- Nhóm nút `Xem / Sửa / Xóa` đã được chuyển sang layout dễ nhìn hơn
- Trang Admin không còn bị bó quá cứng trong khung storefront

---

## 16. Auth

Files liên quan:

- [src/context/AuthProvider.jsx](./src/context/AuthProvider.jsx)
- [src/services/authService.js](./src/services/authService.js)
- [src/pages/Login.jsx](./src/pages/Login.jsx)
- [src/pages/Register.jsx](./src/pages/Register.jsx)

Trạng thái:

- Giữ nguyên logic auth frontend hiện có
- Chưa thêm phân quyền admin thật
- Chưa ẩn nút `Admin` theo role
- Đây là chủ đích để tiện test UI quản trị

---

## 17. Utility Và Helper Quan Trọng

### 17.1 Product utils

File: [src/utils/product.js](./src/utils/product.js)

Vai trò:

- Chuẩn hóa product object
- Chuẩn hóa id
- Lấy stock an toàn

### 17.2 Format currency

File: [src/utils/formatCurrency.js](./src/utils/formatCurrency.js)

Vai trò:

- Format giá tiền hiển thị ở storefront và admin

---

## 18. CSS Và Giao Diện

CSS chính đang tập trung phần lớn ở:

- [src/App.css](./src/App.css)

### 18.1 Các cải tiến UI đã có

- Hero slider full-section
- CTA `Xem tất cả` đẹp hơn link mặc định
- Product card click toàn bộ
- Account dropdown mượt hơn
- AI widget có transition mở/đóng
- Header icon + badge rõ ràng hơn
- Footer nổi bật hơn
- Admin có layout riêng rộng hơn storefront

### 18.2 Responsive

- App có responsive cơ bản
- Admin table vẫn là khu vực cần tiếp tục theo dõi nếu thêm nhiều cột hoặc text dài

---

## 19. Danh Sách File Quan Trọng

### 19.1 App shell và routing

- [src/App.jsx](./src/App.jsx)
- [src/components/MainLayout.jsx](./src/components/MainLayout.jsx)
- [src/App.css](./src/App.css)

### 19.2 Storefront pages

- [src/pages/Home.jsx](./src/pages/Home.jsx)
- [src/pages/Products.jsx](./src/pages/Products.jsx)
- [src/pages/ProductDetail.jsx](./src/pages/ProductDetail.jsx)
- [src/pages/Cart.jsx](./src/pages/Cart.jsx)
- [src/pages/Favorites.jsx](./src/pages/Favorites.jsx)
- [src/pages/Orders.jsx](./src/pages/Orders.jsx)

### 19.3 Admin pages

- [src/components/admin/AdminLayout.jsx](./src/components/admin/AdminLayout.jsx)
- [src/pages/admin/AdminDashboard.jsx](./src/pages/admin/AdminDashboard.jsx)
- [src/pages/admin/AdminProducts.jsx](./src/pages/admin/AdminProducts.jsx)

### 19.4 Contexts

- [src/context/AuthProvider.jsx](./src/context/AuthProvider.jsx)
- [src/context/SearchProvider.jsx](./src/context/SearchProvider.jsx)
- [src/context/CartProvider.jsx](./src/context/CartProvider.jsx)
- [src/context/FavoritesProvider.jsx](./src/context/FavoritesProvider.jsx)

### 19.5 Services

- [src/services/authService.js](./src/services/authService.js)
- [src/services/productService.js](./src/services/productService.js)
- [src/services/productStorage.js](./src/services/productStorage.js)

### 19.6 Data và utils

- [src/data/products.json](./src/data/products.json)
- [src/utils/product.js](./src/utils/product.js)
- [src/utils/formatCurrency.js](./src/utils/formatCurrency.js)

### 19.7 AI widget

- [src/components/AIConsultantWidget.jsx](./src/components/AIConsultantWidget.jsx)

---

## 20. LocalStorage Keys Đang Dùng

- `datn_products` -> nguồn dữ liệu sản phẩm frontend hiện tại
- `cartItems` -> giỏ hàng
- `favoriteItems` -> danh sách yêu thích
- auth keys -> tùy theo `AuthProvider` hiện tại

Lưu ý:

- Khi test dữ liệu admin/storefront, nên chú ý localStorage vì dữ liệu sẽ được giữ qua nhiều lần reload
- Nếu muốn quay về seed mặc định, cần xóa `datn_products`

---

## 21. Cấu Hình Môi Trường

### 21.1 Frontend env

File: [.env.example](./.env.example)

Giá trị mẫu:

```env
VITE_API_URL=http://localhost:5000/api
```

### 21.2 Thực tế sử dụng

- Auth service dùng `VITE_API_URL`
- Product flow hiện tại không cần backend API để hoạt động UI

---

## 22. Tình Trạng Backend

Backend hiện tại không phải trọng tâm nhưng cần ghi rõ để tránh hiểu sai.

### 22.1 Điều đã kiểm tra

- Express server có thể start
- Nhưng MongoDB không kết nối được

### 22.2 Lỗi đã ghi nhận

```txt
MongoDB connection failed: querySrv ECONNREFUSED _mongodb._tcp.cluster0.64oragq.mongodb.net
```

### 22.3 Ý nghĩa

- `server.js` không phải điểm hỏng chính
- Vấn đề nằm ở kết nối Mongo Atlas hoặc DNS/network
- Các route cần DB như `auth` và `products` sẽ không ổn định nếu Mongo chưa lên

### 22.4 Kết luận thực tế

- Frontend hiện đã được tách đủ để demo mà không lệ thuộc API products
- Backend chưa nên được dùng làm nguồn dữ liệu chính cho phần sản phẩm ở giai đoạn này

---

## 23. Luồng Demo Người Dùng Hiện Tại

### 23.1 Shopping flow

`Home / Products -> Product Detail -> Add to Cart -> Cart -> Orders`

### 23.2 Favorite flow

`Products / Product Detail -> Toggle Favorite -> Favorites -> Move to Cart`

### 23.3 Admin flow

`Header -> Admin -> Dashboard -> Quản lý sản phẩm -> Thêm / Sửa / Xóa / Xem`

### 23.4 AI flow

`Home hoặc mọi trang -> mở nút AI góc màn hình -> nhập nhu cầu -> nhận gợi ý keyword-based`

---

## 24. Những Điểm Cần Lưu Ý Khi Mở Phiên Làm Việc Mới

### 24.1 Không được vô tình phá các phần sau

- Search ở header
- Badge cart/favorites
- Dropdown account
- Shopping flow hiện có
- Product source đang dùng chung qua `localStorage`
- Admin CRUD đang phản ánh ra storefront

### 24.2 Những giả định đúng ở thời điểm hiện tại

- Product data mặc định đến từ `products.json`, nhưng runtime đọc từ `datn_products`
- Admin chưa có role thật
- Orders chưa gọi backend
- AI Consultant chưa dùng AI thật

### 24.3 Nếu thấy dữ liệu “không giống file JSON”

Nguyên nhân thường là:

- `localStorage` đang giữ dữ liệu cũ của `datn_products`

Cách xử lý:

- xóa `datn_products` trong localStorage
- reload app để seed lại từ `products.json`

---

## 25. Kết Quả Verify Gần Đây

Các thay đổi frontend gần đây đã nhiều lần chạy:

- `npm run lint`
- `npm run build`

Trạng thái gần nhất:

- `lint` pass
- `build` pass

Lưu ý:

- Sau mỗi đợt chỉnh UI/logic quan trọng, nên chạy lại 2 lệnh này để tránh làm hỏng project

---

## 26. Backlog Hợp Lý Cho Phiên Tiếp Theo

### 26.1 Ưu tiên cao

- Đồng bộ realtime dữ liệu storefront khi Admin CRUD mà không cần reload route
- Nút reset `datn_products` về seed mặc định
- Bảo vệ UI Admin bằng auth/mock role nếu cần demo role

### 26.2 UI/UX

- Thay hero placeholder bằng ảnh thật
- Tối ưu bảng Admin cho desktop nhỏ/mobile
- Thêm auto-scroll cho AI widget
- Thêm quick suggestion chip trong AI widget

### 26.3 Nâng cấp nghiệp vụ

- Làm backend thật cho cart/favorites/orders
- Kết nối lại product API thật khi backend ổn định
- Quản lý đơn hàng trong Admin

### 26.4 Hạ tầng

- Sửa kết nối MongoDB backend
- Thiết lập SPA fallback khi deploy với `BrowserRouter`

---

## 27. Kết Luận Ngắn

Project hiện đã ở trạng thái có thể demo tốt phần frontend ecommerce:

- có storefront
- có chi tiết sản phẩm
- có giỏ hàng
- có yêu thích
- có checkout frontend-only
- có AI widget giao diện
- có Admin CRUD sản phẩm

Điểm cốt lõi cần nhớ nhất:

- nguồn dữ liệu sản phẩm hiện tại là `localStorage` key `datn_products`
- Admin và storefront đang dùng chung nguồn đó
- backend chưa ổn định, không nên xem là nguồn dữ liệu chính cho sản phẩm ở thời điểm này
