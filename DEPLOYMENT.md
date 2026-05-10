# 📋 Tài Liệu Triển Khai Dự Án AIMS

> **Cập nhật lần cuối:** 30/04/2026

---

## 🔗 Đường Link Triển Khai

| Môi trường | URL | Nền tảng |
|------------|-----|----------|
| **Backend API** | https://isd-20252-23.onrender.com | Render |
| **Frontend** | https://isd-20252-23.vercel.app/ | Vercel |

- **API Base URL:** `https://isd-20252-23.onrender.com/api`

> [!NOTE]
> Backend trên Render (free tier) sẽ tự động **spin down sau 15 phút** không có request. Lần request đầu tiên sau khi spin down sẽ mất ~30–50 giây để khởi động lại (cold start).

---

## 📁 Cấu Trúc Dự Án

```
ISD.20252-23/                        ← Git root
├── .husky/                          ← Git hooks (commitlint, lint-staged)
├── .github/workflows/               ← CI/CD pipelines
├── commitlint.config.ts             ← Quy tắc commit message
├── package.json                     ← Dependencies cho husky & lint-staged
│
├── Programming/
│   ├── .env                         ← Biến môi trường (KHÔNG push lên Git)
│   ├── prisma/
│   │   └── schema.prisma            ← Database schema (PostgreSQL)
│   ├── prisma.config.ts             ← Prisma configuration
│   │
│   └── AIMS/                        ← 🏗️ Nx Monorepo Root
│       ├── nx.json                  ← Nx workspace config
│       ├── package.json             ← Dependencies chính (Angular + NestJS)
│       ├── tsconfig.base.json       ← TypeScript config dùng chung
│       ├── packages/
│       │   └── shared/datatypes/    ← Shared types giữa FE & BE
│       └── apps/
│           ├── api/                 ← ⚙️ Backend (NestJS)
│           ├── api-e2e/             ← Backend E2E tests
│           └── client/              ← 🖥️ Frontend (Angular)
│
├── RequirementAnalysis/             ← Tài liệu phân tích yêu cầu
├── ArchitecturalDesign/             ← Tài liệu thiết kế kiến trúc
└── DetailedDesign/                  ← Tài liệu thiết kế chi tiết
```

---

## 🚀 Hướng Dẫn Cài Đặt Cho Dev Mới

### Yêu Cầu Hệ Thống

| Công cụ | Phiên bản tối thiểu | Kiểm tra |
|---------|---------------------|----------|
| **Node.js** | >= 18.x | `node -v` |
| **npm** | >= 9.x | `npm -v` |
| **Git** | >= 2.x | `git --version` |

### Bước 1: Clone Repository

```bash
git clone git@github.com:hieubui27/ISD.20252-23.git
cd ISD.20252-23
```

### Bước 2: Cài Đặt Dependencies (Root - Husky & Lint-staged)

```bash
npm install
```

> Lệnh này cài đặt `husky`, `commitlint`, `lint-staged` và tự động kích hoạt Git hooks qua script `prepare`.

### Bước 3: Cài Đặt Dependencies (Prisma)

```bash
cd Programming
npm install
```

### Bước 4: Cài Đặt Dependencies (Nx Monorepo)

```bash
cd AIMS
npm install
```

### Bước 5: Cấu Hình Biến Môi Trường

Tạo file `Programming/.env` với nội dung sau (xin credentials từ team lead):

```env
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>?schema=public"
```

### Bước 6: Generate Prisma Client

```bash
# Từ thư mục Programming/
npx prisma generate
```

---

## 💻 Chạy Dự Án Ở Local

### Chạy Backend (NestJS)

```bash
# Từ thư mục Programming/AIMS/
npx nx serve api
```

Backend sẽ chạy tại: `http://localhost:3000/api`

### Chạy Frontend (Angular)

```bash
# Từ thư mục Programming/AIMS/
npx nx serve client
```

Frontend sẽ chạy tại: `http://localhost:4200`

### Chạy Cả Hai Cùng Lúc

```bash
# Từ thư mục Programming/AIMS/
npx nx run-many -t serve -p api client
```

---

## 📝 Quy Tắc Commit Message

Dự án sử dụng **Conventional Commits**. Mỗi commit message phải theo format:

```
<type>(<scope>): <description>
```

### Các type được phép:

| Type | Mô tả |
|------|--------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa lỗi |
| `docs` | Thay đổi tài liệu |
| `style` | Format code (không thay đổi logic) |
| `refactor` | Tái cấu trúc code |
| `test` | Thêm hoặc sửa test |
| `chore` | Công việc bảo trì (config, dependencies) |
| `ci` | Thay đổi CI/CD |

### Ví dụ:

```bash
git commit -m "feat(api): add user authentication endpoint"
git commit -m "fix(client): resolve login form validation"
git commit -m "docs: update deployment guide"
```

> [!WARNING]
> Commit message **không đúng format** sẽ bị **từ chối** bởi commitlint hook. Code có lỗi lint cũng sẽ bị chặn bởi lint-staged.

---

## 🔄 Quy Trình Làm Việc Hàng Ngày

### 1. Tạo Branch Mới

```bash
git checkout main
git pull origin main
git checkout -b feat/ten-tinh-nang
```

### 2. Code & Commit

```bash
# Sau khi code xong
git add .
git commit -m "feat(api): implement product CRUD"
# → Husky tự động chạy lint-staged & commitlint
```

### 3. Push & Tạo Pull Request

```bash
git push origin feat/ten-tinh-nang
# → Tạo Pull Request trên GitHub
```

### 4. Sau Khi PR Được Merge

```bash
git checkout main
git pull origin main
```

---

## ⚙️ Cấu Hình Triển Khai

### Backend — Render

| Setting | Giá trị |
|---------|---------|
| **Service Type** | Web Service |
| **Root Directory** | `Programming/AIMS` |
| **Build Command** | `npm install && npx nx build api` |
| **Start Command** | `node dist/apps/api/main.js` |
| **Environment** | Node |

**Environment Variables trên Render:**

| Biến | Giá trị |
|------|---------|
| `PORT` | `10000` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://...` |

### Frontend — Vercel

| Setting | Giá trị |
|---------|---------|
| **Root Directory** | `Programming/AIMS` |
| **Framework Preset** | Other |
| **Build Command** | `npx nx build client --configuration=production` |
| **Output Directory** | `dist/apps/client/browser` |

### Frontend — Render (Static Site)

Nếu bạn muốn deploy frontend lên **Render**, hãy tạo một **Static Site** với cấu hình sau:

| Setting | Giá trị |
|---------|---------|
| **Name** | `aims-client` (hoặc tên tùy chọn) |
| **Root Directory** | `Programming/AIMS` |
| **Build Command** | `npm install && npx nx build client --configuration=production` |
| **Publish Directory** | `dist/apps/client/browser` |

**Cấu hình Redirect/Rewrite cho Angular (SPA):**
Để tránh lỗi 404 khi reload trang, chuyển đến tab **Redirects/Rewrites** và thêm rule sau:
- **Source:** `/*`
- **Destination:** `/index.html`
- **Action:** `Rewrite`

---

## 🗄️ Database

- **Database Engine:** PostgreSQL
- **ORM:** Prisma
- **Schema:** `Programming/prisma/schema.prisma`

### Các Lệnh Prisma Thường Dùng

```bash
# Từ thư mục Programming/

# Generate Prisma Client sau khi thay đổi schema
npx prisma generate

# Tạo migration mới
npx prisma migrate dev --name ten_migration

# Xem database bằng Prisma Studio
npx prisma studio

# Reset database (⚠️ XÓA TOÀN BỘ DỮ LIỆU)
npx prisma migrate reset
```

---

## 🛠️ Các Lệnh Nx Hữu Ích

```bash
# Từ thư mục Programming/AIMS/

# Build backend
npx nx build api

# Build frontend
npx nx build client

# Lint code
npx nx lint api
npx nx lint client

# Xem dependency graph
npx nx graph
```

---

## ❓ Xử Lý Sự Cố Thường Gặp

### 1. Lỗi `commitlint` khi commit

**Nguyên nhân:** Commit message không đúng format Conventional Commits.

**Giải pháp:** Viết lại commit message theo format `type(scope): description`.

### 2. Lỗi `lint-staged` khi commit

**Nguyên nhân:** Code có lỗi ESLint hoặc Prettier.

**Giải pháp:** Chạy `npx eslint --fix` và `npx prettier --write` trên các file bị lỗi.

### 3. Lỗi `Cannot find module` khi chạy local

**Nguyên nhân:** Chưa cài đặt dependencies.

**Giải pháp:** Chạy `npm install` ở cả 3 thư mục: root, `Programming/`, và `Programming/AIMS/`.

### 4. Lỗi Prisma Client

**Nguyên nhân:** Chưa generate Prisma Client hoặc schema thay đổi.

**Giải pháp:** Chạy `npx prisma generate` từ thư mục `Programming/`.

### 5. Backend Render trả về 502/503

**Nguyên nhân:** Service đang cold start hoặc build lỗi.

**Giải pháp:** Đợi 30–50 giây rồi thử lại. Nếu vẫn lỗi, kiểm tra logs trên Render Dashboard.
