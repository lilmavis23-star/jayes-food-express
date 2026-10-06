'use strict';
/* =====================================================================
   Jaye's Food Express — footer info, realtime hooks, and bootstrap.
   Loaded LAST.
===================================================================== */

/* ============ Footer info ============ */
function showInfo(topic) {
  var content = {
    'Privacy': '<p><strong>Last updated: October 2026</strong></p>' +
      '<p>Munch Express connects customers with local restaurants. This policy explains what information we collect, how we use it, and who can see it.</p>' +
      '<p><strong>What we collect from customers</strong></p>' +
      '<p>When you place an order, we collect your name, phone number, delivery location, order option (delivery or pickup), any instructions you add, and the payment receipt image you upload. We do not require you to create an account, so we do not collect your email or a password.</p>' +
      '<p><strong>What we collect from restaurants</strong></p>' +
      '<p>When a restaurant registers, we collect the owner\'s name, email address, password, phone number, business address, bank account details, and information about the menu items they list.</p>' +
      '<p><strong>Where your information is stored</strong></p>' +
      '<p>All order and account information is stored in our secure database. Uploaded images (payment receipts and dish photos) are stored in our file storage. Your shopping cart is stored only on your own device and is never uploaded to us until you place an order.</p>' +
      '<p><strong>Who can see your information</strong></p>' +
      '<p>Your order details and payment receipt are visible only to the restaurant you ordered from. No other restaurant, and no other customer, can see your information. You can look up your own order status at any time using your order code and phone number.</p>' +
      '<p><strong>What we do not do</strong></p>' +
      '<p>We do not sell your information. We do not share it with advertisers. We do not track you across other websites. We do not use third-party analytics that profile you.</p>' +
      '<p><strong>Your rights</strong></p>' +
      '<p>You can ask us to delete your information at any time by contacting the restaurant you ordered from, or by reaching us at the contact details on our website. Restaurant owners can also request deletion of their account and all associated data.</p>' +
      '<p><strong>Changes to this policy</strong></p>' +
      '<p>If we update this policy, the new version will be posted here with a new date.</p>',

    'Terms': '<p><strong>Last updated: October 2026</strong></p>' +
      '<p>Welcome to Munch Express. By using this platform, you agree to these terms.</p>' +
      '<p><strong>What we are</strong></p>' +
      '<p>Munch Express is a platform that connects customers with local restaurants. We provide the software that lets restaurants publish a menu and receive orders. We are not a restaurant, we are not a payment processor, and we are not a delivery company.</p>' +
      '<p><strong>Payments</strong></p>' +
      '<p>When you place an order, you pay the restaurant directly by bank transfer to the account they have listed. Munch Express does not handle your money. Any issue with a payment must be resolved with the restaurant.</p>' +
      '<p><strong>Delivery and pickup</strong></p>' +
      '<p>Delivery is arranged by the restaurant. Delivery times, fees, and riders are the restaurant\'s responsibility. Munch Express does not deliver food.</p>' +
      '<p><strong>Your responsibilities as a customer</strong></p>' +
      '<p>Provide accurate information when ordering, including your name, phone number, and delivery address. Upload a real payment receipt. Confirm your order status before contacting the restaurant. Do not abuse the platform or attempt to interfere with its operation.</p>' +
      '<p><strong>Restaurant responsibilities</strong></p>' +
      '<p>Restaurants must keep their menu, prices, opening hours, and bank details up to date. They must accept, prepare, and deliver orders in good faith. They must handle their own taxes and comply with any local business requirements.</p>' +
      '<p><strong>Disputes</strong></p>' +
      '<p>Disputes about food quality, delivery, or payment must be resolved directly between the customer and the restaurant. Munch Express is not a party to the transaction.</p>' +
      '<p><strong>Account suspension</strong></p>' +
      '<p>We may suspend any account that abuses the platform, uploads false information, or fails to honour orders.</p>' +
      '<p><strong>Changes to these terms</strong></p>' +
      '<p>If we update these terms, the new version will be posted here with a new date. Continued use of the platform means you accept the updated terms.</p>',

    'About': '<p>Munch Express is a food ordering platform built for local communities in Nigeria.</p>' +
      '<p><strong>Our mission</strong></p>' +
      '<p>Great local restaurants should have the same tools the big chains do. Our platform gives any restaurant — from a home kitchen to a busy eatery — a proper online menu, a way to receive orders, and a dashboard to manage them. No commission, no signup fee, no tech skills required.</p>' +
      '<p><strong>How it works</strong></p>' +
      '<p>Customers browse local restaurants, add items to cart, see the restaurant\'s bank details, pay by transfer, and upload a receipt. The restaurant sees the order on their dashboard, confirms payment, and updates the order as it moves from accepted to ready to delivered. The customer can track the status live using their order code.</p>' +
      '<p><strong>What makes us different</strong></p>' +
      '<p>We do not take a cut of any order. We do not hold your money. We do not route orders through a third-party chat app. Every order is between the customer and the restaurant, and we simply provide the tools to make that transaction easier.</p>' +
      '<p><strong>Where we are</strong></p>' +
      '<p>We are starting in Ijebu Ode and growing one restaurant at a time. If you run a restaurant here and want to be listed, get in touch.</p>',

    'Founder': '<p>I built Munch Express because I saw the same problem every day.</p>' +
      '<p>Local restaurants in my city take orders by phone, by WhatsApp, or by customers walking in. It works — but it is messy. Orders get lost. Menus change and nobody knows. Customers can\'t find you online. And the big delivery apps charge commissions that would eat a small restaurant alive.</p>' +
      '<p>So I built something different. A simple tool that gives any restaurant — from a home kitchen to a busy eatery — a proper online menu and order system, free, with no commission. Orders go straight to the restaurant. Payment goes straight to the restaurant. Delivery is arranged by the restaurant. I just built the software.</p>' +
      '<p>It started in my bedroom, on my phone, at 1am. It is still early. There are bugs. There are things I haven\'t thought of yet. If you run a restaurant and want to try it, please reach out — I will set it up with you personally. If you order and something goes wrong, tell me and I will fix it.</p>' +
      '<p>Thank you for being part of this.</p>' +
      '<p>\u2014 Olamiji Oluwatosin Adebajo, Founder of Munch Express</p>'
  }[topic] || '<p>Coming soon.</p>';
  showModal({
    title: topic,
    body: '<div class="info-body">' + content + '</div>',
    actions: [{ label: 'Close', className: 'btn-teal' }]
  });
}
/* ============ Realtime-driven re-render ============ */
var renderDebounce = null;

function scheduleRender() {
  if (renderDebounce) clearTimeout(renderDebounce);
  renderDebounce = setTimeout(function () {
    updateCartBadge();
    renderRestaurantList();
    if (state.currentRestaurantId) {
      var page = document.getElementById('screen-restaurant-page');
      if (page && page.classList.contains('active')) renderRestaurantPage();
    }
    if (currentVendorRestaurant && currentScreenIsDashboard()) {
      showVendorDashboard();
    }
  }, 200);
}

function currentScreenIsDashboard() {
  var el = document.getElementById('screen-vendor-dashboard');
  return el && el.classList.contains('active');
}

/* ============ Init ============ */
async function init() {
  /* Paint skeletons immediately so the page doesn't look empty */
  updateCartBadge();
  renderRestaurantList();
  showScreen('customer-app');

  try {
    await SupaData.loadAll();
    state.dataLoaded = true;
  } catch (err) {
    console.error('[Munch] Initial load failed:', err);
    state.dataLoadFailed = true;
    toast('Could not load data. Check your connection.');
  }

  try {
    await refreshVendorContext();
  } catch (err) {
    console.warn('[Jaye] Session restore failed:', err);
  }

updateCartBadge();
  renderRestaurantList();
  showScreen('customer-app');

  /* Deep-link: URL like ?r=RESTAURANT_ID opens that restaurant's menu */
try {
    var params = new URLSearchParams(window.location.search);
    var deepLink = params.get('r');
    if (deepLink) {
      /* First try as UUID (backwards compatibility) */
      var match = getRestaurant(deepLink);
      if (match) {
        openRestaurantPage(match.id);
      } else {
        /* Not a UUID in cache — try as slug via Supabase */
        SupaData.getRestaurantBySlug(deepLink).then(function (r) {
          if (r) openRestaurantPage(r.id);
        }).catch(function () {});
      }
    }
  } catch (e) {
    console.warn('[Munch] Deep link failed:', e);
  }

  SupaRealtime.start(function () {
    scheduleRender();
  });

  SupaAuth.onAuthChange(function (event) {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      refreshVendorContext().then(function () {
        if (currentScreenIsDashboard()) showVendorDashboard();
      });
    }
    if (event === 'SIGNED_OUT') {
      currentVendorUser = null;
      currentVendorRestaurant = null;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
