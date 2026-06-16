# Sơ đồ phân cấp chức năng và workflow dự án Nexora

Tài liệu này tổng hợp từ cấu trúc mã nguồn hiện tại của dự án `ecommerce`, gồm frontend React/Vite và backend Express/MongoDB.

## 1. Tổng quan hệ thống

```mermaid
flowchart LR
  Customer[Khách hàng] --> Browser[Trình duyệt]
  Admin[Quản trị viên] --> Browser

  subgraph FE[Frontend React + Vite]
    Pages[Pages: Home, Products, Cart, Orders, Admin]
    Context[Context: Auth, Cart, Favorites, Compare, Search, Theme]
    Services[Services: auth, product, review, inventory, AI]
    LocalStorage[(LocalStorage: cart, orders, wishlist, AI cache)]
  end

  subgraph BE[Backend NodeJS + Express]
    Routes[API Routes /api/*]
    Middleware[Middleware: auth, role, rate-limit, AI optimize]
    Controllers[Controllers]
    DomainServices[Services nghiệp vụ]
    Models[Mongoose Models]
  end

  subgraph DB[Database]
    Mongo[(MongoDB)]
  end

  subgraph External[External Services]
    Gemini[Gemini API]
  end

  Browser --> FE
  Pages --> Context
  Pages --> Services
  Context --> LocalStorage
  Services -->|REST API| Routes
  Routes --> Middleware
  Middleware --> Controllers
  Controllers --> DomainServices
  DomainServices --> Models
  Models --> Mongo
  DomainServices -->|AI prompt + product context| Gemini
  Gemini -->|AI response| DomainServices
  Controllers -->|JSON response| Services
  FE --> Browser
```

## 2. Sơ đồ phân cấp chức năng

```mermaid
mindmap
  root((Nexora Ecommerce + AI))
    Khách hàng
      Trang chủ
        Xem sản phẩm nổi bật
        Tìm kiếm nhanh
        Điều hướng danh mục
      Sản phẩm
        Xem danh sách sản phẩm
        Tìm kiếm sản phẩm
        Lọc theo danh mục
        Xem chi tiết sản phẩm
        Xem thư viện ảnh
        Xem thông số và mô tả
        Xem đánh giá
      Tài khoản
        Đăng ký
        Đăng nhập
        Đăng xuất
        Xem thông tin cá nhân
        Cập nhật ảnh đại diện
        Quản lý bảo mật
        Quản lý địa chỉ
        Cài đặt giao diện
        Cài đặt AI preferences
      Giỏ hàng
        Thêm sản phẩm
        Cập nhật số lượng
        Xóa sản phẩm
        Tính tổng tiền
        AI phân tích giỏ hàng
      Yêu thích và so sánh
        Thêm yêu thích
        Xem wishlist
        Thêm vào danh sách so sánh
        AI so sánh sản phẩm
      Đơn hàng
        Tạo đơn từ checkout
        Lưu đơn trong localStorage
        Xem danh sách đơn
        Thanh toán QR
        Cập nhật tồn kho khi hoàn tất
      Đánh giá
        Xem review theo sản phẩm
        Gửi review
        Sửa review
        Xóa review của mình
      Tư vấn AI
        Chat tư vấn mua sắm
        Gợi ý sản phẩm phù hợp
        Hỏi về sản phẩm cụ thể
        Phân tích giỏ hàng
        Follow-up theo ngữ cảnh hội thoại
      Chính sách
        Chính sách bảo mật
        Bảo hành
        Đổi trả
        Điều khoản sử dụng
        Kiểm hàng và vận chuyển
    Quản trị viên
      Dashboard
        Tổng quan hệ thống
        Thống kê đơn hàng
        Thống kê tồn kho
      Quản lý sản phẩm
        Thêm sản phẩm
        Sửa sản phẩm
        Xóa sản phẩm
        Chuẩn hóa ảnh và thông số
        Quản lý catalog
      Quản lý đơn hàng
        Xem đơn hàng localStorage
        Cập nhật trạng thái đơn
        Xóa đơn hoàn tất
      Quản lý tồn kho
        Dashboard tồn kho
        Tạo phiếu nhập
        Tạo phiếu xuất
        Xem giao dịch kho
        Xem sản phẩm sắp hết hàng
        Xem sản phẩm hết hàng
        AI gợi ý tồn kho
      Quản lý đánh giá
        Xem danh sách review
        Tìm kiếm và lọc review
        Xóa review
      Quản lý thanh toán
        Cấu hình ngân hàng
        Cấu hình ảnh QR
      Phân quyền
        Xem danh sách admin
        Cấp quyền sub-admin
        Thu hồi quyền sub-admin
```

## 3. Phân rã module theo tầng

```mermaid
flowchart TB
  subgraph FE[Frontend - ecommerce/fe]
    Pages[Pages]
    Components[Components]
    Context[Context Providers]
    Hooks[Hooks]
    Services[API Services]
    Storage[LocalStorage Services]
  end

  subgraph BE[Backend - ecommerce/be]
    Routes[Routes]
    Controllers[Controllers]
    Middleware[Middleware]
    DomainServices[Domain Services]
    Models[Mongoose Models]
  end

  subgraph External[External]
    Mongo[(MongoDB)]
    Gemini[Gemini API]
  end

  Pages --> Components
  Pages --> Context
  Pages --> Hooks
  Pages --> Services
  Pages --> Storage
  Services --> Routes
  Routes --> Middleware
  Routes --> Controllers
  Controllers --> DomainServices
  Controllers --> Models
  DomainServices --> Models
  Models --> Mongo
  DomainServices --> Gemini
```

## 4. Route map chính

| Nhóm | Frontend route | Backend API |
| --- | --- | --- |
| Trang chủ | `/` | `GET /api/products` |
| Sản phẩm | `/products`, `/products/:id` | `GET /api/products`, `GET /api/products/:id` |
| Auth | `/login`, `/register`, `/account/*` | `/api/auth/*` |
| Giỏ hàng | `/cart` | `POST /api/orders/consume-stock` khi hoàn tất |
| Đơn hàng | `/orders`, `/orders/qr-payment` | hiện lưu chính ở localStorage |
| AI | `/ai-consultant`, widget trong UI | `/api/ai/chat`, `/compare`, `/product-explain`, `/cart-analyze` |
| Admin | `/admin/*` | `/api/products`, `/api/reviews`, `/api/inventory`, `/api/payment-settings`, `/api/auth/admin-access` |
| Review | Product detail, admin reviews | `/api/reviews/*` |
| Tồn kho | `/admin/inventory/*` | `/api/inventory/*` |

## 5. Workflow mua hàng

```mermaid
flowchart TD
  A[Người dùng vào website] --> B[Xem trang chủ hoặc danh sách sản phẩm]
  B --> C[Tìm kiếm / lọc danh mục]
  C --> D[Xem chi tiết sản phẩm]
  D --> E{Hành động}
  E -->|Thêm giỏ hàng| F[Giỏ hàng]
  E -->|Yêu thích| G[Wishlist]
  E -->|So sánh| H[Compare tray]
  F --> I[Checkout / tạo đơn]
  I --> J{Phương thức thanh toán}
  J -->|COD| K[Lưu đơn trạng thái pending]
  J -->|QR| L[Hiển thị QR thanh toán]
  L --> M[Lưu đơn đã thanh toán]
  K --> N[Trang đơn hàng]
  M --> N
  M --> O[Gọi backend trừ tồn kho nếu có token]
```

Ghi chú: đơn hàng hiện được quản lý chủ yếu bằng `localStorage` ở frontend; backend có API `POST /api/orders/consume-stock` để ghi nhận xuất kho theo đơn.

## 6. Workflow đăng ký / đăng nhập

```mermaid
sequenceDiagram
  actor U as Người dùng
  participant FE as Frontend Auth
  participant BE as /api/auth
  participant DB as MongoDB

  U->>FE: Nhập email, mật khẩu
  FE->>BE: POST /register hoặc /login
  BE->>DB: Kiểm tra user
  alt Đăng ký
    BE->>DB: Hash password và tạo user
  else Đăng nhập
    BE->>DB: Lấy user + password
    BE->>BE: bcrypt compare
  end
  BE->>BE: Tạo JWT
  BE-->>FE: Trả token + user
  FE->>FE: Lưu auth state / localStorage
```

## 7. Workflow tư vấn AI

```mermaid
sequenceDiagram
  actor U as Người dùng
  participant FE as aiService
  participant BE as /api/ai/chat
  participant MW as optimizeAiRequests
  participant Intent as Intent Analyzer
  participant Match as Product Matching
  participant Rec as Recommendation Service
  participant Gemini as Gemini API
  participant DB as MongoDB

  U->>FE: Gửi câu hỏi tư vấn
  FE->>FE: Chuẩn hóa payload, cache, dedupe
  FE->>BE: POST /api/ai/chat
  BE->>MW: Chống spam, cache, dedupe
  BE->>Intent: Phân tích ý định mua sắm
  Intent-->>BE: category, budget, useCase, priorities
  BE->>Match: Tìm sản phẩm phù hợp
  Match->>DB: Query sản phẩm
  DB-->>Match: Candidate products
  Match-->>BE: Top products
  BE->>Rec: Tạo giải thích gợi ý
  Rec->>Gemini: Gửi prompt rút gọn
  Gemini-->>Rec: Nội dung tư vấn
  Rec-->>BE: Reply + metadata
  BE-->>FE: Reply + recommendedProducts + context
  FE-->>U: Hiển thị tư vấn và sản phẩm gợi ý
```

## 8. Workflow review sản phẩm

```mermaid
flowchart TD
  A[Người dùng mở Product Detail] --> B[FE gọi GET /api/reviews/product/:productId]
  B --> C[Backend optionalAuth nhận diện user nếu có token]
  C --> D[Trả danh sách review, rating breakdown, review của user]
  D --> E{Người dùng đã đăng nhập?}
  E -->|Không| F[Hiển thị yêu cầu đăng nhập để đánh giá]
  E -->|Có| G[Gửi / sửa / xóa review]
  G --> H[authMiddleware + reviewWriteRateLimit]
  H --> I[productReviewService validate dữ liệu]
  I --> J[Cập nhật ProductReview]
  J --> K[Tính lại averageRating và totalReviews trong Product]
  K --> L[Làm mới review summary]
  L --> M[Frontend cập nhật UI]
```

## 9. Workflow quản trị sản phẩm

```mermaid
flowchart TD
  A[Admin đăng nhập] --> B[JWT có role admin]
  B --> C[Truy cập /admin/products]
  C --> D{Thao tác}
  D -->|Thêm| E[POST /api/products]
  D -->|Sửa| F[PUT /api/products/:id]
  D -->|Xóa| G[DELETE /api/products/:id]
  E --> H[authMiddleware + requireAdmin]
  F --> H
  G --> H
  H --> I[productController chuẩn hóa payload]
  I --> J[Product model]
  G --> K[Xóa review liên quan trước khi xóa sản phẩm]
  J --> L[(MongoDB)]
  K --> L
```

## 10. Workflow quản lý tồn kho

```mermaid
flowchart TD
  A[Admin vào /admin/inventory] --> B[FE gọi /api/inventory/dashboard]
  B --> C[Backend authMiddleware + requireAdmin]
  C --> D[inventoryDashboardService tổng hợp số liệu]
  D --> E[Hiển thị tồn kho, nhập/xuất, cảnh báo]
  E --> F{Thao tác}
  F -->|Nhập kho| G[POST /api/inventory/import]
  F -->|Xuất kho| H[POST /api/inventory/export]
  F -->|Xem giao dịch| I[GET /api/inventory/transactions]
  F -->|AI insights| J[POST /api/ai/inventory-insights]
  G --> K[inventoryService tạo phiếu nhập + transaction + tăng stock]
  H --> L[inventoryService tạo phiếu xuất + transaction + giảm stock]
  I --> M[Trả danh sách giao dịch có filter/phân trang]
  J --> N[inventoryAiService phân tích tồn kho]
```

## 11. Workflow phân quyền admin

```mermaid
flowchart TD
  A[Super admin đăng nhập] --> B[Truy cập /admin/access]
  B --> C[GET /api/auth/admin-access]
  C --> D[authMiddleware + requireSuperAdmin]
  D --> E[Hiển thị danh sách admin]
  E --> F{Thao tác}
  F -->|Cấp quyền| G[POST /api/auth/admin-access/grant]
  F -->|Thu hồi quyền| H[POST /api/auth/admin-access/revoke]
  G --> I[Cập nhật role user thành admin]
  H --> J[Cập nhật role user thành customer]
  I --> K[(MongoDB User)]
  J --> K
```

## 12. Các tác nhân và quyền

| Tác nhân | Quyền chính |
| --- | --- |
| Khách chưa đăng nhập | Xem sản phẩm, tìm kiếm, xem chính sách, chat AI cơ bản |
| Customer | Quản lý tài khoản, giỏ hàng, wishlist, đơn hàng local, review, AI theo ngữ cảnh cá nhân |
| Admin | CRUD sản phẩm, quản lý review, đơn hàng, tồn kho |
| Super admin | Toàn quyền admin, quản lý thanh toán, cấp/thu hồi quyền admin |

## 13. Luồng dữ liệu chính

```mermaid
flowchart LR
  Product[Product] --> ProductUI[Home / Products / ProductDetail]
  Product --> Review[ProductReview]
  Review --> Rating[Average rating / Review summary]
  Product --> Cart[Cart Context]
  Cart --> Order[Order localStorage]
  Order --> Inventory[Inventory export transaction]
  Product --> AIContext[AI context]
  Review --> AIContext
  Cart --> AIContext
  AIContext --> AIReply[AI recommendation / compare / explain / cart analysis]
```
