# PROJECT SUMMARY

## 1. Thông Tin Chung

- Tên project: `ecommerce-ai-project`
- Storefront branding hiện tại: `Nexora`
- Mục tiêu hiện tại:
  - website ecommerce ReactJS ở mức frontend hoàn chỉnh
  - có shopping flow rõ ràng
  - có khu vực Admin CRUD sản phẩm
  - có khu vực Admin quản lý đơn hàng
  - giữ product/order source bằng `localStorage` để storefront, account và admin dùng chung
- Trạng thái hiện tại:
  - storefront đã được nâng UX/UI theo hướng modern ecommerce
  - shopping flow vẫn là frontend-only cho cart / favorites / orders
  - admin có:
    - CRUD sản phẩm frontend-only
    - quản lý đơn hàng frontend-only
  - backend auth vẫn còn trong project, nhưng backend products không phải nguồn chính để render storefront
  - đã có dark mode, compare, quick view, mini cart, toast, skeleton, progress bar, mobile nav
  - đã có account center đầy đủ ở `/account/*`
  - đã có nhóm trang policy riêng:
    - `/privacy-policy`
    - `/warranty-policy`
    - `/return-policy`
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
- Cập nhật gần nhất trong summary này: `2026-05-14`

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
- Không dùng UI framework lớn
- Không sửa backend trong các task storefront gần đây
- Ưu tiên frontend demo self-contained, dễ đọc, dễ thuyết trình
- Ưu tiên `localStorage` cho các flow chưa cần backend thật

---

## 3. Kiến Trúc Dữ Liệu Sản Phẩm Hiện Tại

### 3.1 Nguồn seed ban đầu

- File seed: [src/data/products.json](./src/data/products.json)
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
- Tầng xử lý chính: [src/services/productStorage.js](./src/services/productStorage.js)

Flow:

1. App load
2. `productStorage` kiểm tra `localStorage`
3. Nếu chưa có `datn_products`, seed từ `src/data/products.json`
4. Sau đó toàn app đọc sản phẩm từ `localStorage`
5. Admin create/update/delete ghi trực tiếp vào key này
6. Storefront và admin luôn dùng cùng một source

### 3.3 Chuẩn hóa dữ liệu sản phẩm

- Utility liên quan: [src/utils/product.js](./src/utils/product.js)
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
- Không cần backend products để demo frontend hiện tại

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

File chính: [src/components/MainLayout.jsx](./src/components/MainLayout.jsx)

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

File: [src/context/AuthProvider.jsx](./src/context/AuthProvider.jsx)

Vai trò:

- quản lý user/token
- login/logout frontend
- giữ trạng thái sau reload nhờ `localStorage`

### 6.2 SearchProvider

File: [src/context/SearchProvider.jsx](./src/context/SearchProvider.jsx)

Vai trò:

- đồng bộ keyword search giữa header và các trang

### 6.3 CartProvider

File: [src/context/CartProvider.jsx](./src/context/CartProvider.jsx)

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

File: [src/context/FavoritesProvider.jsx](./src/context/FavoritesProvider.jsx)

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

File: [src/context/ThemeProvider.jsx](./src/context/ThemeProvider.jsx)

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

File: [src/context/ToastProvider.jsx](./src/context/ToastProvider.jsx)

Vai trò:

- quản lý toast global
- hỗ trợ các trạng thái:
  - `success`
  - `error`
  - `warning`
  - `info`

### 6.7 CompareProvider

File: [src/context/CompareProvider.jsx](./src/context/CompareProvider.jsx)

Key localStorage:

- `compareItems`

Vai trò:

- lưu danh sách compare frontend-only
- tối đa `3 sản phẩm`
- mở/đóng compare modal

---

## 7. Services Và Utils Hiện Tại

### 7.1 Product service

File: [src/services/productService.js](./src/services/productService.js)

Interface hiện có:

- `getProducts()`
- `getProductById(id)`
- `createProduct(productData)`
- `updateProduct(productId, productData)`
- `deleteProduct(productId)`

Thực tế:

- tất cả đều gọi `productStorage`
- không phụ thuộc backend products

### 7.2 Product storage

File: [src/services/productStorage.js](./src/services/productStorage.js)

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

File: [src/services/authService.js](./src/services/authService.js)

Base URL:

- đọc từ `import.meta.env.VITE_API_URL`
- fallback: `http://localhost:5000/api`

### 7.4 Account/Order storage

- [src/services/accountStorage.js](./src/services/accountStorage.js)
  - lưu dữ liệu account center:
    - `nexora_profile`
    - `nexora_addresses`
    - `nexora_notifications`
    - `nexora_ai_preferences`
    - `nexora_appearance`
    - `nexora_security`
- [src/services/orderStorage.js](./src/services/orderStorage.js)
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

- [src/utils/product.js](./src/utils/product.js)
  - `getProductId`
  - `getProductStock`
  - `getProductImages`
  - `normalizeProduct`
  - `buildProductPricing`
- [src/utils/formatCurrency.js](./src/utils/formatCurrency.js)
- [src/utils/timing.js](./src/utils/timing.js)
  - `wait`
  - `withMinimumDelay`

---

## 8. Components Dùng Chung Mới/Nổi Bật

### 8.1 Feedback / Navigation

- [src/components/ProgressBar.jsx](./src/components/ProgressBar.jsx)
- [src/components/Breadcrumbs.jsx](./src/components/Breadcrumbs.jsx)
- [src/components/BackToTopButton.jsx](./src/components/BackToTopButton.jsx)
- [src/components/CheckoutSteps.jsx](./src/components/CheckoutSteps.jsx)
- [src/components/EmptyState.jsx](./src/components/EmptyState.jsx)

### 8.2 Product interaction

- [src/components/ProductCard.jsx](./src/components/ProductCard.jsx)
- [src/components/ProductGallery.jsx](./src/components/ProductGallery.jsx)
- [src/components/QuickViewModal.jsx](./src/components/QuickViewModal.jsx)
- [src/components/CompareTray.jsx](./src/components/CompareTray.jsx)

### 8.3 Loading

- [src/components/Skeleton.jsx](./src/components/Skeleton.jsx)
- [src/components/Spinner.jsx](./src/components/Spinner.jsx)

### 8.4 AI widget

- [src/components/AIConsultantWidget.jsx](./src/components/AIConsultantWidget.jsx)

### 8.5 Account components

- [src/components/account/AccountLayout.jsx](./src/components/account/AccountLayout.jsx)
- [src/components/account/SettingsSection.jsx](./src/components/account/SettingsSection.jsx)
- [src/components/account/SettingsCard.jsx](./src/components/account/SettingsCard.jsx)
- [src/components/account/SettingsInput.jsx](./src/components/account/SettingsInput.jsx)
- [src/components/account/SettingsToggle.jsx](./src/components/account/SettingsToggle.jsx)
- [src/components/account/AvatarUploader.jsx](./src/components/account/AvatarUploader.jsx)
- [src/components/account/AddressCard.jsx](./src/components/account/AddressCard.jsx)
- [src/components/account/OrderCard.jsx](./src/components/account/OrderCard.jsx)
- [src/components/account/PreferenceSelector.jsx](./src/components/account/PreferenceSelector.jsx)

---

## 9. Storefront Pages Hiện Tại

### 9.1 Home

File: [src/pages/Home.jsx](./src/pages/Home.jsx)

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

File: [src/pages/Products.jsx](./src/pages/Products.jsx)

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

File: [src/components/ProductCard.jsx](./src/components/ProductCard.jsx)

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

File: [src/pages/ProductDetail.jsx](./src/pages/ProductDetail.jsx)

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

File: [src/components/QuickViewModal.jsx](./src/components/QuickViewModal.jsx)

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

File: [src/components/CompareTray.jsx](./src/components/CompareTray.jsx)

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

File: [src/pages/Cart.jsx](./src/pages/Cart.jsx)

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

File: [src/pages/Favorites.jsx](./src/pages/Favorites.jsx)

Hiện có:

- dùng `FavoritesContext`
- xóa favorite
- chuyển từ favorite sang cart
- empty state tốt hơn
- loading skeleton ban đầu

### 9.9 Orders

File: [src/pages/Orders.jsx](./src/pages/Orders.jsx)

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

- [src/pages/Login.jsx](./src/pages/Login.jsx)
- [src/pages/Register.jsx](./src/pages/Register.jsx)

Giữ logic auth cũ, chưa refactor mạnh về UX ngoài việc tương thích layout mới.

### 9.11 NotFound

File: [src/pages/NotFound.jsx](./src/pages/NotFound.jsx)

- đã dùng `EmptyState` thay vì block 404 đơn giản

### 9.12 Account center pages

- [src/pages/account/AccountProfile.jsx](./src/pages/account/AccountProfile.jsx)
- [src/pages/account/AccountSecurity.jsx](./src/pages/account/AccountSecurity.jsx)
- [src/pages/account/AccountAddresses.jsx](./src/pages/account/AccountAddresses.jsx)
- [src/pages/account/AccountOrders.jsx](./src/pages/account/AccountOrders.jsx)
- [src/pages/account/AccountWishlist.jsx](./src/pages/account/AccountWishlist.jsx)
- [src/pages/account/AccountNotifications.jsx](./src/pages/account/AccountNotifications.jsx)
- [src/pages/account/AccountAppearance.jsx](./src/pages/account/AccountAppearance.jsx)
- [src/pages/account/AccountAIPreferences.jsx](./src/pages/account/AccountAIPreferences.jsx)

### 9.13 Policy pages

- [src/pages/PrivacyPolicy.jsx](./src/pages/PrivacyPolicy.jsx)
- [src/pages/WarrantyPolicy.jsx](./src/pages/WarrantyPolicy.jsx)
- [src/pages/ReturnPolicy.jsx](./src/pages/ReturnPolicy.jsx)

---

## 10. Admin Hiện Tại

### 10.1 AdminLayout

File: [src/components/admin/AdminLayout.jsx](./src/components/admin/AdminLayout.jsx)

Hiện có:

- breadcrumbs
- sidebar nav:
  - `Tổng quan`
  - `Quản lý sản phẩm`
  - `Quản lý đơn hàng`

### 10.2 AdminDashboard

File: [src/pages/admin/AdminDashboard.jsx](./src/pages/admin/AdminDashboard.jsx)

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

File: [src/pages/admin/AdminProducts.jsx](./src/pages/admin/AdminProducts.jsx)

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

File: [src/pages/admin/AdminOrders.jsx](./src/pages/admin/AdminOrders.jsx)

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

- dùng CSS variables trong [src/App.css](./src/App.css) và [src/index.css](./src/index.css)
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
- Không sửa backend nếu task chỉ là frontend
- Nếu thêm tính năng product mới, nên đi qua:
  - `productStorage`
  - `utils/product.js`
- Nếu thêm tính năng order mới, nên đi qua:
  - `orderStorage`
  - transition status hợp lệ trong `orderStorage`
- Nếu thêm action feedback mới, nên dùng `ToastProvider`
- Nếu thêm feature state toàn cục mới, pattern hiện tại đang ưu tiên Context riêng nhỏ gọn hơn là dồn mọi thứ vào một provider lớn

---

## 13. File Map Frontend Đáng Quan Tâm

- App shell / routes:
  - [src/App.jsx](./src/App.jsx)
  - [src/components/MainLayout.jsx](./src/components/MainLayout.jsx)
- Shared UI:
  - [src/App.css](./src/App.css)
  - [src/index.css](./src/index.css)
- Contexts:
  - [src/context/CartProvider.jsx](./src/context/CartProvider.jsx)
  - [src/context/FavoritesProvider.jsx](./src/context/FavoritesProvider.jsx)
  - [src/context/ThemeProvider.jsx](./src/context/ThemeProvider.jsx)
  - [src/context/ToastProvider.jsx](./src/context/ToastProvider.jsx)
  - [src/context/CompareProvider.jsx](./src/context/CompareProvider.jsx)
- Product source:
  - [src/services/productStorage.js](./src/services/productStorage.js)
  - [src/services/productService.js](./src/services/productService.js)
  - [src/utils/product.js](./src/utils/product.js)
- Account/Order source:
  - [src/services/accountStorage.js](./src/services/accountStorage.js)
  - [src/services/orderStorage.js](./src/services/orderStorage.js)
- Storefront pages:
  - [src/pages/Home.jsx](./src/pages/Home.jsx)
  - [src/pages/Products.jsx](./src/pages/Products.jsx)
  - [src/pages/ProductDetail.jsx](./src/pages/ProductDetail.jsx)
  - [src/pages/Cart.jsx](./src/pages/Cart.jsx)
  - [src/pages/Favorites.jsx](./src/pages/Favorites.jsx)
  - [src/pages/Orders.jsx](./src/pages/Orders.jsx)
  - [src/pages/PrivacyPolicy.jsx](./src/pages/PrivacyPolicy.jsx)
  - [src/pages/WarrantyPolicy.jsx](./src/pages/WarrantyPolicy.jsx)
  - [src/pages/ReturnPolicy.jsx](./src/pages/ReturnPolicy.jsx)
- Account:
  - [src/components/account/AccountLayout.jsx](./src/components/account/AccountLayout.jsx)
  - [src/pages/account/AccountProfile.jsx](./src/pages/account/AccountProfile.jsx)
  - [src/pages/account/AccountSecurity.jsx](./src/pages/account/AccountSecurity.jsx)
  - [src/pages/account/AccountAddresses.jsx](./src/pages/account/AccountAddresses.jsx)
  - [src/pages/account/AccountOrders.jsx](./src/pages/account/AccountOrders.jsx)
  - [src/pages/account/AccountWishlist.jsx](./src/pages/account/AccountWishlist.jsx)
  - [src/pages/account/AccountNotifications.jsx](./src/pages/account/AccountNotifications.jsx)
  - [src/pages/account/AccountAppearance.jsx](./src/pages/account/AccountAppearance.jsx)
  - [src/pages/account/AccountAIPreferences.jsx](./src/pages/account/AccountAIPreferences.jsx)
- Admin:
  - [src/pages/admin/AdminDashboard.jsx](./src/pages/admin/AdminDashboard.jsx)
  - [src/pages/admin/AdminProducts.jsx](./src/pages/admin/AdminProducts.jsx)
  - [src/pages/admin/AdminOrders.jsx](./src/pages/admin/AdminOrders.jsx)
