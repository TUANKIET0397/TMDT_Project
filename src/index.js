require('dotenv').config();
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const { engine } = require('express-handlebars');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Route và Database
const route = require('./routes');
const db = require('./config/db');

// Test database connection
db.getConnection()
  .then((connection) => {
    console.log('✅ Database connected');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ Database error:', err.message);
  });

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// session middleware
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 ngày
      httpOnly: true,
      secure: false, // để true khi chạy HTTPS
    },
  })
);

// static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img')));

// HTTP logger
app.use(morgan('combined'));

// ===== TEMPLATE ENGINE =====
app.engine(
  '.hbs',
  engine({
    extname: '.hbs',
    allowProtoPropertiesByDefault: true,
    helpers: {
      // Content block helpers
      block: function (name) {
        this._blocks = this._blocks || {};
        const val = (this._blocks[name] || []).join('\n');
        return val;
      },
      contentFor: function (name, options) {
        this._blocks = this._blocks || {};
        this._blocks[name] = this._blocks[name] || [];
        this._blocks[name].push(options.fn(this));
      },

      // ===== CUSTOM HELPERS =====
      formatPrice: function (price) {
        if (!price) return '0.00';
        return parseFloat(price)
          .toFixed(2)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      },

      formatDate: function (date) {
        if (!date) return '';
        const d = new Date(date);
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      },

      eq: function (a, b) {
        return a === b;
      },

      multiply: function (a, b) {
        return parseFloat(a || 0) * parseFloat(b || 0);
      },
    },
  })
);

app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'resources', 'views'));
    ".hbs",
    engine({
        extname: ".hbs",
        allowProtoPropertiesByDefault: true,
        helpers: {
            block: function (name) {
                this._blocks = this._blocks || {}
                const val = (this._blocks[name] || []).join("\n")
                return val
            },
            contentFor: function (name, options) {
                this._blocks = this._blocks || {}
                this._blocks[name] = this._blocks[name] || []
                this._blocks[name].push(options.fn(this))
            },
            eq: function (a, b) {
                return a === b
            },
            includes: function (arr, val) {
                if (!arr) return false
                if (Array.isArray(arr)) {
                    return arr.includes(val)
                }
                return arr === val
            },
        },
    })

app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "resources", "views"))

// nạp route vào app
route(app);

// Start server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
