# 🛒 Xây dựng Website Thương Mại Điện Tử với Node.js

Website Thương Mại Điện Tử (E-Commerce) là nền tảng giúp người dùng xem sản phẩm, thêm vào giỏ hàng, mua sắm và thanh toán trực tuyến. Đây là một hệ thống hiện đại, linh hoạt, dễ mở rộng, phù hợp cho các doanh nghiệp muốn kinh doanh online hiệu quả.

---

## 🚀 Mục tiêu dự án

Dự án nhằm xây dựng một hệ thống thương mại điện tử đầy đủ chức năng, giúp doanh nghiệp:

-   Quản lý sản phẩm, đơn hàng, khách hàng và thanh toán.

-   Tối ưu trải nghiệm mua sắm cho người dùng.

-   Mở rộng hoạt động kinh doanh dễ dàng theo nhu cầu thực tế.

-   Tạo nền tảng sẵn sàng phát triển thành ứng dụng web/mobile.

---

## 🛍️ Tính năng chính

**👤 Người dùng**

-   Đăng ký, đăng nhập, quản lý tài khoản.

-   Xem danh mục sản phẩm, tìm kiếm, lọc sản phẩm.

-   Xem chi tiết sản phẩm.

-   Thêm sản phẩm vào giỏ hàng, thanh toán.

-   Xem lịch sử mua hàng.

**🛡️ Admin**

-   Quản lý sản phẩm (CRUD).

-   Quản lý đơn hàng & trạng thái giao hàng.

-   Quản lý người dùng.

-   Thống kê doanh thu / sản phẩm bán chạy.

## 💻Hướng dẫn chạy dự án tạo dự án

Dự án này chạy bằng **Node.js**, file khởi động chính là **index.js**.

## 📌 Yêu cầu hệ thống

-   [Node.js](https://nodejs.org/) (phiên bản >= 16.x khuyến nghị)
-   [npm](https://www.npmjs.com/) (có sẵn khi cài Node.js)
-   [MySQL Server](dev.mysql.com/mysql) (phiên bản >= 8.0 khuyến nghị)
-   [MySQL Workbench](dev.mysql.com/workbench) (dùng để quản lý và trực quan hóa cơ sở dữ liệu)

---

## ⚙️ Cài đặt

1. Clone hoặc tải dự án về:

    ```bash
    git clone https://github.com/TUANKIET0397/TMDT_Project
    cd TMDT_Project
    ```

2. Cài dependencies:
    ```bash
    npm install
    ```

---

3. Lưu ý
    ```bash
    💡 Do trong quá trình phát triển và kiểm thử, đồng thời chưa có domain hoặc server, nên cần chạy MySQL cục bộ để xem được demo.
    - Xây dựng database dựa vào thư mục database
    - Đổi password theo root database của bạn
    - Xây dựng thêm file .env để có thể truy cập đến database
    ```

---

## ▶️ Chạy dự án

```bash
node src/index.js
```
