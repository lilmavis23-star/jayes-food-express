'use strict';
/* Munch Express — customer UI: home, restaurant page, cart. */

function addToCart(productId) {
  var p = getProduct(productId);
  if (!p) { toast('This item is no longer available.'); return; }
  var r = getRestaurant(p.restaurantId);
  if (!r) { toast('Restaurant unavailable.'); return; }
  if (!isRestaurantOpen(r)) { toast('Sorry, ' + r.name + ' is currently closed.'); return; }
  if (p.available === false) { toast('Sorry, ' + p.name + ' is unavailable right now.'); return; }

  var c = getCart();
  if (c && c.restaurantId !== p.restaurantId) {
    var oldR = getRestaurant(c.restaurantId);
    showModal({
      title: 'Start a new order?',
      body: '<p>Your cart contains items from <strong>' + esc(oldR ? oldR.name : 'another restaurant') +
            '</strong>.</p><p class="mt8">Start a new order from <strong>' + esc(r.name) +
            '</strong>? Your current cart will be cleared.</p>',
      actions: [
        { label: 'Cancel', className: 'btn-outline' },
        { label: 'Clear & Add', className: 'btn-orange', onClick: function () {
            setCart({ restaurantId: p.restaurantId, items: [{ productId: p.id, qty: 1 }] });
            toast(p.name + ' added to cart');
            if (state.currentRestaurantId) renderRestaurantPage();
            renderCart();
          } }
      ]
    });
    return;
  }
  if (!c) c = { restaurantId: p.restaurantId, items: [] };
  var found = false;
  c.items.forEach(function (it) {
    if (it.productId === p.id) { it.qty = toNum(it.qty) + 1; found = true; }
  });
  if (!found) c.items.push({ productId: p.id, qty: 1 });
  setCart(c);
  toast(p.name + ' added to cart');
  if (state.currentRestaurantId === p.restaurantId) updateProductControl(p.id);
  var ov = document.getElementById('cart-overlay');
  if (ov && ov.classList.contains('open')) renderCart();
}

function changeQty(productId, delta) {
  var c = getCart();
  if (!c) return;
  c.items = c.items.filter(function (it) {
    if (it.productId !== productId) return true;
    it.qty = toNum(it.qty) + delta;
    return it.qty > 0;
  });
  setCart(c);
  renderCart();
  var co = document.getElementById('checkout-overlay');
  if (co && co.classList.contains('open')) renderCheckout();
  if (state.currentRestaurantId) updateProductControl(productId);
}

function removeFromCart(productId) {
  var c = getCart();
  if (!c) return;
  c.items = c.items.filter(function (it) { return it.productId !== productId; });
  setCart(c);
  renderCart();
  if (state.currentRestaurantId) renderRestaurantPage();
}

function clearCartWithConfirm() {
  showModal({
    title: 'Clear cart?',
    body: '<p>Remove all items from your cart?</p>',
    actions: [
      { label: 'Cancel', className: 'btn-outline' },
      { label: 'Clear Cart', className: 'btn-danger', onClick: function () {
          setCart(null); renderCart(); toast('Cart cleared');
        } }
    ]
  });
}

function cartLines() {
  var c = getCart();
  if (!c) return { cart: null, lines: [], foodTotal: 0, restaurant: null, deliveryFee: 0, disposableFee: 0 };
  var r = getRestaurant(c.restaurantId);
  var lines = [], foodTotal = 0;
  c.items.forEach(function (it) {
    var p = getProduct(it.productId);
    if (!p || p.restaurantId !== c.restaurantId) return;
    var qty = toNum(it.qty);
    var price = toNum(p.price);
    var line = price * qty;
    foodTotal += line;
    lines.push({ product: p, qty: qty, price: price, line: line });
  });
  var fee = r ? toNum(r.deliveryFee) : 0;
  var pack = r ? toNum(r.disposableFee) : 0;
  return { cart: c, lines: lines, foodTotal: foodTotal, restaurant: r, deliveryFee: fee, disposableFee: pack };
}

function openHome() {
  renderRestaurantList();
  showScreen('customer-app');
  updateCartBadge();
  try {
    var url = new URL(window.location.href);
    if (url.searchParams.has('r')) {
      url.searchParams.delete('r');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) {}
}

function openRestaurantList() {
  openHome();
  var sec = document.getElementById('restaurant-section');
  if (sec) sec.scrollIntoView({ behavior: 'smooth' });
}

function scrollToRestaurants() { openRestaurantList(); }

function renderRestaurantList() {
  var el = document.getElementById('restaurant-list');
  if (!el) return;

  if (!state.dataLoaded) {
    if (state.dataLoadFailed) {
      el.innerHTML = '<div class="empty-state"><div class="big">📡</div><p>Could not load restaurants.</p><p class="mt8" style="font-size:.82rem;">Check your connection and refresh.</p></div>';
    } else {
      var sk = '<div class="skeleton-card"><div class="skel-thumb"></div><div class="skel-body"><div class="skel-line skel-title"></div><div class="skel-line skel-meta"></div><div class="skel-line skel-meta short"></div><div class="skel-line skel-btn"></div></div></div>';
      el.innerHTML = sk + sk + sk;
    }
    var ctrl = document.getElementById('restaurant-controls');
    if (ctrl) ctrl.style.display = 'none';
    return;
  }

  var allRestaurants = getRestaurants();
  var controls = document.getElementById('restaurant-controls');
  if (controls) controls.style.display = allRestaurants.length ? '' : 'none';

  if (!allRestaurants.length) {
    el.innerHTML = '<div class="empty-state"><div class="big">🏪</div><p>No restaurants yet.</p><p class="mt8" style="font-size:.82rem;">Are you a restaurant owner? Tap <strong>Vendor</strong> below to register and start receiving orders.</p></div>';
    return;
  }

  var list = allRestaurants.filter(function (r) {
    if (state.filter !== 'All') {
      if ((r.category || 'Other') !== state.filter) return false;
    }
    if (state.search) {
      var q = state.search.toLowerCase();
      var nm = (r.name || '').toLowerCase();
      var ct = (r.category || '').toLowerCase();
      if (nm.indexOf(q) === -1 && ct.indexOf(q) === -1) return false;
    }
    return true;
  });

  renderFilterChips(allRestaurants);

  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><div class="big">🔍</div><p>No restaurants match your search.</p><p class="mt8" style="font-size:.82rem;">Try a different category or clear the search.</p></div>';
    return;
  }

  el.innerHTML = list.map(function (r) {
    var open = isRestaurantOpen(r);
    return '<article class="rest-card' + (open ? '' : ' closed') + '">' +
      '<div class="rest-card-top">' + imageHTML(r.image, 'rest-thumb') +
        '<div class="rest-info"><h3>' + esc(r.name) + '</h3>' +
          '<p class="muted"><span class="star">★</span> ' + toNum(r.rating).toFixed(1) + ' · ' + esc(r.category) + '</p>' +
          '<p class="muted">🕒 ' + esc(r.deliveryTime || '30–45 min') + ' · Delivery ' + money(r.deliveryFee) + '</p>' +
          statusPill(open) +
        '</div>' +
      '</div>' +
      (open
        ? '<button class="btn btn-orange btn-block" onclick="openRestaurantPage(\'' + esc(r.id) + '\')">View Menu</button>'
        : '<button class="btn btn-disabled btn-block" disabled>Closed — unavailable</button>') +
    '</article>';
  }).join('');
}

function renderFilterChips(allRestaurants) {
  var wrap = document.getElementById('filter-chips');
  if (!wrap) return;
  var seen = { 'All': true };
  allRestaurants.forEach(function (r) { seen[r.category || 'Other'] = true; });
  var cats = Object.keys(seen);
  if (cats.indexOf(state.filter) === -1) state.filter = 'All';
  wrap.innerHTML = cats.map(function (c) {
    var active = state.filter === c ? ' active' : '';
    return '<button class="chip' + active + '" data-cat="' + esc(c) + '" onclick="setFilter(this.dataset.cat)">' + esc(c) + '</button>';
  }).join('');
}

function setFilter(cat) {
  state.filter = cat;
  renderRestaurantList();
}

function handleSearchInput(val) {
  state.search = String(val || '').trim();
  renderRestaurantList();
}

function openRestaurantPage(id) {
  var r = getRestaurant(id);
  if (!r) { toast('Restaurant not found.'); return; }
  if (!isRestaurantOpen(r)) { toast(r.name + ' is currently closed.'); return; }
  state.currentRestaurantId = id;
  renderRestaurantPage();
  showScreen('restaurant-page');
  try {
    var url = new URL(window.location.href);
    url.searchParams.set('r', r.slug || id);
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}
}

function renderRestaurantPage() {
  var el = document.getElementById('screen-restaurant-page');
  if (!el) return;
  var r = getRestaurant(state.currentRestaurantId);
  if (!r) { showScreen('customer-app'); return; }
  var open = isRestaurantOpen(r);
  var prods = getProductsFor(r.id);

  var groups = [], map = {};
  prods.forEach(function (p) {
    var cat = p.category || 'Menu';
    if (!map[cat]) { map[cat] = []; groups.push(cat); }
    map[cat].push(p);
  });

  var menuHTML = groups.length ? groups.map(function (cat) {
    return '<div class="menu-group"><h3>' + esc(cat) + '</h3>' + map[cat].map(function (p) {
      var canOrder = open && p.available !== false;
      var qty = cartQty(p.id);
      var control;
      if (!canOrder) {
        control = '<span class="unavail-tag">Unavailable</span>';
      } else if (qty > 0) {
        control = '<div class="stepper"><button onclick="changeQty(\'' + esc(p.id) + '\',-1)">−</button><span class="qty">' + qty + '</span><button onclick="addToCart(\'' + esc(p.id) + '\')">+</button></div>';
      } else {
        control = '<button class="add-btn" onclick="addToCart(\'' + esc(p.id) + '\')">+</button>';
      }
      return '<div class="menu-item' + (p.available === false ? ' unavailable' : '') + '" data-product-id="' + esc(p.id) + '">' +
        imageHTML(p.image, 'rest-thumb') +
        '<div class="mi-info"><h4>' + esc(p.name) + '</h4>' +
          (p.description ? '<p class="desc">' + esc(p.description) + '</p>' : '') +
          '<p class="price">' + money(p.price) + '</p></div>' +
        '<div class="mi-right">' + control + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }).join('') : '<div class="empty-state"><div class="big">🍽️</div><p>Menu coming soon.</p></div right>';

  el.innerHTML =
    '<div class="rest now-hero">' +
      '<button.</ class="back-btn" onclick="openHome()">← Restaurants</button>' +
      '<div class="rest-herodiv>-main">' +') imageHTML(r.image, 'rest-thumb') +
        '<div><h2>' + esc(r.name) + '</h2>' +
          '<p class="muted"><span class="star">★</span> ' + toNum(r.rating).toFixed(1) + ' · ' + esc(r.category) + '</p>' +
          '<p class="muted">🕒 ' + esc(r.deliveryTime || '30–45 min') + ' · Delivery ' + money(r.deliveryFee) + '</p>' +
          statusPill(open) +
        '</div>' +
      '</div>' +
      (r.description ? '<p class="desc">"' + esc(r.description) + '"</p>' : '') +
      (open ? '' : '<div class="closed-banner">This restaurant is closed and cannot take orders +
    '</div>' +
    menuHTML +
    '<div style="padding:10px 16px"><button class="btn btn-teal btn-block" onclick="openCart()">View Cart 🛒</button></div>';
}

function openCart() {
  renderCart();
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderCart() {
  var el = document.getElementById('cart-body');
  if (!el) return;
  var data = cartLines();
  if (!data.cart || !data.lines.length) {
    el.innerHTML = '<div class="empty-state"><div class="big">🛒</div><p>Your cart is empty.</p><p class="mt8"><button class="btn btn-orange" onclick="closeCart();openRestaurantList()">Browse Restaurants</button></p></div>';
    return;
  }
  var r = data.restaurant;
  var linesHTML = data.lines.map(function (l) {
    return '<div class="cart-line">' +
      '<div class="cl-info"><h4>' + esc(l.product.name) + '</h4><p class="unit">' + money(l.price) + ' each</p></div>' +
      '<div class="stepper"><button onclick="changeQty(\'' + esc(l.product.id) + '\',-1)">−</button><span class="qty">' + l.qty + '</span><button onclick="changeQty(\'' + esc(l.product.id) + '\',1)">+</button></div>' +
      '<div class="cl-side"><span class="lt">' + money(l.line) + '</span><button class="remove-btn" onclick="removeFromCart(\'' + esc(l.product.id) + '\')">Remove</button></div>' +
    '</div>';
  }).join('');
  var grand = data.foodTotal + data.deliveryFee + data.disposableFee;
  el.innerHTML =
    '<p class="cart-rest">Ordering from <strong>' + esc(r ? r.name : 'Restaurant') + '</strong></p>' +
    linesHTML +
    '<div class="totals">' +
      '<div class="row"><span>Food Total</span><span>' + money(data.foodTotal) + '</span></div>' +
      '<div class="row"><span>Delivery Fee</span><span>' + money(data.deliveryFee) + '</span></div>' +
      (data.disposableFee > 0 ? '<div class="row"><span>Disposable Pack</span><span>' + money(data.disposableFee) + '</span></div>' : '') +
      '<div class="row grand"><span>Grand Total</span><span>' + money(grand) + '</span></div>' +
    '</div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-outline" onclick="clearCartWithConfirm()">Clear</button>' +
      '<button class="btn btn-orange" onclick="openCheckout()">Checkout →</button>' +
    '</div>' +
    '<p class="mt14" style="text-align:center"><button class="btn-ghost" onclick="closeCart()">Continue shopping</button></p>';
}

function showModal(opts) {
  var mb = document.getElementById('modal');
  if (!mb) return;
  mb.innerHTML = '<div class="modal-card"><h3>' + esc(opts.title || '') + '</h3>' +
    (opts.body ? '<div class="modal-body">' + opts.body + '</div>' : '') +
    '<div class="modal-actions"></div></div>';
  var acts = mb.querySelector('.modal-actions');
  (opts.actions || []).forEach(function (a) {
    var b = document.createElement('button');
    b.className = 'btn ' + (a.className || 'btn-outline');
    b.textContent = a.label;
    b.onclick = function () {
      if (a.onClick) a.onClick();
      if (a.keepOpen !== true) closeModal();
    };
    acts.appendChild(b);
  });
  mb.classList.add('open');
}

function closeModal() {
  var mb = document.getElementById('modal');
  if (mb) mb.classList.remove('open');
}

function overlayBackdropClick(e, overlayId) {
  if (e.target === document.getElementById(overlayId)) {
    if (overlayId === 'cart-overlay') closeCart();
    else if (overlayId === 'checkout-overlay') closeCheckout();
  }
}

function updateProductControl(productId) {
  var itemEl = document.querySelector('[data-product-id="' + productId + '"]');
  if (!itemEl) return;
  var p = getProduct(productId);
  if (!p) return;
  var r = getRestaurant(p.restaurantId);
  if (!r) return;
  var open = isRestaurantOpen(r);
  var canOrder = open && p.available !== false;
  var qty = cartQty(productId);
  var control;
  if (!canOrder) {
    control = '<span class="unavail-tag">Unavailable</span>';
  } else if (qty > 0) {
    control = '<div class="stepper"><button onclick="changeQty(\'' + esc(p.id) + '\',-1)">−</button><span class="qty">' + qty + '</span><button onclick="addToCart(\'' + esc(p.id) + '\')">+</button></div>';
  } else {
    control = '<button class="add-btn" onclick="addToCart(\'' + esc(p.id) + '\')">+</button>';
  }
  var rightEl = itemEl.querySelector('.mi-right');
  if (rightEl) rightEl.innerHTML = control;
}