const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(__dirname, '../../public/uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình storage cho multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Lưu tạm vào thư mục temp, sau đó di chuyển trong controller
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Tạo tên file unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter - chỉ cho phép upload ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Middleware để xử lý nhiều field upload
const uploadProductImages = upload.fields([
  { name: 'mainImages', maxCount: 6 },
  { name: 'colors[0][images]', maxCount: 6 },
  { name: 'colors[1][images]', maxCount: 6 },
  { name: 'colors[2][images]', maxCount: 6 },
  { name: 'colors[3][images]', maxCount: 6 },
  { name: 'colors[4][images]', maxCount: 6 },
  { name: 'colors[5][images]', maxCount: 6 },
  { name: 'colors[6][images]', maxCount: 6 },
  { name: 'colors[7][images]', maxCount: 6 },
  { name: 'colors[8][images]', maxCount: 6 },
  { name: 'colors[9][images]', maxCount: 6 },
]);

module.exports = {
  upload,
  uploadProductImages,
};
