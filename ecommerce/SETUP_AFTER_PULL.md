# Huong Dan Sau Khi Pull/Clone

Tai lieu nay huong dan cac buoc can lam sau khi pull hoac clone project ve may moi.

## 1. Clone hoac pull code

Neu chua co source:

```bash
git clone https://github.com/QuangFabbier/DATN.git
```

Neu da co source:

```bash
git pull
```

## 2. Di chuyen vao thu muc project

```bash
cd DATN/ecommerce
```

## 3. Cai dependencies

Cai packages cho frontend:

```bash
npm --prefix fe install
```

Cai packages cho backend:

```bash
npm --prefix be install
```

## 4. Tao file moi truong cho backend

Tao file `.env` tu file mau:

```bash
cp be/.env.example be/.env
```

Sau do sua gia tri trong `be/.env`:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`

## 5. Chay project

Mo 2 terminal:

Terminal 1 (backend):

```bash
cd DATN/ecommerce
npm run dev:be
```

Terminal 2 (frontend):

```bash
cd DATN/ecommerce
npm run dev:fe
```

## 6. Kiem tra nhanh

Build frontend:

```bash
npm run build
```

Lint frontend:

```bash
npm run lint
```

## 7. (Tuy chon) Seed du lieu mau cho backend

```bash
cd DATN/ecommerce/be
node seedProducts.js
```

Luu y: script seed hien tai co the them trung du lieu neu chay nhieu lan.
