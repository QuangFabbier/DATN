# PROJECT SUMMARY

## 1. Thông Tin Chung

- Tên project: `ecommerce-ai-project`
- Storefront branding hiện tại: `Nexora`
- Mục tiêu hiện tại:
  - website ecommerce ReactJS ở mức frontend hoàn chỉnh
  - có shopping flow rõ ràng
  - có khu vực Admin CRUD sản phẩm
  - có khu vực Admin quản lý đơn hàng
  - migrate dần từng phase sang backend thật nhưng không phá flow frontend hiện có
- Trạng thái hiện tại:
  - storefront đã được nâng UX/UI theo hướng modern ecommerce
  - shopping flow vẫn là frontend-only cho cart / favorites / orders
  - admin có:
    - CRUD sản phẩm vẫn frontend-first (source chính đang là localStorage ở FE)
    - quản lý đơn hàng frontend-only
  - backend auth đã hoạt động và đã mở rộng thêm avatar API
  - backend products đã có CRUD MongoDB đầy đủ (phase 1), FE sẽ migrate dần sau
  - đã có dark mode, compare, quick view, mini cart, toast, skeleton, progress bar, mobile nav
  - đã có account center đầy đủ ở `/account/*`
  - đã có nhóm trang policy riêng:
    - `/privacy-policy`
    - `/warranty-policy`
    - `/return-policy`
    - `/terms-of-use`
    - `/shipping-inspection-policy`
  - checkout `/orders` hiện đã tách thành 2 màn nội bộ:
    - `Thông tin`
    - `Thanh toán`
  - bước thanh toán hiện có 2 lựa chọn:
    - `Thanh toán bằng QR`
    - `Thanh toán khi nhận hàng`
  - khi submit checkout:
    - tạo order record trong `localStorage` key `nexora_orders`
    - status mặc định `pending`
    - Admin Orders và Account Orders đọc realtime cùng source này
- Cập nhật gần nhất trong summary này: `2026-05-18`

### 1.1 Cập Nhật Mới (2026-05-15)

- Đã tái cấu trúc repository để root chỉ còn 1 thư mục:
  - `ecommerce/`
  - bên trong tách rõ:
    - `fe/` (frontend)
    - `be/` (backend)
- Đã cập nhật workspace scripts tại `ecommerce/package.json`:
  - `npm run dev:fe` -> chạy FE từ `fe`
  - `npm run dev:be` -> chạy BE từ `be`
  - `npm run build`, `npm run lint` -> chạy cho FE trong cấu trúc mới
- Đã thêm tài liệu setup sau khi pull/clone:
  - [SETUP_AFTER_PULL.md](./SETUP_AFTER_PULL.md)
- Đã chỉnh UI trang checkout `/orders` (khối "Đơn hàng hiện tại"):
  - fix lỗi dính/chèn layout giữa header, danh sách sản phẩm, breakdown và tổng thanh toán
  - bỏ hiển thị badge phương thức thanh toán trong summary panel (tránh gây hiểu nhầm)
  - tăng khoảng cách và đồng bộ typography để gần với style chung của project
  - fix lỗi đường kẻ ngang chèn lên item đầu tiên
- Đã verify kỹ thuật sau các thay đổi:
  - `npm run lint` pass
  - `npm run build` pass

### 1.2 Cập Nhật Backend Mới (2026-05-15)

- Đã hoàn thành phase 1 backend cho Product CRUD với MongoDB:
  - `GET /api/products`
  - `GET /api/products/:id`
  - `POST /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- Đã chuẩn hóa backend architecture theo hướng MVC:
  - `config/db.js`
  - `models/Product.js`
  - `controllers/productController.js`
  - `routes/productRoutes.js`
  - `middleware/errorMiddleware.js`
  - `utils/asyncHandler.js`
- Đã có seeder products đọc từ FE source:
  - `be/seeders/seedProducts.js` đọc `fe/src/data/products.json`
  - clear collection trước khi insert
- Đã mở rộng auth backend để lưu avatar user trong MongoDB:
  - `PUT /api/auth/me/avatar`
  - `GET /api/auth/me/avatar`
  - `DELETE /api/auth/me/avatar`
  - `GET /api/auth/me` trả thêm `hasAvatar`, `avatarUrl`, `avatarUpdatedAt`
- Logic avatar thay ảnh theo kiểu replace:
  - upload ảnh mới sẽ ghi đè dữ liệu ảnh cũ trong document user
  - không giữ nhiều bản avatar cho cùng user

### 1.3 Cập Nhật Frontend-Backend Integration (2026-05-15)

- Đã chuyển `fe/src/services/productService.js` sang gọi backend API thật:
  - `GET /api/products`
  - `GET /api/products/:id`
  - `POST /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- Đã migrate Admin Products khỏi localStorage flow:
  - load/create/update/delete đều chạy qua MongoDB backend
  - sau thao tác CRUD, UI cập nhật realtime không cần F5
  - giữ nguyên skeleton/spinner/toast/empty-state hiện tại
- Đã chuẩn hóa thêm logic `product._id`/`product.id` ở các màn dễ lỗi:
  - `AdminProducts`
  - `Products`
  - `ProductDetail`
  - `QuickViewModal`
  - `Favorites`
  - `AccountWishlist`

### 1.4 Cập Nhật Form Admin Products (2026-05-18)

- Đã review nhanh luồng form thêm/sửa sản phẩm tại `AdminProducts`.
- Đã chỉnh modal form theo hướng giảm scroll không mong muốn:
  - khóa scroll nền trang khi mở form thêm/sửa
  - modal form mặc định không bật scroll dọc
  - chỉ bật scroll dọc khi có preview ảnh (nội dung nở cao do thêm ảnh)
- Đã tối ưu block upload ảnh để form gọn hơn trên màn hình nhỏ:
  - giảm chiều cao tối thiểu dropzone
  - giảm padding nội bộ dropzone
- Đã tinh chỉnh thêm (vòng 2) để tránh scrollbar không cần thiết trong modal form:
  - giảm padding viền ngoài backdrop modal
  - tăng chiều cao hữu dụng của modal (`max-height` theo `100dvh`)
  - giảm padding/gap bên trong `admin-product-form-card`
  - giảm chiều cao preview ảnh và textarea trong form
- File liên quan:
  - `fe/src/pages/admin/AdminProducts.jsx`
  - `fe/src/App.css`

### 1.5 Cập Nhật Đồng Bộ Hồ Sơ Theo Tài Khoản (2026-05-18)

- Đã fix lỗi profile/avatar bị dùng chung giữa nhiều tài khoản trên cùng trình duyệt.
- Nguyên nhân: `accountStorage` trước đây lưu theo key tĩnh (`nexora_profile`, `nexora_addresses`, ...).
- Đã chuyển sang storage có scope theo user:
  - ưu tiên `user.id`
  - fallback theo `user.email`
  - guest vẫn tương thích ngược với key cũ
- Đã cập nhật `AccountProfile` để lưu/đọc hồ sơ và địa chỉ theo user hiện tại.
- Đã cập nhật header account ở `MainLayout`:
  - avatar dropdown lấy từ profile storage của user
  - tên hiển thị ưu tiên `displayName/fullName` thay vì chỉ `user.name`
- File liên quan:
  - `fe/src/services/accountStorage.js`
  - `fe/src/pages/account/AccountProfile.jsx`
  - `fe/src/components/MainLayout.jsx`

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
- Mongoose
- Dotenv
- Cors
- Nodemon

### 2.3 Nguyên tắc triển khai hiện tại

- Không dùng Redux
- Không dùng UI framework lớn
- Không rewrite toàn bộ frontend khi migrate backend
- Ưu tiên frontend demo self-contained, dễ đọc, dễ thuyết trình
- Ưu tiên migrate backend theo phase nhỏ, có thể rollback/fallback

---

## 3. Kiến Trúc Dữ Liệu Sản Phẩm Hiện Tại

### 3.1 Nguồn seed ban đầu

- File seed FE: [fe/src/data/products.json](./fe/src/data/products.json)
- Dữ liệu seed hiện có: `20 sản phẩm`
- Các danh mục đang có:
  - `Laptop`
  - `Điện thoại`
  - `Máy tính bảng`
  - `Màn hình`
  - `Âm thanh`
  - `Phụ kiện`
  - `Nội thất`
- Có sẵn sản phẩm `stock = 0` để test trạng thái hết hàng

### 3.2 Nguồn dữ liệu runtime thực tế

- Key localStorage chính cho sản phẩm: `datn_products`
- Tầng xử lý chính FE: [fe/src/services/productStorage.js](./fe/src/services/productStorage.js)
- Backend phase 1 đã sẵn sàng ở:
  - `be/models/Product.js`
  - `be/controllers/productController.js`
  - `be/routes/productRoutes.js`

Flow:

1. App load
2. `productStorage` kiểm tra `localStorage`
3. Nếu chưa có `datn_products`, seed từ `fe/src/data/products.json`
4. Sau đó toàn app đọc sản phẩm từ `localStorage`
5. Admin create/update/delete ghi trực tiếp vào key này
6. Storefront và admin luôn dùng cùng một source

### 3.3 Chuẩn hóa dữ liệu sản phẩm

- Utility liên quan: [fe/src/utils/product.js](./fe/src/utils/product.js)
- Logic chuẩn hóa chính:
  - `id` ưu tiên `product._id || product.id`
  - normalize `price`
  - normalize `stock`
  - normalize `image`
  - auto sinh `images[]` nếu sản phẩm chỉ có `image`
- Product detail và quick view hiện đã hỗ trợ gallery nhiều ảnh thông qua:
  - `image`
  - `images`

### 3.4 Hệ quả quan trọng

- Thêm/sửa/xóa ở Admin phản ánh ra storefront ngay
- Xóa sạch `localStorage` rồi reload sẽ seed lại từ `products.json`
- FE hiện vẫn chạy ổn dù backend products chưa được FE consume full
- Có thể migrate dần từng màn sang `/api/products` mà không phá UX hiện tại

---

## 4. Route Map Hiện Tại

Khai báo route nằm ở: [fe/src/App.jsx](./fe/src/App.jsx)

### 4.1 Public/storefront routes

- `/` -> `Home`
- `/products` -> `Products`
- `/products/:id` -> `ProductDetail`
- `/cart` -> `Cart`
- `/favorites` -> `Favorites`
- `/orders` -> `Orders`
- `/privacy-policy` -> `PrivacyPolicy`
- `/warranty-policy` -> `WarrantyPolicy`
- `/return-policy` -> `ReturnPolicy`
- `/login` -> `Login`
- `/register` -> `Register`
- `/account` -> redirect `/account/profile`
- `/account/settings` -> redirect `/account/profile`
- `/account/profile` -> `AccountProfile`
- `/account/security` -> `AccountSecurity`
- `/account/addresses` -> `AccountAddresses`
- `/account/orders` -> `AccountOrders`
- `/account/wishlist` -> `AccountWishlist`
- `/account/notifications` -> `AccountNotifications`
- `/account/appearance` -> `AccountAppearance`
- `/account/ai-preferences` -> `AccountAIPreferences`

### 4.2 Admin routes

- `/admin` -> `AdminDashboard`
- `/admin/products` -> `AdminProducts`
- `/admin/orders` -> `AdminOrders`

### 4.3 Fallback route

- `*` -> `NotFound`

### 4.4 Routing notes

- App dùng `BrowserRouter`
- Có `ScrollToTop` để đổi route là cuộn về đầu trang
- Có top route progress bar riêng
- Nếu deploy không có SPA fallback thì các route deep link vẫn có thể `404` khi refresh trực tiếp

---

## 5. Main Layout, Header, Footer

File chính: [fe/src/components/MainLayout.jsx](./fe/src/components/MainLayout.jsx)

### 5.1 Header hiện tại

- Logo header dùng `src/assets/image/logo.png`
- Search form ở giữa:
  - submit sẽ điều hướng sang `/products?search=...`
- Header actions:
  - `Admin`
  - `Yêu thích` có badge
  - `Giỏ hàng` có badge
  - account dropdown
- Có top progress bar khi chuyển route
- Có micro-interaction cho badge cart/favorite khi thao tác
- Tooltip UI trước đây đã được bỏ khỏi header để tránh vấn đề overflow/che nội dung

### 5.2 Navigation hiện tại

- Main nav đang có:
  - `Trang chủ`
  - `Sản phẩm`
  - `Danh mục`
- `Danh mục` hiện là mega menu đơn giản:
  - lấy category từ dữ liệu sản phẩm
  - click sẽ điều hướng sang `/products?category=...`
- Trên mobile có:
  - hamburger drawer
  - bottom navigation fixed

### 5.3 Mini Cart

- Header cart hiện có dropdown mini cart
- Hiển thị:
  - ảnh
  - tên
  - quantity
  - subtotal
- Có nút:
  - `Xem giỏ hàng`
  - `Thanh toán`

### 5.4 Account dropdown

- Nếu đã đăng nhập:
  - `Tài khoản` -> `/account/profile`
  - `Lịch sử mua` -> `/account/orders`
  - toggle dark/light mode
  - `Đăng xuất`
- Nếu chưa đăng nhập:
  - `Đăng nhập`
  - `Đăng ký`
  - toggle dark/light mode

### 5.5 Footer hiện tại

- Footer đang là layout 3 cột + service bar + copyright bar
- Nội dung:
  - brand card
  - contact card
  - policy card
- Contact đang chứa:
  - `0982241317`
  - `nguyenminhquang0325@gmail.com`
  - `52B ngõ 4 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội`
  - `55 Nghiêm Quý Ngãi, Hầm Rồng, tỉnh Thanh Hóa`
- Service bar có:
  - `Giao Hàng Toàn Quốc`
  - `Đổi Trả Dễ Dàng`
  - `Thanh Toán Tiện Lợi`
  - `Hỗ Trợ Nhiệt Tình`
- Policy links hiện có:
  - `Chính Sách Bảo Mật` -> `/privacy-policy`
  - `Quy Định Bảo Hành` -> `/warranty-policy`
  - `Chính Sách Đổi Trả` -> `/return-policy`
- Copyright:
  - `Copyright © Nexora 2026. All rights reserved.`

### 5.6 Các tiện ích global khác

- `BackToTopButton`
- `AIConsultantWidget`
- `CompareTray`

---

## 6. Các Context Và State Chính

### 6.1 AuthProvider

File: [fe/src/context/AuthProvider.jsx](./fe/src/context/AuthProvider.jsx)

Vai trò:

- quản lý user/token
- login/logout frontend
- giữ trạng thái sau reload nhờ `localStorage`

### 6.2 SearchProvider

File: [fe/src/context/SearchProvider.jsx](./fe/src/context/SearchProvider.jsx)

Vai trò:

- đồng bộ keyword search giữa header và các trang

### 6.3 CartProvider

File: [fe/src/context/CartProvider.jsx](./fe/src/context/CartProvider.jsx)

Key localStorage:

- `cartItems`

API hiện có:

- `cartItems`
- `cartItemCount`
- `cartTotal`
- `addToCart(product, quantity)`
- `removeFromCart(productId)`
- `updateQuantity(productId, quantity)`
- `clearCart()`

Behavior:

- normalize item trước khi lưu
- tự loại item lỗi
- tự loại item `stock = 0` khi load từ storage
- clamp quantity theo stock nếu stock có giá trị
- dispatch custom event khi add cart:
  - `nexora-cart-item-added`

### 6.4 FavoritesProvider

File: [fe/src/context/FavoritesProvider.jsx](./fe/src/context/FavoritesProvider.jsx)

Key localStorage:

- `favoriteItems`

API hiện có:

- `favoriteItems`
- `isFavorite(productId)`
- `toggleFavorite(product)`
- `removeFavorite(productId)`

Behavior:

- lưu favorites vào `localStorage`
- normalize product trước khi lưu
- không thêm trùng
- dispatch custom event khi toggle favorite:
  - `nexora-favorite-toggled`

### 6.5 ThemeProvider

File: [fe/src/context/ThemeProvider.jsx](./fe/src/context/ThemeProvider.jsx)

Key localStorage:

- `nexora_theme`

Vai trò:

- light/dark/system mode
- persist theme
- set `document.documentElement.dataset.theme`
- đồng bộ thêm `dataset` cho:
  - mật độ hiển thị (`compact` / `comfortable`)
  - chuyển động (`reduced` / `full`)

### 6.6 ToastProvider

File: [fe/src/context/ToastProvider.jsx](./fe/src/context/ToastProvider.jsx)

Vai trò:

- quản lý toast global
- hỗ trợ các trạng thái:
  - `success`
  - `error`
  - `warning`
  - `info`

### 6.7 CompareProvider

File: [fe/src/context/CompareProvider.jsx](./fe/src/context/CompareProvider.jsx)

Key localStorage:

- `compareItems`

Vai trò:

- lưu danh sách compare frontend-only
- tối đa `3 sản phẩm`
- mở/đóng compare modal

---

## 7. Services Và Utils Hiện Tại

### 7.1 Product service

File: [fe/src/services/productService.js](./fe/src/services/productService.js)

Interface hiện có:

- `getProducts()`
- `getProductById(id)`
- `createProduct(productData)`
- `updateProduct(productId, productData)`
- `deleteProduct(productId)`

Thực tế:

- tất cả đều gọi `productStorage`
- chưa gọi trực tiếp backend products ở runtime chính
- backend products API đã sẵn sàng để migrate từng bước

### 7.2 Product storage

File: [fe/src/services/productStorage.js](./fe/src/services/productStorage.js)

Các điểm chính:

- seed dữ liệu từ JSON
- persist vào `localStorage`
- chuẩn hóa:
  - `id`
  - `name`
  - `category`
  - `image`
  - `images`
  - `description`
  - `price`
  - `stock`
  - `createdAt`
  - `updatedAt`
- placeholder image mặc định:
  - `https://placehold.co/600x400/e2e8f0/475569?text=No+Image`

### 7.3 Auth service

File: [fe/src/services/authService.js](./fe/src/services/authService.js)

Base URL:

- đọc từ `import.meta.env.VITE_API_URL`
- fallback: `http://localhost:5000/api`

Interface hiện có:

- `register(userData)`
- `login(credentials)`
- `getMe(token)`
- `updateMyAvatar(token, avatarDataUrl)`

### 7.4 Account/Order storage

- [fe/src/services/accountStorage.js](./fe/src/services/accountStorage.js)
  - lưu dữ liệu account center:
    - `nexora_profile`
    - `nexora_addresses`
    - `nexora_notifications`
    - `nexora_ai_preferences`
    - `nexora_appearance`
    - `nexora_security`
- [fe/src/services/orderStorage.js](./fe/src/services/orderStorage.js)
  - key chính: `nexora_orders`
  - chuẩn hóa cấu trúc đơn hàng:
    - `id`, `code`, `customerInfo`, `items`
    - `subtotal`, `shippingFee`, `total`
    - `status`, `createdAt`, `statusHistory`
  - hỗ trợ:
    - tạo đơn từ checkout
    - update trạng thái theo transition hợp lệ
    - thống kê cho admin dashboard
    - event realtime: `nexora-orders-updated`

### 7.5 Utility đáng chú ý

- [fe/src/utils/product.js](./fe/src/utils/product.js)
  - `getProductId`
  - `getProductStock`
  - `getProductImages`
  - `normalizeProduct`
  - `buildProductPricing`
- [fe/src/utils/formatCurrency.js](./fe/src/utils/formatCurrency.js)
- [fe/src/utils/timing.js](./fe/src/utils/timing.js)
  - `wait`
  - `withMinimumDelay`

### 7.6 Backend API trạng thái hiện tại

Auth API:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me/avatar`
- `GET /api/auth/me/avatar`
- `DELETE /api/auth/me/avatar`

Products API (phase 1 done):

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

Seeder:

- `npm --prefix be run seed:products`

---

## 8. Components Dùng Chung Mới/Nổi Bật

### 8.1 Feedback / Navigation

- [fe/src/components/ProgressBar.jsx](./fe/src/components/ProgressBar.jsx)
- [fe/src/components/Breadcrumbs.jsx](./fe/src/components/Breadcrumbs.jsx)
- [fe/src/components/BackToTopButton.jsx](./fe/src/components/BackToTopButton.jsx)
- [fe/src/components/CheckoutSteps.jsx](./fe/src/components/CheckoutSteps.jsx)
- [fe/src/components/EmptyState.jsx](./fe/src/components/EmptyState.jsx)

### 8.2 Product interaction

- [fe/src/components/ProductCard.jsx](./fe/src/components/ProductCard.jsx)
- [fe/src/components/ProductGallery.jsx](./fe/src/components/ProductGallery.jsx)
- [fe/src/components/QuickViewModal.jsx](./fe/src/components/QuickViewModal.jsx)
- [fe/src/components/CompareTray.jsx](./fe/src/components/CompareTray.jsx)

### 8.3 Loading

- [fe/src/components/Skeleton.jsx](./fe/src/components/Skeleton.jsx)
- [fe/src/components/Spinner.jsx](./fe/src/components/Spinner.jsx)

### 8.4 AI widget

- [fe/src/components/AIConsultantWidget.jsx](./fe/src/components/AIConsultantWidget.jsx)

### 8.5 Account components

- [fe/src/components/account/AccountLayout.jsx](./fe/src/components/account/AccountLayout.jsx)
- [fe/src/components/account/SettingsSection.jsx](./fe/src/components/account/SettingsSection.jsx)
- [fe/src/components/account/SettingsCard.jsx](./fe/src/components/account/SettingsCard.jsx)
- [fe/src/components/account/SettingsInput.jsx](./fe/src/components/account/SettingsInput.jsx)
- [fe/src/components/account/SettingsToggle.jsx](./fe/src/components/account/SettingsToggle.jsx)
- [fe/src/components/account/AvatarUploader.jsx](./fe/src/components/account/AvatarUploader.jsx)
- [fe/src/components/account/AddressCard.jsx](./fe/src/components/account/AddressCard.jsx)
- [fe/src/components/account/OrderCard.jsx](./fe/src/components/account/OrderCard.jsx)
- [fe/src/components/account/PreferenceSelector.jsx](./fe/src/components/account/PreferenceSelector.jsx)

---

## 9. Storefront Pages Hiện Tại

### 9.1 Home

File: [fe/src/pages/Home.jsx](./fe/src/pages/Home.jsx)

Hiện có:

- hero slider toàn section
- auto slide + dot indicator
- hỗ trợ swipe mobile
- CTA:
  - `Xem sản phẩm`
  - `Tư vấn AI`
- sản phẩm nổi bật:
  - lấy từ product service
  - hiện đang ưu tiên nhóm sản phẩm giá cao hơn
  - không còn nút `Xem tất cả` ở heading section
- loading:
  - `HeroSkeleton`
  - `ProductGridSkeleton`
- nếu search ở header có keyword:
  - Home sẽ lọc nhóm sản phẩm nổi bật theo keyword đó

### 9.2 Products

File: [fe/src/pages/Products.jsx](./fe/src/pages/Products.jsx)

Hiện có:

- lấy danh sách từ product service
- loading state
- error state
- empty state
- sticky filter bar
- filter category
- sort:
  - `featured`
  - `priceAsc`
  - `priceDesc`
  - `nameAsc`
- search đồng bộ từ header qua query string
- nếu search/filter không có kết quả:
  - hiển thị empty state
  - hiển thị `suggestedProducts`

### 9.3 ProductCard

File: [fe/src/components/ProductCard.jsx](./fe/src/components/ProductCard.jsx)

Hiện có:

- toàn card click để vào detail
- badge giảm giá
- category tag
- giá hiện tại / giá gốc
- trạng thái `Còn hàng / Sắp hết / Tạm hết`
- action:
  - `Thêm vào giỏ`
  - `Xem nhanh`
  - favorite icon
  - compare icon
- add to cart có spinner ngắn
- favorite có animation heart
- feedback dùng toast

### 9.4 ProductDetail

File: [fe/src/pages/ProductDetail.jsx](./fe/src/pages/ProductDetail.jsx)

Hiện có:

- breadcrumbs
- gallery nhiều ảnh + thumbnail
- zoom desktop bằng hover
- swipe gallery trên touch device
- quantity selector
- pricing block:
  - giá hiện tại
  - giá gốc
  - discount percent
  - số tiền tiết kiệm
- action:
  - `Mua ngay`
  - `Thêm vào giỏ hàng`
  - `Yêu thích`
  - `So sánh`
- loading dùng `DetailSkeleton`
- empty/error fallback rõ ràng

### 9.5 Quick View

File: [fe/src/components/QuickViewModal.jsx](./fe/src/components/QuickViewModal.jsx)

Hiện có:

- mở từ product card
- không đổi route
- hiển thị:
  - gallery ảnh
  - category
  - price
  - stock
  - description
- action:
  - add cart
  - favorite
  - compare
  - sang trang detail
- action row của quick view đã được tách style riêng để spacing không bị dính với `detail-actions`

### 9.6 Compare

File: [fe/src/components/CompareTray.jsx](./fe/src/components/CompareTray.jsx)

Hiện có:

- compare tray fixed
- compare modal
- tối đa 3 sản phẩm
- so sánh:
  - giá
  - category
  - stock
  - mô tả

### 9.7 Cart

File: [fe/src/pages/Cart.jsx](./fe/src/pages/Cart.jsx)

Hiện có:

- dùng `CartContext`
- tăng/giảm số lượng
- clamp theo stock
- xóa item
- xóa toàn giỏ
- subtotal từng item
- tổng toàn giỏ
- checkout step UI
- empty state tốt hơn
- loading skeleton ban đầu

### 9.8 Favorites

File: [fe/src/pages/Favorites.jsx](./fe/src/pages/Favorites.jsx)

Hiện có:

- dùng `FavoritesContext`
- xóa favorite
- chuyển từ favorite sang cart
- empty state tốt hơn
- loading skeleton ban đầu

### 9.9 Orders

File: [fe/src/pages/Orders.jsx](./fe/src/pages/Orders.jsx)

Đây là checkout frontend-first, có lưu order vào `localStorage`.

Hiện có:

- checkout steps
- flow nội bộ được tách làm 2 màn:
  - màn `Thông tin đơn hàng`
  - màn `Thanh toán đơn hàng`
- màn `Thông tin`:
  - form:
    - `fullname`
    - `phone`
    - `address`
    - `note`
  - validate:
    - fullname bắt buộc
    - phone bắt buộc
    - address bắt buộc
    - regex số điện thoại Việt Nam
  - có nút `Tiếp tục đến thanh toán`
- màn `Thanh toán`:
  - hiển thị lại thông tin đã nhập dạng review
  - có nút `Sửa thông tin`
  - cho chọn 1 trong 2 phương thức:
    - `Thanh toán bằng QR`
    - `Thanh toán khi nhận hàng`
  - nếu chọn `QR` thì hiện khối QR demo frontend-only
- summary:
  - `cartTotalOriginal`
  - `cartSavings`
  - `shippingFee`
  - `total`
- shipping fee hằng số:
  - `30000`
- sticky summary trên desktop
- submit:
  - chỉ cho submit ở màn `Thanh toán`
  - không gọi backend
  - tạo order record vào `nexora_orders` qua `orderStorage`
  - status mặc định: `pending`
  - có loading state
  - clear cart
  - reset form + reset phương thức thanh toán
  - reset checkout stage về `info`
  - hiển thị success state
  - auto navigate về `/products`

### 9.10 Auth pages

- [fe/src/pages/Login.jsx](./fe/src/pages/Login.jsx)
- [fe/src/pages/Register.jsx](./fe/src/pages/Register.jsx)

Giữ logic auth cũ, chưa refactor mạnh về UX ngoài việc tương thích layout mới.

### 9.11 NotFound

File: [fe/src/pages/NotFound.jsx](./fe/src/pages/NotFound.jsx)

- đã dùng `EmptyState` thay vì block 404 đơn giản

### 9.12 Account center pages

- [fe/src/pages/account/AccountProfile.jsx](./fe/src/pages/account/AccountProfile.jsx)
- [fe/src/pages/account/AccountSecurity.jsx](./fe/src/pages/account/AccountSecurity.jsx)
- [fe/src/pages/account/AccountAddresses.jsx](./fe/src/pages/account/AccountAddresses.jsx)
- [fe/src/pages/account/AccountOrders.jsx](./fe/src/pages/account/AccountOrders.jsx)
- [fe/src/pages/account/AccountWishlist.jsx](./fe/src/pages/account/AccountWishlist.jsx)
- [fe/src/pages/account/AccountNotifications.jsx](./fe/src/pages/account/AccountNotifications.jsx)
- [fe/src/pages/account/AccountAppearance.jsx](./fe/src/pages/account/AccountAppearance.jsx)
- [fe/src/pages/account/AccountAIPreferences.jsx](./fe/src/pages/account/AccountAIPreferences.jsx)

Ghi chú mới:

- Account profile đã gọi backend avatar API khi user bấm `Lưu thay đổi`.
- Header account (góc phải trên) và account hero cùng lấy avatar từ profile hiện tại.
- Sau khi lưu profile/avatar sẽ reload 1 lần để refresh hiển thị avatar đồng bộ.

### 9.13 Policy pages

- [fe/src/pages/PrivacyPolicy.jsx](./fe/src/pages/PrivacyPolicy.jsx)
- [fe/src/pages/WarrantyPolicy.jsx](./fe/src/pages/WarrantyPolicy.jsx)
- [fe/src/pages/ReturnPolicy.jsx](./fe/src/pages/ReturnPolicy.jsx)
- [fe/src/pages/TermsOfUse.jsx](./fe/src/pages/TermsOfUse.jsx)
- [fe/src/pages/ShippingInspectionPolicy.jsx](./fe/src/pages/ShippingInspectionPolicy.jsx)

---

## 10. Admin Hiện Tại

### 10.1 AdminLayout

File: [fe/src/components/admin/AdminLayout.jsx](./fe/src/components/admin/AdminLayout.jsx)

Hiện có:

- breadcrumbs
- sidebar nav:
  - `Tổng quan`
  - `Quản lý sản phẩm`
  - `Quản lý đơn hàng`

### 10.2 AdminDashboard

File: [fe/src/pages/admin/AdminDashboard.jsx](./fe/src/pages/admin/AdminDashboard.jsx)

Hiện có:

- thống kê:
  - tổng sản phẩm
  - còn hàng
  - hết hàng
  - số danh mục
  - tổng đơn hàng
  - đơn chờ xác nhận
  - đơn hoàn thành
  - doanh thu (từ đơn hoàn thành)
- có `AdminDashboardSkeleton`
- empty/error dùng UI tốt hơn
- có listener realtime theo `nexora-orders-updated` và `storage`

### 10.3 AdminProducts

File: [fe/src/pages/admin/AdminProducts.jsx](./fe/src/pages/admin/AdminProducts.jsx)

Hiện có:

- load toàn bộ sản phẩm từ product service
- toolbar:
  - search
  - filter category
  - filter status
  - sort
- form create/update
- modal xem nhanh
- delete có confirm
- action loading cho:
  - create
  - update
  - delete
- feedback dùng toast
- loading dùng `AdminProductsSkeleton`
- empty state tốt hơn

### 10.4 AdminOrders

File: [fe/src/pages/admin/AdminOrders.jsx](./fe/src/pages/admin/AdminOrders.jsx)

Hiện có:

- đọc đơn hàng từ `orderStorage` (`nexora_orders`)
- toolbar:
  - search theo `order id / customer / phone`
  - filter status
  - sort newest/oldest
- table hiển thị:
  - mã đơn
  - khách hàng
  - số điện thoại
  - tổng tiền
  - số lượng item
  - trạng thái
  - ngày tạo
- modal chi tiết:
  - customer info / address / note / payment method
  - danh sách sản phẩm + quantity
  - subtotal / shipping / total
  - status timeline
- cập nhật trạng thái đơn:
  - `pending -> confirmed`
  - `confirmed -> shipping`
  - `shipping -> completed`
  - `pending/confirmed -> cancelled`
- update status có:
  - confirm UI
  - loading state
  - toast feedback
- có `AdminOrdersSkeleton`

---

## 11. Accessibility, Animation Và UX Notes

### 11.1 Accessibility

- nhiều button/icon có `aria-label`
- breadcrumbs có `aria-current`
- toast viewport dùng `aria-live`
- focus ring rõ hơn bằng CSS global
- tooltip visual hiện không còn được dùng trong header/admin để tránh bug tràn hoặc bị che

### 11.2 Animation / micro-interaction

- route transition fade nhẹ
- top progress bar mượt hơn
- add-to-cart flash nhẹ
- favorite heart beat nhẹ
- badge pulse cho cart/favorite
- reduced motion đã có fallback CSS

### 11.3 Dark mode

- dùng CSS variables trong [fe/src/App.css](./fe/src/App.css) và [fe/src/index.css](./fe/src/index.css)
- current theme lưu trong `localStorage` (`light` / `dark` / `system`)
- toggle nằm trong account dropdown
- có thêm appearance settings ở account:
  - compact mode
  - reduce motion

---

## 12. Những Điểm Quan Trọng Khi Làm Tiếp

- Không phá flow dùng `datn_products` làm single source cho storefront và admin
- Không phá flow `nexora_orders` cho checkout/account/admin orders
- Không chuyển qua Redux
- Với task frontend, cần kiểm tra tương thích với API backend mới (`/api/products`, `/api/auth/me/avatar`)
- Nếu thêm tính năng product mới, nên đi qua:
  - `productStorage`
  - `utils/product.js`
  - kế hoạch migrate API theo từng màn (ưu tiên admin products trước)
- Nếu thêm tính năng order mới, nên đi qua:
  - `orderStorage`
  - transition status hợp lệ trong `orderStorage`
- Nếu thêm action feedback mới, nên dùng `ToastProvider`
- Nếu thêm feature state toàn cục mới, pattern hiện tại đang ưu tiên Context riêng nhỏ gọn hơn là dồn mọi thứ vào một provider lớn

---

## 13. File Map Frontend Đáng Quan Tâm

- App shell / routes:
  - [fe/src/App.jsx](./fe/src/App.jsx)
  - [fe/src/components/MainLayout.jsx](./fe/src/components/MainLayout.jsx)
- Shared UI:
  - [fe/src/App.css](./fe/src/App.css)
  - [fe/src/index.css](./fe/src/index.css)
- Contexts:
  - [fe/src/context/CartProvider.jsx](./fe/src/context/CartProvider.jsx)
  - [fe/src/context/FavoritesProvider.jsx](./fe/src/context/FavoritesProvider.jsx)
  - [fe/src/context/ThemeProvider.jsx](./fe/src/context/ThemeProvider.jsx)
  - [fe/src/context/ToastProvider.jsx](./fe/src/context/ToastProvider.jsx)
  - [fe/src/context/CompareProvider.jsx](./fe/src/context/CompareProvider.jsx)
- Product source:
  - [fe/src/services/productStorage.js](./fe/src/services/productStorage.js)
  - [fe/src/services/productService.js](./fe/src/services/productService.js)
  - [fe/src/utils/product.js](./fe/src/utils/product.js)
- Account/Order source:
  - [fe/src/services/accountStorage.js](./fe/src/services/accountStorage.js)
  - [fe/src/services/orderStorage.js](./fe/src/services/orderStorage.js)
- Storefront pages:
  - [fe/src/pages/Home.jsx](./fe/src/pages/Home.jsx)
  - [fe/src/pages/Products.jsx](./fe/src/pages/Products.jsx)
  - [fe/src/pages/ProductDetail.jsx](./fe/src/pages/ProductDetail.jsx)
  - [fe/src/pages/Cart.jsx](./fe/src/pages/Cart.jsx)
  - [fe/src/pages/Favorites.jsx](./fe/src/pages/Favorites.jsx)
  - [fe/src/pages/Orders.jsx](./fe/src/pages/Orders.jsx)
  - [fe/src/pages/PrivacyPolicy.jsx](./fe/src/pages/PrivacyPolicy.jsx)
  - [fe/src/pages/WarrantyPolicy.jsx](./fe/src/pages/WarrantyPolicy.jsx)
  - [fe/src/pages/ReturnPolicy.jsx](./fe/src/pages/ReturnPolicy.jsx)
- Account:
  - [fe/src/components/account/AccountLayout.jsx](./fe/src/components/account/AccountLayout.jsx)
  - [fe/src/pages/account/AccountProfile.jsx](./fe/src/pages/account/AccountProfile.jsx)
  - [fe/src/pages/account/AccountSecurity.jsx](./fe/src/pages/account/AccountSecurity.jsx)
  - [fe/src/pages/account/AccountAddresses.jsx](./fe/src/pages/account/AccountAddresses.jsx)
  - [fe/src/pages/account/AccountOrders.jsx](./fe/src/pages/account/AccountOrders.jsx)
  - [fe/src/pages/account/AccountWishlist.jsx](./fe/src/pages/account/AccountWishlist.jsx)
  - [fe/src/pages/account/AccountNotifications.jsx](./fe/src/pages/account/AccountNotifications.jsx)
  - [fe/src/pages/account/AccountAppearance.jsx](./fe/src/pages/account/AccountAppearance.jsx)
  - [fe/src/pages/account/AccountAIPreferences.jsx](./fe/src/pages/account/AccountAIPreferences.jsx)
- Admin:
  - [fe/src/pages/admin/AdminDashboard.jsx](./fe/src/pages/admin/AdminDashboard.jsx)
  - [fe/src/pages/admin/AdminProducts.jsx](./fe/src/pages/admin/AdminProducts.jsx)
  - [fe/src/pages/admin/AdminOrders.jsx](./fe/src/pages/admin/AdminOrders.jsx)
- Backend:
  - `be/server.js`
  - `be/config/db.js`
  - `be/models/Product.js`
  - `be/models/User.js`
  - `be/controllers/productController.js`
  - `be/controllers/authController.js`
  - `be/routes/productRoutes.js`
  - `be/routes/authRoutes.js`
  - `be/middleware/errorMiddleware.js`
  - `be/seeders/seedProducts.js`

---

## 14. Handoff Giai Đoạn Tiếp Theo (Sau 2026-05-15)

Đã hoàn thành:

- Product CRUD backend MongoDB (phase 1).
- Product seeder đọc từ `fe/src/data/products.json`.
- Auth avatar API lưu ảnh vào MongoDB (replace ảnh cũ khi upload ảnh mới).

Mục tiêu tiếp theo:

1. Đồng bộ account profile text fields (fullName/displayName/phone/...) lên backend (hiện avatar đã lên backend).
2. Chuẩn hóa API Orders (create/get/list/update status) để thay `orderStorage`.
3. Giữ `paymentMethod` enum tương thích FE hiện tại:
   - `qr`
   - `cod`
4. Thêm mapping trạng thái đơn tương thích flow hiện tại:
   - `pending`
   - `confirmed`
   - `shipping`
   - `completed`
   - `cancelled`
5. Thiết kế migration strategy:
   - phase 1: FE gọi API nhưng fallback localStorage khi lỗi
   - phase 2: bỏ fallback localStorage khi BE ổn định

Ghi chú cấu trúc chạy local sau pull:

- làm việc trong `ecommerce/`
- frontend ở `ecommerce/fe`
- backend ở `ecommerce/be`
- xem thêm [SETUP_AFTER_PULL.md](./SETUP_AFTER_PULL.md)
