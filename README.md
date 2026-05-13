# Nexora - Website Thuong Mai Dien Tu ReactJS + NodeJS

Du an nay la website thuong mai dien tu phuc vu do an tot nghiep. Frontend duoc xay dung bang ReactJS, backend duoc xay dung bang NodeJS + ExpressJS va MongoDB. Project dang o giai doan nen tang full-stack: da co giao dien chinh, auth, API san pham va ket noi frontend voi backend.

## 1. Tong Quan

Project gom 2 phan:

```txt
ecommerce-ai-project/
  src/        Frontend ReactJS
  backend/   Backend ExpressJS + MongoDB
```

Chuc nang da co:

- Trang chu.
- Danh sach san pham.
- Tim kiem san pham tren Header.
- Loc san pham theo danh muc.
- Chi tiet san pham.
- Dang ky tai khoan.
- Dang nhap bang JWT.
- Header hien thi user khi da dang nhap.
- Dang xuat va xoa token/user khoi localStorage.
- Gio hang va yeu thich o muc React state.
- Trang dat hang giao dien ban dau.
- Trang tu van AI dang o muc placeholder.
- Backend API auth.
- Backend API san pham.
- Script seed 8 san pham mau vao MongoDB.

## 2. Cong Nghe

Frontend:

- ReactJS.
- JavaScript.
- Vite.
- React Router DOM.
- Axios.
- Context API.
- CSS thuan.

Backend:

- NodeJS.
- ExpressJS.
- MongoDB.
- Mongoose.
- BcryptJS.
- JSON Web Token.
- Dotenv.
- Cors.
- Nodemon.

## 3. Cau Truc Thu Muc

```txt
backend/
  config/
    db.js
  controllers/
    authController.js
    productController.js
  middleware/
    authMiddleware.js
  models/
    User.js
    Product.js
  routes/
    authRoutes.js
    productRoutes.js
    testRoutes.js
  .env
  .env.example
  package.json
  seedProducts.js
  server.js

src/
  assets/
  components/
    MainLayout.jsx
    ProductCard.jsx
  context/
    AuthContext.js
    AuthProvider.jsx
    CartContext.js
    CartProvider.jsx
    FavoritesContext.js
    FavoritesProvider.jsx
    SearchContext.js
    SearchProvider.jsx
  hooks/
    useAuth.js
    useCart.js
    useFavorites.js
    useProducts.js
    useSearch.js
  pages/
    Home.jsx
    Products.jsx
    ProductDetail.jsx
    Cart.jsx
    Favorites.jsx
    Orders.jsx
    Login.jsx
    Register.jsx
    AIConsultant.jsx
    NotFound.jsx
  services/
    authService.js
    productService.js
  utils/
    formatCurrency.js
  App.jsx
  App.css
  index.css
  main.jsx
```

## 4. Frontend

### 4.1 Routing

Routes duoc cau hinh trong `src/App.jsx`:

```txt
/                  Home
/products          Products
/products/:id      ProductDetail
/cart              Cart
/favorites         Favorites
/orders            Orders
/login             Login
/register          Register
/ai-consultant     AIConsultant
*                  NotFound
```

App dang duoc boc boi cac Provider:

- `AuthProvider`: quan ly user/token dang nhap.
- `SearchProvider`: quan ly keyword tim kiem tren Header.
- `FavoritesProvider`: quan ly san pham yeu thich.
- `CartProvider`: quan ly gio hang.

### 4.2 Header Va Layout

File: `src/components/MainLayout.jsx`

Header hien co:

- Logo `Nexora`.
- Thanh search o giua.
- Nut Yeu thich.
- Nut Gio hang.
- Neu chua dang nhap: hien `Dang nhap` va `Dang ky`.
- Neu da dang nhap: hien ten user va nut `Dang xuat`.
- Thanh nav nho nam ben duoi Header.

Search tren Header:

- Cap nhat keyword qua `SearchContext`.
- Bam Enter hoac nut `Tim kiem` se chuyen sang `/products?search=tukhoa`.
- O Home: loc san pham noi bat.
- O Products: loc danh sach san pham.

### 4.3 Trang Home

File: `src/pages/Home.jsx`

- Goi backend API de lay san pham.
- Lay 4 san pham dau tien lam san pham noi bat.
- Co loading va error state.
- Loc san pham noi bat theo keyword tu Header.

### 4.4 Trang Products

File: `src/pages/Products.jsx`

- Goi `GET http://localhost:5000/api/products` bang `useEffect`.
- Hien loading khi dang tai du lieu.
- Hien error neu khong goi duoc API.
- Loc san pham theo ten.
- Loc san pham theo category.
- Render san pham bang `ProductCard`.

### 4.5 Trang ProductDetail

File: `src/pages/ProductDetail.jsx`

- Lay `id` tu URL bang `useParams`.
- Goi `GET http://localhost:5000/api/products/:id`.
- Hien thi anh, ten, danh muc, gia, mo ta, so luong ton kho.
- Co nut quay lai danh sach.
- Nut `Them vao gio hang` va `Yeu thich` hien dang `console.log`, chua gan logic that.

### 4.6 Product Service

File: `src/services/productService.js`

Dang co:

```js
getProducts()
getProductById(id)
```

Base URL:

```txt
http://localhost:5000/api/products
```

Frontend hien da lay san pham tu backend thay vi JSON. File `src/data/products.json` van con trong project de tham khao, nhung khong con duoc import trong code.

### 4.7 Auth Frontend

File: `src/services/authService.js`

Base URL:

```txt
http://localhost:5000/api/auth
```

Dang co:

```js
register(userData)
login(credentials)
getMe(token)
```

Login:

- File: `src/pages/Login.jsx`.
- Form email/password.
- Goi API login.
- Thanh cong: luu `token` va `user` vao localStorage, chuyen ve trang chu.
- That bai: hien message loi.

Register:

- File: `src/pages/Register.jsx`.
- Form name/email/password.
- Goi API register.
- Thanh cong: hien thong bao va chuyen sang login.
- Neu email da ton tai: hien message loi.

Auth context:

- `src/context/AuthProvider.jsx`.
- `src/context/AuthContext.js`.
- `src/hooks/useAuth.js`.

### 4.8 Gio Hang Va Yeu Thich

Cart:

- `src/context/CartProvider.jsx`.
- `src/hooks/useCart.js`.
- `src/pages/Cart.jsx`.

Favorites:

- `src/context/FavoritesProvider.jsx`.
- `src/hooks/useFavorites.js`.
- `src/pages/Favorites.jsx`.

Tinh trang:

- Dang dung React state.
- Chua luu vao backend.
- Chua gan theo user dang nhap.
- Can chuan hoa id san pham sang `_id || id` de phu hop MongoDB.

### 4.9 Orders

File: `src/pages/Orders.jsx`

- Da co giao dien form dat hang.
- Da hien thi tom tat gio hang.
- Chua co API tao don hang.
- Chua luu don hang vao MongoDB.

### 4.10 AI Consultant

File: `src/pages/AIConsultant.jsx`

- Dang la logic tu van tam theo keyword.
- Chua ket noi API AI that.

## 5. Backend

### 5.1 Server

File: `backend/server.js`

Server dang:

- Load `.env` bang `dotenv`.
- Ket noi MongoDB bang `connectDB()`.
- Dung `cors()`.
- Dung `express.json()`.
- Mount routes:

```js
app.use('/api/test', testRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
```

Port mac dinh: `5000`.

### 5.2 Database Config

File: `backend/config/db.js`

- Doc `MONGO_URI` tu `.env`.
- Goi `mongoose.connect(process.env.MONGO_URI)`.
- Log khi ket noi thanh cong.
- Catch loi khi ket noi that bai.

Khong dua noi dung `.env` that len GitHub.

### 5.3 Auth Backend

Model User: `backend/models/User.js`

Fields:

```txt
name: String
email: String, unique
password: String
createdAt: Date
```

Controller: `backend/controllers/authController.js`

Register:

- Nhan name/email/password.
- Kiem tra thieu field va tra 400.
- Khong destructure truc tiep tu `req.body` neu body undefined.
- Kiem tra email ton tai.
- Hash password bang bcryptjs.
- Luu user vao MongoDB.
- Tra user khong co password.

Login:

- Nhan email/password.
- Kiem tra thieu field va tra 400.
- Tim user theo email.
- So sanh password bang bcryptjs.compare.
- Tao JWT token.
- Tra token va user info.

Middleware: `backend/middleware/authMiddleware.js`

- Doc token tu `Authorization: Bearer <token>`.
- Verify JWT.
- Tim user.
- Gan user vao `req.user`.

Routes: `backend/routes/authRoutes.js`

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### 5.4 Product Backend

Model Product: `backend/models/Product.js`

Fields:

```txt
name: String
category: String
price: Number
image: String
description: String
stock: Number
createdAt: Date
```

Controller: `backend/controllers/productController.js`

Dang co:

```js
getProducts
getProductById
```

Routes: `backend/routes/productRoutes.js`

```txt
GET /api/products
GET /api/products/:id
```

### 5.5 Test API

Route:

```txt
GET /api/test
```

Response:

```json
{
  "message": "Backend is running"
}
```

## 6. Seed San Pham

File: `backend/seedProducts.js`

Script nay:

- Load `.env`.
- Ket noi MongoDB.
- Insert 8 san pham mau bang `Product.insertMany`.
- Ngat ket noi MongoDB sau khi chay.

Nhom san pham mau:

- Laptop.
- Dien thoai.
- Tai nghe.
- Ban phim.

Chay seed:

```bash
cd backend
node seedProducts.js
```

Luu y: chay nhieu lan se them trung du lieu vi script hien chua xoa collection hoac upsert.

## 7. Bien Moi Truong

File mau: `backend/.env.example`

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

File that: `backend/.env`

Khong commit `.env` that vi co thong tin nhay cam.

## 8. API Hien Co

Auth API:

```txt
POST http://localhost:5000/api/auth/register
POST http://localhost:5000/api/auth/login
GET  http://localhost:5000/api/auth/me
```

Product API:

```txt
GET http://localhost:5000/api/products
GET http://localhost:5000/api/products/:id
```

Test API:

```txt
GET http://localhost:5000/api/test
```

## 9. Cach Chay Project

Cai dependencies frontend:

```bash
npm install
```

Cai dependencies backend:

```bash
cd backend
npm install
```

Chay backend:

```bash
cd backend
npm run dev
```

Chay frontend:

```bash
npm run dev
```

Seed san pham:

```bash
cd backend
node seedProducts.js
```

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

## 10. Trang Thai Kiem Tra

Da kiem tra gan nhat:

```txt
npm run lint: pass
npm run build: pass
```

Neu build gap loi `spawn EPERM` tren Windows sandbox, hay chay lai trong terminal binh thuong. Loi nay thuong do quyen tao process cua moi truong, khong phai loi code.

## 11. Viec Nen Lam Tiep

1. Chuan hoa gio hang va yeu thich de dung `_id` tu MongoDB.
2. Gan nut `Them vao gio hang` va `Yeu thich` trong ProductDetail vao context that.
3. Luu gio hang/yeu thich vao localStorage hoac backend theo user.
4. Tao Order model, Order controller va Order routes.
5. Ket noi trang Orders voi backend de tao don hang that.
6. Bao ve API dat hang bang JWT middleware.
7. Them API admin cho san pham: create, update, delete.
8. Sua seed script de tranh trung du lieu.
9. Tach API URL frontend sang bien moi truong `VITE_API_URL`.
10. Them validation form frontend/backend.
11. Cai tien responsive mobile.
12. Ket noi AI Consultant voi API AI that sau khi luong san pham va dat hang on dinh.

## 12. Ket Luan

Project hien da co nen tang full-stack co ban:

```txt
ReactJS frontend
ExpressJS backend
MongoDB database
JWT authentication
Product API
Frontend lay san pham tu backend
Seed du lieu mau
```

Huong phat trien tiep theo nen uu tien cac chuc nang thuong mai dien tu cot loi: gio hang, yeu thich, dat hang, quan ly don hang, bao ve route bang token. Sau do moi mo rong sang tu van san pham bang AI.
