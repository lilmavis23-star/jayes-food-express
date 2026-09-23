'use strict';
/* =====================================================================
   Jaye's Food Express — footer info, realtime hooks, and bootstrap.
   Loaded LAST.
===================================================================== */

/* ============ Footer info ============ */
function showInfo(topic) {
  var content = {
    'Privacy': '<p>Jaye’s Food Express stores cart data locally on your device. Vendor and menu data is securely stored with Supabase.</p><p>When you place an order, your name, phone and delivery details are sent directly to the restaurant you chose via WhatsApp.</p>',
    'Terms': '<p>Jaye’s Food Express connects customers with local restaurants. Prices, availability and delivery fees are set by each restaurant.</p><p>Orders are confirmed directly with the restaurant on WhatsApp. This frontend prototype does not process payments.</p>',
    'About': '<p>Jaye’s Food Express is a multi-restaurant food ordering platform built for local communities. Browse restaurants, build your cart and send your order straight to the restaurant on WhatsApp — fast, simple, no middleman.</p>',
    'Founder': '<p>Jaye’s Food Express was founded with one simple idea: good food, delivered, without the hassle.</p><p>Built with ❤️ for local restaurants and the people who love their food.</p>'
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
  try {
    await SupaData.loadAll();
  } catch (err) {
    console.error('[Jaye] Initial load failed:', err);
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
