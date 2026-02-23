const API_BASE = '/api';

// DOM Elements
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');
const servicesGrid = document.getElementById('services-grid');
const slotsGrid = document.getElementById('slots-grid');
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const btnBackServices = document.getElementById('btn-back-services');
const bookingCtaContainer = document.getElementById('booking-cta-container');
const btnSubmitBooking = document.getElementById('btn-submit-booking');
const btnLoginToBook = document.getElementById('btn-login-to-book');
const bookingMsg = document.getElementById('booking-msg');

const authControls = document.getElementById('auth-controls');
const navMyBookings = document.getElementById('nav-my-bookings');
const navAdmin = document.getElementById('nav-admin');

// Auth DOM
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const registerAdminForm = document.getElementById('register-admin-form'); // Added
const linkRegister = document.getElementById('link-register');
const linkLogin = document.getElementById('link-login');
const linkRegisterAdmin = document.getElementById('link-register-admin'); // Added
const linkBackRegister = document.getElementById('link-back-register'); // Added

// Admin DOM
const adminServiceForm = document.getElementById('admin-service-form');
const adminSlotForm = document.getElementById('admin-slot-form');
const adminBookingsList = document.getElementById('admin-bookings-list');

// Toast
const toastContainer = document.getElementById('toast-container');

// State
let currentUser = null;
let selectedServiceId = null;
let selectedSlotId = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  await fetchCurrentUser();
  fetchServices();
});

// Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Global Fetch Wrapper to include cookies
async function apiFetch(endpoint, options = {}) {
  options.credentials = 'include';
  options.headers = options.headers || {};
  if (!options.headers['Content-Type'] && options.method && options.method !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API_BASE}${endpoint}`, options);
}

// Navigation Logic
function setupNavigation() {
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.getAttribute('data-target'));
    });
  });
}

function navigate(targetId) {
  navBtns.forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('data-target') === targetId) b.classList.add('active');
  });

  views.forEach(v => {
    v.classList.remove('active');
    if (v.id === targetId) v.classList.add('active');
  });

  if (targetId === 'dashboard-view') fetchMyBookings();
  if (targetId === 'admin-view') fetchAdminBookings();
}

function updateAuthUI() {
  if (currentUser) {
    authControls.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem;">
        <span style="color:var(--text-muted); font-size:0.9rem;">Hello, ${currentUser.full_name}</span>
        <button class="btn btn-danger" style="padding:0.4rem 1rem;" onclick="logout()">Logout</button>
      </div>`;
    navMyBookings.style.display = 'inline-block';

    if (currentUser.role === 'admin') {
      navAdmin.style.display = 'inline-block';
    } else {
      navAdmin.style.display = 'none';
      if (document.getElementById('admin-view').classList.contains('active')) navigate('book-view');
    }
  } else {
    authControls.innerHTML = `
      <div style="display:flex; gap:0.5rem;">
        <button class="nav-btn" onclick="navigate('login-view')">Log In</button>
        <button class="btn btn-primary" style="padding:0.4rem 1rem;" onclick="navigate('register-view')">Sign Up</button>
      </div>`;
    navMyBookings.style.display = 'none';
    navAdmin.style.display = 'none';
    if (['dashboard-view', 'admin-view'].includes(document.querySelector('.view-section.active').id)) {
      navigate('book-view');
    }
  }
}

// Auth API Calls
async function fetchCurrentUser() {
  try {
    const res = await apiFetch('/auth/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
    } else {
      currentUser = null;
    }
  } catch (e) { currentUser = null; }
  updateAuthUI();
}

async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
    currentUser = null;
    updateAuthUI();
    showToast('Logged out');
  } catch (e) { }
}

// Event Listeners
function setupEventListeners() {
  // Booking flows
  btnBackServices.addEventListener('click', () => {
    step2.style.display = 'none';
    step1.style.display = 'block';
    selectedServiceId = null;
    selectedSlotId = null;
    bookingCtaContainer.style.display = 'none';
  });

  btnSubmitBooking.addEventListener('click', handleBookingSubmit);
  btnLoginToBook.addEventListener('click', () => navigate('login-view'));

  // Auth Forms
  linkRegister.addEventListener('click', (e) => { e.preventDefault(); navigate('register-view'); });
  linkLogin.addEventListener('click', (e) => { e.preventDefault(); navigate('login-view'); });
  linkRegisterAdmin.addEventListener('click', (e) => { e.preventDefault(); navigate('register-admin-view'); }); // Added
  linkBackRegister.addEventListener('click', (e) => { e.preventDefault(); navigate('register-view'); }); // Added

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      currentUser = data.user;
      updateAuthUI();
      navigate('book-view');
      loginForm.reset();
      showToast(data.message);
    } catch (err) { showToast(err.message, 'error'); }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      currentUser = data.user;
      updateAuthUI();
      navigate('book-view');
      registerForm.reset();
      showToast(data.message);
    } catch (err) { showToast(err.message, 'error'); }
  });

  registerAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('admin-reg-name').value;
    const email = document.getElementById('admin-reg-email').value;
    const password = document.getElementById('admin-reg-password').value;
    const admin_code = document.getElementById('admin-reg-code').value;
    try {
      const res = await apiFetch('/auth/register-admin', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password, admin_code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      currentUser = data.user;
      updateAuthUI();
      navigate('book-view');
      registerAdminForm.reset();
      showToast(data.message);
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Admin Forms
  adminServiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin') return;
    const name = document.getElementById('admin-srv-name').value;
    const desc = document.getElementById('admin-srv-desc').value;

    try {
      const res = await apiFetch('/services/admin', { method: 'POST', body: JSON.stringify({ name, description: desc }) });
      if (!res.ok) throw new Error('Failed to create service');
      showToast('Service created', 'success');
      adminServiceForm.reset();
      fetchServices();
    } catch (err) { showToast(err.message, 'error'); }
  });

  adminSlotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin') return;
    const service_id = parseInt(document.getElementById('admin-slot-srv').value);
    const start_datetime = document.getElementById('admin-slot-time').value;
    const capacity = parseInt(document.getElementById('admin-slot-cap').value);

    try {
      const res = await apiFetch('/slots/admin', { method: 'POST', body: JSON.stringify({ service_id, start_datetime, capacity }) });
      if (!res.ok) throw new Error('Failed to create slot');
      showToast('Slot created', 'success');
      adminSlotForm.reset();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// Fetch Services
async function fetchServices() {
  try {
    const res = await apiFetch('/services');
    const services = await res.json();
    renderServices(services);
  } catch (err) {
    servicesGrid.innerHTML = `<div class="empty-state">Failed to load services.</div>`;
  }
}

function renderServices(services) {
  servicesGrid.innerHTML = '';
  if (services.length === 0) {
    servicesGrid.innerHTML = '<p class="text-muted">No services available right now.</p>';
    return;
  }

  services.forEach(service => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-icon">✦</div>
      <div style="color:var(--text-muted); font-size:0.8rem; margin-bottom:0.2rem;">ID: ${service.id}</div>
      <h3 class="service-title">${service.name}</h3>
      <p class="service-desc">${service.description}</p>
      <div style="font-size:0.9rem; margin-bottom: 1rem; color:var(--text-muted);">⏱ ${service.duration_minutes} mins</div>
      <button class="btn btn-primary" style="width: 100%;">Select Service</button>
    `;
    card.addEventListener('click', () => {
      selectedServiceId = service.id;
      step1.style.display = 'none';
      step2.style.display = 'block';
      fetchSlots(service.id);
    });
    servicesGrid.appendChild(card);
  });
}

// Fetch Slots
async function fetchSlots(serviceId) {
  slotsGrid.innerHTML = '<div class="loading-spinner"></div>';
  bookingCtaContainer.style.display = 'none';
  selectedSlotId = null;

  try {
    const res = await apiFetch(`/slots?service_id=${serviceId}`);
    const slots = await res.json();
    renderSlots(slots);
  } catch (err) {
    showToast('Failed to load slots', 'error');
    slotsGrid.innerHTML = '<p>Error loading available times.</p>';
  }
}

function renderSlots(slots) {
  slotsGrid.innerHTML = '';
  if (slots.length === 0) {
    slotsGrid.innerHTML = '<p class="empty-state" style="grid-column: 1/-1;">No available slots for this service.</p>';
    return;
  }

  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.className = 'slot-btn';

    const date = new Date(slot.start_datetime);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    btn.innerHTML = `<div>${timeString}</div><div style="font-size: 0.8em; opacity: 0.7; margin-top:2px;">${dateString}</div>
                     <div style="font-size:0.7em; color:var(--secondary); margin-top:4px;">${slot.available_count} left</div>`;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      selectedSlotId = slot.id;
      bookingCtaContainer.style.display = 'block';

      if (currentUser) {
        btnSubmitBooking.style.display = 'inline-block';
        btnLoginToBook.style.display = 'none';
        bookingMsg.innerText = `Booking for ${currentUser.full_name}`;
      } else {
        btnSubmitBooking.style.display = 'none';
        btnLoginToBook.style.display = 'inline-block';
        bookingMsg.innerText = `You must be logged in to reserve this slot.`;
      }
      bookingCtaContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    slotsGrid.appendChild(btn);
  });
}

// Handle Booking
async function handleBookingSubmit(e) {
  e.preventDefault();
  if (!selectedSlotId || !currentUser) return;

  const originalText = btnSubmitBooking.innerText;
  btnSubmitBooking.innerText = 'Processing...';
  btnSubmitBooking.disabled = true;

  try {
    const res = await apiFetch('/bookings', { method: 'POST', body: JSON.stringify({ slot_id: selectedSlotId }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');

    setTimeout(() => {
      btnBackServices.click();
      navigate('dashboard-view');
    }, 1500);

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmitBooking.innerText = originalText;
    btnSubmitBooking.disabled = false;
  }
}

// Fetch My Bookings
async function fetchMyBookings() {
  const list = document.getElementById('bookings-list');
  list.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const res = await apiFetch('/bookings');
    if (!res.ok) throw new Error('Unauthorized');
    const bookings = await res.json();
    renderBookings(bookings, list);
  } catch (e) { list.innerHTML = `<div class="empty-state">Unable to load. Please log in.</div>`; }
}

// Fetch Admin Bookings
async function fetchAdminBookings() {
  adminBookingsList.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const res = await apiFetch('/bookings/admin');
    if (!res.ok) throw new Error('Forbidden');
    const bookings = await res.json();
    renderBookings(bookings, adminBookingsList, true);
  } catch (e) { adminBookingsList.innerHTML = `<div class="empty-state">Unable to load. Must be admin.</div>`; }
}

function renderBookings(bookings, container, isAdmin = false) {
  container.innerHTML = '';
  if (bookings.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌵</div><p>No bookings found.</p></div>`;
    return;
  }

  bookings.forEach(booking => {
    const item = document.createElement('div');
    item.className = 'booking-item';

    const startDate = new Date(booking.start_datetime);
    const timeFormatted = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = startDate.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' });

    let adminInfo = '';
    if (isAdmin) {
      adminInfo = `<div style="margin-bottom:0.5rem; font-size:0.85rem; color:var(--secondary);">User: ${booking.full_name} (${booking.email}) | ID: ${booking.id}</div>`;
    }

    item.innerHTML = `
      <div class="booking-info" style="flex:1;">
        ${adminInfo}
        <h3 style="margin-bottom:0.25rem; font-size:1.1rem;">${booking.service_name}</h3>
        <div class="booking-meta" style="display:flex; gap:1.5rem; font-size:0.9rem; color:var(--text-muted);">
          <span>🕒 ${timeFormatted}</span>
          <span>📅 ${dateFormatted}</span>
          <span style="color:var(--success);">Status: ${booking.status}</span>
        </div>
      </div>
      <button class="btn btn-danger" onclick="cancelBooking(${booking.id}, this)">Cancel Appointment</button>
    `;
    container.appendChild(item);
  });
}

// Cancel Booking
window.cancelBooking = async function (id, btnElement) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  btnElement.innerText = 'Canceling...';
  btnElement.disabled = true;

  try {
    const res = await apiFetch(`/bookings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to cancel');

    showToast('Appointment cancelled successfully', 'success');

    const item = btnElement.closest('.booking-item');
    item.style.opacity = '0';
    item.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      const container = item.parentElement;
      item.remove();
      if (container.children.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌵</div><p>No active bookings found.</p></div>`;
      }
    }, 300);

  } catch (err) {
    showToast(err.message, 'error');
    btnElement.innerText = 'Cancel Appointment';
    btnElement.disabled = false;
  }
}
