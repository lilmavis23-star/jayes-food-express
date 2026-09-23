'use strict';
/* =====================================================================
   Jaye's Food Express — core helpers, cart storage, screen manager.
   Loaded FIRST. All other app-*.js files depend on this.
===================================================================== */

var CART_KEY = 'jayes_cart';

/* ============ Categories ============ */
/* Edit these two lists to change the dropdowns everywhere at once. */
var STORE_CATEGORIES = [
  'Nigerian Food',
  'Fast Food',
  'Pastries & Cakes',
  'Drinks',
  'Groceries & Foodstuffs',
  'Other'
];

var FOOD_CATEGORIES = [
  'Rice & Meals',
  'Chicken',
  'Beef',
  'Turkey',
  'Noodles',
  'Pastries',
  'Cakes',
  'Snacks',
  'Sides',
  'Drinks',
  'Groceries',
  'Other'
];

/* Renders a <select> for a category field. Keeps whatever the vendor already
   had saved, even if it's no longer in the list. */
function categorySelect(id, current, list, placeholder) {
  var opts = '';
  var found = false;
  list.forEach(function (c) {
    var sel = (c === current) ? ' selected' : '';
    if (c === current) found = true;
    opts += '<option value="' + esc(c) + '"' + sel + '>' + esc(c) + '</option>';
  });
  if (current && !found) {
    opts = '<option value="' + esc(current) + '" selected>' + esc(current) + ' (current)</option>' + opts;
  }
  return '<select id="' + id + '">' +
    '<option value="">' + esc(placeholder || '— Select —') + '</option>' +
    opts +
    '</select>';
}

var IMG_TARGETS = {
  restaurant: { maxDim: 1000, quality: 0.82 },
  food:       { maxDim: 900,  quality: 0.80 }
};

var state = { currentRestaurantId: null, checkoutOption: 'Delivery' };

var currentVendorUser = null;
var currentVendorRestaurant = null;

/* ============ General helpers ============ */
function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function money(n) {
  n = Number(n);
  if (!isFinite(n) || n < 0) n = 0;
  return '₦' + Math.round(n).toLocaleString('en-NG');
}
function toNum(n, dflt) {
  n = Number(n);
  return isFinite(n) ? n : (dflt || 0);
}
function uid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function isImageSrc(v) {
  return /^(https?:|data:|blob:|\/|\.\/|\.\.\/)/i.test(String(v || '')) ||
         /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(String(v || ''));
}
function imageHTML(img, cls) {
  cls = cls || '';
  if (!img) img = '🍽️';
  if (isImageSrc(img)) {
    return '<span class="imgwrap ' + cls + '"><img src="' + esc(img) + '" alt="" loading="lazy" ' +
      'onerror="this.style.display=\'none\';this.parentNode.classList.add(\'emoji-thumb\');this.parentNode.textContent=\'🍽️\';">' +
      '</span>';
  }
  return '<span class="emoji-thumb ' + cls + '">' + esc(img) + '</span>';
}
function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}
function normalizeWhatsApp(num) {
  var d = String(num || '').replace(/\D/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.charAt(0) === '0') d = '234' + d.slice(1);
  return d;
}
function fieldVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function markInvalid(id, bad) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('field-err', !!bad);
  return !bad;
}

/* ============ Cart storage (localStorage) ============ */
function cartLoad() {
  try {
    var raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    var c = JSON.parse(raw);
    if (!c || !c.restaurantId || !Array.isArray(c.items)) return null;
    c.items = c.items.filter(function (it) { return it && it.productId && toNum(it.qty) > 0; });
    if (!c.items.length) return null;
    return c;
  } catch (e) { return null; }
}
function cartSave(c) {
  try {
    if (!c || !c.items || !c.items.length) localStorage.removeItem(CART_KEY);
    else localStorage.setItem(CART_KEY, JSON.stringify(c));
  } catch (e) { toast('Could not save cart.'); }
  updateCartBadge();
}
function getCart() { return cartLoad(); }
function setCart(c) { cartSave(c); }
function cartQty {
(productId) {
  var c = getCart();
   if (!c) return 0;
  for var (var i = 0; i < c.items.length; i p++) {
    if (c.items[i]. =productId === productId) return toNum(c.items[i].q getty);
  }
  return 0;
}
function cartCount() {
  var c = getCart(), n = 0;
  if (!c) return 0;
  c.items.forEach(function (it) { n += toNum(it.qty); });
  return n;
}
function updateCartBadge() {
  var n = cartCount();
  ['cart-badge', 'nav-cart-badge'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.textContent = n; el.style.display = n ? 'grid' : 'none'; }
  });
}

/* ============ Data access (via Supabase cache) ============ */
function getRestaurants()   { return SupaData.getRestaurants(); }
function getProducts()      { return SupaData.getProducts(); }
function getProductsFor(id) { return SupaData.getProductsFor(id); }
function getRestaurant(id)  { return SupaData.getRestaurant(id); }
function getProduct(id)     { return SupaData.getProduct(id); }

/* ============ Opening hours ============ */
function toMin(t) {
  var m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
  if (!m) return null;
  return (parseInt(m[1], 10) * 60) + parseInt(m[2], 10);
}
function isRestaurantOpen(r) {
  if (!r || r.active === false) return false;
  var open = toMin(r.openingTime), close = toMin(r.closingTime);
  if (open === null || close === null) return true;
  var now = new Date();
  var nowM = now.getHours() * 60 + now.getMinutes();
  if (close <= open) return nowM >= open || nowM < close;
  return nowM >= open && nowM < close;
}

/* ============ Image compression ============ */
function compressImageToBlob(file, maxDim, quality) {
  return new Promise(function (resolve, reject) {
    if (!file || !/^image\//i.test(file.type)) { reject(new Error('Not an image')); return; }
    var reader = new FileReader();
    reader.onerror = function () { reject(new Error('Could not read file')); };
    reader.onload = function (ev) {
      var img = new Image();
      img.onerror = function () { reject(new Error('Could not load image')); };
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (!w || !h) { reject(new Error('Bad dimensions')); return; }
          if (w > maxDim || h > maxDim) {
            if (w >= h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
            else        { w = Math.round(w * (maxDim / h)); h = maxDim; }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          if (canvas.toBlob) {
            canvas.toBlob(function (blob) {
              if (blob) resolve(blob);
              else reject(new Error('Encoding failed'));
            }, 'image/jpeg', quality);
          } else {
            var dataUrl = canvas.toDataURL('image/jpeg', quality);
            var bin = atob(dataUrl.split(',')[1]);
            var arr = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            resolve(new Blob([arr], { type: 'image/jpeg' }));
          }
        } catch (err) { reject(err); }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ============ Screen manager ============ */
var SCREENS = ['customer-app', 'restaurant-page', 'vendor-login', 'vendor-register', 'vendor-dashboard',
  'menu-manager', 'food-form', 'restaurant-settings', 'opening-hours', 'whatsapp-settings'];

function showScreen(name) {
  SCREENS.forEach(function (s) {
    var el = document.getElementById('screen-' + s);
    if (el) el.classList.toggle('active', s === name);
  });
  var showNav = (name === 'customer-app' || name === 'restaurant-page');
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = showNav ? 'flex' : 'none';
  ['nav-home', 'nav-rest', 'nav-cart', 'nav-vendor'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  var activeNav = { 'customer-app': 'nav-home', 'restaurant-page': 'nav-rest' }[name];
  if (activeNav) { var el = document.getElementById(activeNav); if (el) el.classList.add('active'); }
  window.scrollTo(0, 0);
}