'use strict';
/* =====================================================================
   Jaye's Food Express — vendor authentication via Supabase Auth.
===================================================================== */

function vendorRestaurant() { return currentVendorRestaurant; }
function currentVendor()    { return currentVendorUser; }

function refreshVendorContext() {
  return SupaAuth.getUser().then(function (user) {
    currentVendorUser = user;
    if (!user) { currentVendorRestaurant = null; return null; }
    return sb.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        currentVendorRestaurant = res.data ? rFromDB(res.data) : null;
        if (currentVendorRestaurant) {
          var list = getRestaurants();
          var found = false;
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === currentVendorRestaurant.id) {
              SupaCache.restaurants[i] = currentVendorRestaurant;
              found = true;
              break;
            }
          }
          if (!found) SupaCache.restaurants.push(currentVendorRestaurant);
        }
        return currentVendorRestaurant;
      });
  });
}

function requireVendorScreen() {
  if (!currentVendorUser || !currentVendorRestaurant) {
    openVendorLogin();
    return null;
  }
  return { user: currentVendorUser, restaurant: currentVendorRestaurant };
}

function openVendorAccess() {
  refreshVendorContext().then(function (restaurant) {
    if (restaurant) showVendorDashboard();
    else openVendorLogin();
  }).catch(function (err) {
    console.warn('[Jaye] vendor context failed:', err);
    openVendorLogin();
  });
}
function openVendorLogin()    { showScreen('vendor-login'); }
function openVendorRegister() { showScreen('vendor-register'); }

function handleVendorRegister(e) {
  if (e && e.preventDefault) e.preventDefault();
  var rname = fieldVal('vr-rname'), oname = fieldVal('vr-oname'),
      email = fieldVal('vr-email').toLowerCase(),
      phone = fieldVal('vr-phone'),
      passEl = document.getElementById('vr-pass'),
      pass = passEl ? passEl.value : '';
  var ok = true;
  ok = markInvalid('vr-rname', !rname) && ok;
  ok = markInvalid('vr-oname', !oname) && ok;
  ok = markInvalid('vr-email', !/^\S+@\S+\.\S+$/.test(email)) && ok;
  ok = markInvalid('vr-phone', phone.replace(/\D/g, '').length < 7) && ok;
  ok = markInvalid('vr-pass', pass.length < 6) && ok;
  if (!ok) { toast('Please complete all fields correctly.'); return false; }

  var btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  SupaAuth.signUp(email, pass, {
    owner_name: oname,
    restaurant_name: rname,
    phone: phone
  })
    .then(function (data) {
      if (!data.session) {
        /* Email confirmation is ON. The restaurant is created automatically
           by a database trigger when the account is confirmed. */
        toast('Almost there! Check your inbox for the confirmation link, then log in.');
        setTimeout(function () { openVendorLogin(); }, 2400);
        return null;
      }
      return refreshVendorContext().then(function () {
        toast('Welcome, ' + oname + '!');
        showVendorDashboard();
      });
    })
    .catch(function (err) {
      console.error('[Munch] Signup failed:', err);
      var msg = err.message || 'Could not create account.';
      if (/email not confirmed/i.test(msg)) {
        msg = 'Please confirm your email first — check your inbox.';
      } else if (/user already registered/i.test(msg)) {
        msg = 'An account with this email already exists. Try logging in.';
      }
      toast(msg);
    })
    .then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    });

  return false;
}

function handleVendorLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  var email = fieldVal('vl-email').toLowerCase();
  var passEl = document.getElementById('vl-pass');
  var pass = passEl ? passEl.value : '';
  if (!email || !pass) { toast('Please enter email and password.'); return false; }

  var btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  SupaAuth.signIn(email, pass)
    .then(function () { return refreshVendorContext(); })
    .then(function (restaurant) {
      if (!restaurant) {
        toast('Signed in, but no restaurant is linked to this account.');
        openVendorLogin();
        return;
      }
      toast('Welcome back!');
      showVendorDashboard();
    })
 .catch(function (err) {
      console.error('[Munch] Login failed:', err);
      var msg = err.message || 'Invalid email or password.';
      if (/email not confirmed/i.test(msg)) {
        msg = 'Please confirm your email first — check your inbox.';
      } else if (/invalid login credentials/i.test(msg)) {
        msg = 'Incorrect email or password.';
      }
      toast(msg);
    })
    .then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
    });

  return false;
}

function logoutVendor() {
  SupaAuth.signOut().then(function () {
    currentVendorUser = null;
    currentVendorRestaurant = null;
    toast('Logged out.');
    openVendorLogin();
  });
}


/* ============ Resend confirmation email ============ */
function openResendConfirm() {
  showModal({
    title: 'Resend confirmation email',
    body:
      '<div class="field"><label for="resend-email">Email address</label>' +
        '<input id="resend-email" type="email" placeholder="you@example.com">' +
      '</div>' +
      '<p style="font-size:.8rem;color:var(--muted);margin:0;">' +
        'We’ll send a fresh confirmation link to this address.' +
      '</p>',
    actions: [
      { label: 'Cancel', className: 'btn-outline' },
      { label: 'Send Link', className: 'btn-orange', keepOpen: true, onClick: function () {
          var email = fieldVal('resend-email');
          if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            toast('Please enter a valid email address.');
            return;
          }
          sb.auth.resend({ type: 'signup', email: email })
            .then(function (res) {
              if (res.error) throw res.error;
              closeModal();
              toast('Confirmation email sent — check your inbox.');
            })
            .catch(function (err) {
              console.warn('[Munch] Resend failed:', err);
              toast(err.message || 'Could not resend.');
            });
        } }
    ]
  });
}
