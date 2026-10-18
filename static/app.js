/**
 * Saigon Street Food Map - Client Application
 * Interactive discovery for street food vendors in Districts 1, 3, and 10 of HCMC.
 */

// Global State
const state = {
  vendors: [],
  filteredVendors: [],
  currentDistrict: "Tất cả",
  currentCategory: "Tất cả",
  isOpenNowOnly: false,
  searchQuery: "",
  sortMode: "default",
  selectedVendorId: null,
  userLocation: null, // { lat, lng }
  isAdmin: false,
  isPickingLocation: false,
  map: null,
  markersLayer: null,
  userMarker: null,
  tempPickMarker: null
};

// District color mapping
const DISTRICT_COLORS = {
  "Quận 1": "#e8590c",
  "Quận 3": "#1971c2",
  "Quận 10": "#0ca678",
  "default": "#d9480f"
};

// Category Icon Mapping
const CATEGORY_ICONS = {
  "Bánh mì": "🥖",
  "Hủ tiếu / Bún": "🍜",
  "Cơm / Bột chiên": "🍳",
  "Chè / Tráng miệng": "🥣",
  "Bánh tráng / Ăn vặt": "🌯",
  "Khác": "🍢"
};

// Saigon center coordinates
const SAIGON_CENTER = [10.7745, 106.6850];
const DEFAULT_ZOOM = 14;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initEventListeners();
  loadVendors();
  checkCachedAdmin();
});

// ================= MAP INITIALIZATION =================
function initMap() {
  state.map = L.map("map", {
    zoomControl: true
  }).setView(SAIGON_CENTER, DEFAULT_ZOOM);

  // OpenStreetMap Tile Layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(state.map);

  state.markersLayer = L.layerGroup().addTo(state.map);

  // Map Click Handler for Admin Coordinate Picker
  state.map.on("click", (e) => {
    if (state.isPickingLocation) {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);

      document.getElementById("admin-lat").value = lat;
      document.getElementById("admin-lng").value = lng;

      // Update or create temp pick marker
      if (state.tempPickMarker) {
        state.map.removeLayer(state.tempPickMarker);
      }
      state.tempPickMarker = L.marker([lat, lng], {
        icon: createCustomIcon("📍", "#fa5252")
      }).addTo(state.map);

      // Exit picking mode & show admin modal again
      endLocationPicking();
      document.getElementById("admin-modal").style.display = "flex";
      showToast(`Đã chọn tọa độ: ${lat}, ${lng}`);
    }
  });

  // Try auto-detecting user location gently
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        updateUserLocationMarker();
      },
      (err) => {
        console.log("Geolocation prompt skipped or denied:", err.message);
      },
      { timeout: 8000 }
    );
  }
}

// Custom Leaflet DivIcon for pins
function createCustomIcon(iconChar, bgColor) {
  return L.divIcon({
    className: "custom-map-pin",
    html: `
      <div style="
        background-color: ${bgColor};
        width: 38px;
        height: 38px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 18px;
          line-height: 1;
        ">${iconChar}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -36]
  });
}

function updateUserLocationMarker() {
  if (!state.userLocation || !state.map) return;
  if (state.userMarker) {
    state.map.removeLayer(state.userMarker);
  }

  const userIcon = L.divIcon({
    className: "user-loc-pin",
    html: `
      <div style="
        background-color: #228be6;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 6px rgba(34, 139, 230, 0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  state.userMarker = L.marker([state.userLocation.lat, state.userLocation.lng], {
    icon: userIcon
  }).addTo(state.map).bindPopup("📍 <strong>Vị trí của bạn</strong>");
}

// Render map markers based on filteredVendors
function renderMarkers() {
  if (!state.markersLayer) return;
  state.markersLayer.clearLayers();

  const bounds = [];

  state.filteredVendors.forEach((vendor) => {
    const lat = vendor.latitude;
    const lng = vendor.longitude;
    bounds.push([lat, lng]);

    const color = DISTRICT_COLORS[vendor.district] || DISTRICT_COLORS.default;
    const iconChar = CATEGORY_ICONS[vendor.category] || "🍲";
    const customIcon = createCustomIcon(iconChar, color);

    const marker = L.marker([lat, lng], { icon: customIcon });

    const openStatus = checkIsOpen(vendor);
    const statusHtml = openStatus.isOpen
      ? `<span style="color:#2b8a3e; font-weight:700;">🟢 Đang mở cửa</span>`
      : `<span style="color:#868e96; font-weight:600;">🔴 Đã đóng cửa</span>`;

    const popupHtml = `
      <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:210px; max-width:250px;">
        <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color:#212529;">${escapeHtml(vendor.name)}</h4>
        <div style="font-size:12px; margin-bottom:4px;">${statusHtml} &bull; <strong>${vendor.district}</strong></div>
        <p style="margin:0 0 6px 0; font-size:12px; color:#495057;">${escapeHtml(vendor.address)}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <span style="font-size:12px; font-weight:700; color:#d9480f;">${formatPrice(vendor.price_min)} - ${formatPrice(vendor.price_max)}</span>
          <button onclick="window.viewVendorDetail(${vendor.id})" style="
            background:#d9480f; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;
          ">Chi tiết</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);

    marker.on("click", () => {
      state.selectedVendorId = vendor.id;
      highlightCard(vendor.id);
    });

    state.markersLayer.addLayer(marker);
  });

  // Fit bounds if vendors are shown and not currently zooming manually
  if (bounds.length > 0 && bounds.length < 50) {
    state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }
}

// ================= DATA LOADING =================
async function loadVendors() {
  try {
    const res = await fetch("/api/vendors");
    const data = await res.json();
    if (data.success) {
      state.vendors = data.vendors;
      updateDistrictCounts();
      applyFilters();
    }
  } catch (err) {
    console.error("Failed to load vendors:", err);
    document.getElementById("vendor-grid").innerHTML = `
      <div class="empty-state">
        <p>⚠️ Không thể tải dữ liệu điểm bán hè phố. Vui lòng thử lại sau.</p>
      </div>
    `;
  }
}

function updateDistrictCounts() {
  const allCount = state.vendors.length;
  const q1Count = state.vendors.filter((v) => v.district === "Quận 1").length;
  const q3Count = state.vendors.filter((v) => v.district === "Quận 3").length;
  const q10Count = state.vendors.filter((v) => v.district === "Quận 10").length;

  document.getElementById("count-all").textContent = allCount;
  document.getElementById("count-q1").textContent = q1Count;
  document.getElementById("count-q3").textContent = q3Count;
  document.getElementById("count-q10").textContent = q10Count;
}

// ================= FILTER & SORT LOGIC =================
function applyFilters() {
  let list = [...state.vendors];

  // 1. District filter
  if (state.currentDistrict && state.currentDistrict !== "Tất cả") {
    list = list.filter((v) => v.district === state.currentDistrict);
  }

  // 2. Category filter
  if (state.currentCategory && state.currentCategory !== "Tất cả") {
    list = list.filter((v) => v.category === state.currentCategory);
  }

  // 3. Search query filter
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    list = list.filter((v) =>
      (v.name || "").toLowerCase().includes(q) ||
      (v.dishes || "").toLowerCase().includes(q) ||
      (v.address || "").toLowerCase().includes(q) ||
      (v.story || "").toLowerCase().includes(q)
    );
  }

  // 4. Open Now filter
  if (state.isOpenNowOnly) {
    list = list.filter((v) => checkIsOpen(v).isOpen);
  }

  // 5. Sorting
  if (state.sortMode === "rating") {
    list.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
  } else if (state.sortMode === "price-asc") {
    list.sort((a, b) => (a.price_min || 0) - (b.price_min || 0));
  } else if (state.sortMode === "price-desc") {
    list.sort((a, b) => (b.price_max || 0) - (a.price_max || 0));
  }

  state.filteredVendors = list;
  renderVendorGrid();
  renderMarkers();

  // Update results count header
  document.getElementById("results-count").textContent = `${list.length} quán`;
}

// Check if a vendor is open right now
function checkIsOpen(vendor) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  function parseMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(":");
    if (parts.length < 2) return null;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function inRange(openM, closeM) {
    if (openM === null || closeM === null) return false;
    if (openM <= closeM) {
      return currentMinutes >= openM && currentMinutes <= closeM;
    } else {
      // Overnight (e.g. 17:00 to 01:30)
      return currentMinutes >= openM || currentMinutes <= closeM;
    }
  }

  const o1 = parseMinutes(vendor.open_time);
  const c1 = parseMinutes(vendor.close_time);
  const o2 = parseMinutes(vendor.open_time_2);
  const c2 = parseMinutes(vendor.close_time_2);

  const isOpenShift1 = inRange(o1, c1);
  const isOpenShift2 = inRange(o2, c2);
  const isOpen = isOpenShift1 || isOpenShift2;

  let text = "";
  if (isOpen) {
    const closingTime = isOpenShift1 ? vendor.close_time : vendor.close_time_2;
    text = `Đang mở (đến ${closingTime})`;
  } else {
    text = `Đã đóng cửa (Mở: ${vendor.open_time})`;
  }

  return { isOpen, text };
}

// ================= RENDER VENDOR CARDS =================
function renderVendorGrid() {
  const grid = document.getElementById("vendor-grid");

  if (state.filteredVendors.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p style="font-size: 2rem;">🍲</p>
        <p><strong>Không tìm thấy quán nào phù hợp!</strong></p>
        <p style="font-size:0.85rem; color:#868e96; margin-top:6px;">Hãy thử chọn khu vực quận khác hoặc xóa bớt bộ lọc tìm kiếm.</p>
        <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="resetFilters()">Đặt lại bộ lọc</button>
      </div>
    `;
    return;
  }

  const cardsHtml = state.filteredVendors
    .map((v) => {
      const openStatus = checkIsOpen(v);
      const districtClass = v.district === "Quận 1" ? "q1" : v.district === "Quận 3" ? "q3" : "q10";
      const icon = CATEGORY_ICONS[v.category] || "🍲";
      const ratingStars = "★".repeat(Math.round(v.avg_rating || 5)) + "☆".repeat(5 - Math.round(v.avg_rating || 5));
      const distanceText = getDistanceString(v);

      const adminActions = state.isAdmin
        ? `
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); window.openEditVendor(${v.id})" title="Chỉnh sửa quán">✏️ Sửa</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); window.deleteVendor(${v.id})" title="Xóa quán">🗑️ Xóa</button>
        `
        : "";

      return `
        <article class="vendor-card" id="card-${v.id}" onclick="window.viewVendorDetail(${v.id})">
          <div class="card-media">
            <img src="${escapeHtml(v.image_url)}" alt="${escapeHtml(v.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600'">
            <span class="card-district-tag ${districtClass}">${escapeHtml(v.district)}</span>
          </div>

          <div class="card-content">
            <div>
              <div class="card-top">
                <h3 class="card-title">${escapeHtml(v.name)}</h3>
                <span class="status-badge ${openStatus.isOpen ? "open" : "closed"}">
                  ${openStatus.isOpen ? "🟢" : "🔴"} ${openStatus.text}
                </span>
              </div>

              <p class="card-address">
                <span>📍</span> ${escapeHtml(v.address)}
              </p>

              <div class="card-info-row">
                <span class="card-info-item">
                  <span>${icon}</span> <strong>${escapeHtml(v.category)}</strong>
                </span>
                <span class="card-info-item">
                  <span>💵</span> <strong>${formatPrice(v.price_min)} - ${formatPrice(v.price_max)}</strong>
                </span>
                ${distanceText ? `<span class="card-info-item"><span>🧭</span> <strong>${distanceText}</strong></span>` : ""}
              </div>

              <div class="card-story-snippet">
                "${escapeHtml(v.story || "Điểm bán hè phố bình dân mưu sinh nghĩa tình...")}"
              </div>
            </div>

            <div class="card-bottom">
              <div class="card-rating">
                <span class="stars">${ratingStars}</span>
                <span class="rating-score">${(v.avg_rating || 5.0).toFixed(1)}</span>
                <span class="rating-count">(${v.review_count || 0} lời chúc)</span>
              </div>

              <div class="card-actions">
                ${adminActions}
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.openDirections(${v.id})">🧭 Chỉ đường</button>
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.openReviewModal(${v.id})">💌 Đánh giá</button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  grid.innerHTML = cardsHtml;
}

// Distance helper
function getDistanceString(vendor) {
  if (!state.userLocation) return "";
  const d = calcDistanceKm(state.userLocation.lat, state.userLocation.lng, vendor.latitude, vendor.longitude);
  return `Cách bạn ~${d.toFixed(1)} km`;
}

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function highlightCard(vendorId) {
  document.querySelectorAll(".vendor-card").forEach((c) => c.classList.remove("selected"));
  const card = document.getElementById(`card-${vendorId}`);
  if (card) {
    card.classList.add("selected");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ================= MODAL HANDLERS =================

// 1. Vendor Details Modal
window.viewVendorDetail = async function (vendorId) {
  try {
    const res = await fetch(`/api/vendors/${vendorId}`);
    const data = await res.json();
    if (!data.success || !data.vendor) return;

    const v = data.vendor;
    state.selectedVendorId = v.id;

    // Pan map to vendor location
    if (state.map) {
      state.map.flyTo([v.latitude, v.longitude], 16, { duration: 0.8 });
    }

    // Populate modal
    document.getElementById("modal-img").src = v.image_url;
    document.getElementById("modal-name").textContent = v.name;
    document.getElementById("modal-district").textContent = v.district;
    document.getElementById("modal-category").textContent = `${CATEGORY_ICONS[v.category] || ""} ${v.category}`;

    const openStatus = checkIsOpen(v);
    const statusBadge = document.getElementById("modal-status-badge");
    statusBadge.textContent = openStatus.text;
    statusBadge.className = `badge ${openStatus.isOpen ? "badge-district" : "badge-light"}`;

    const stars = "★".repeat(Math.round(v.avg_rating || 5)) + "☆".repeat(5 - Math.round(v.avg_rating || 5));
    document.getElementById("modal-stars").textContent = stars;
    document.getElementById("modal-rating-num").textContent = (v.avg_rating || 5.0).toFixed(1);
    document.getElementById("modal-review-count").textContent = `(${v.review_count || 0} lời chúc & nhận xét)`;

    document.getElementById("modal-address").textContent = v.address;

    let hoursText = `${v.open_time} - ${v.close_time}`;
    if (v.open_time_2 && v.close_time_2) {
      hoursText += ` | Ca tối: ${v.open_time_2} - ${v.close_time_2}`;
    }
    document.getElementById("modal-hours").textContent = hoursText;

    document.getElementById("modal-price").textContent = `${formatPrice(v.price_min)} - ${formatPrice(v.price_max)}`;
    document.getElementById("modal-phone").textContent = v.phone || "Không có (buôn bán trực tiếp vỉa hè)";
    document.getElementById("modal-story").textContent = v.story || "Chưa có thông tin câu chuyện.";

    // Dishes tags
    const dishesContainer = document.getElementById("modal-dishes-list");
    dishesContainer.innerHTML = "";
    if (v.dishes) {
      const items = v.dishes.split(",").map((s) => s.trim()).filter(Boolean);
      items.forEach((dish) => {
        const span = document.createElement("span");
        span.className = "dish-tag";
        span.textContent = dish;
        dishesContainer.appendChild(span);
      });
    }

    // Reviews list
    document.getElementById("reviews-total-count").textContent = (v.reviews || []).length;
    const reviewsList = document.getElementById("modal-reviews-list");
    reviewsList.innerHTML = "";

    if (!v.reviews || v.reviews.length === 0) {
      reviewsList.innerHTML = `<p class="text-muted">Chưa có lời chúc nào. Hãy là người đầu tiên gửi lời động viên cô chú nhé!</p>`;
    } else {
      v.reviews.forEach((r) => {
        const starStr = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
        const tags = (r.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
        const tagsHtml = tags.map((t) => `<span class="tag-badge">${escapeHtml(t)}</span>`).join("");

        const revDiv = document.createElement("div");
        revDiv.className = "review-card";
        revDiv.innerHTML = `
          <div class="review-card-head">
            <span class="review-author">👤 ${escapeHtml(r.author)}</span>
            <span class="stars">${starStr}</span>
          </div>
          ${tagsHtml ? `<div class="review-tags">${tagsHtml}</div>` : ""}
          <p class="review-comment">"${escapeHtml(r.comment)}"</p>
          <div class="review-date" style="margin-top:4px;">${formatDate(r.created_at)}</div>
        `;
        reviewsList.appendChild(revDiv);
      });
    }

    // Modal action buttons
    document.getElementById("modal-btn-directions").onclick = () => {
      document.getElementById("vendor-modal").style.display = "none";
      window.openDirections(v.id);
    };

    document.getElementById("modal-btn-open-review").onclick = () => {
      document.getElementById("vendor-modal").style.display = "none";
      window.openReviewModal(v.id);
    };

    document.getElementById("vendor-modal").style.display = "flex";
  } catch (err) {
    console.error("Error opening detail:", err);
  }
};

// 2. Directions Modal
window.openDirections = function (vendorId) {
  const v = state.vendors.find((item) => item.id === vendorId);
  if (!v) return;

  document.getElementById("direction-vendor-name").textContent = v.name;
  document.getElementById("direction-vendor-address").textContent = v.address;

  // Compute distance from user or Saigon central point
  let distKm = 1.8;
  if (state.userLocation) {
    distKm = calcDistanceKm(state.userLocation.lat, state.userLocation.lng, v.latitude, v.longitude);
  } else {
    distKm = calcDistanceKm(SAIGON_CENTER[0], SAIGON_CENTER[1], v.latitude, v.longitude);
  }

  const motorTimeMin = Math.max(3, Math.round((distKm / 25) * 60));
  const walkTimeMin = Math.round((distKm / 4.5) * 60);

  document.getElementById("direction-distance").textContent = `~ ${distKm.toFixed(1)} km`;
  document.getElementById("direction-time").textContent = `~ ${motorTimeMin} phút xe máy (${walkTimeMin}p đi bộ)`;

  // Google Maps Direct Navigation Link
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}&travelmode=driving`;
  document.getElementById("btn-google-maps").href = gmapsUrl;

  // OpenStreetMap link
  const osmUrl = `https://www.openstreetmap.org/directions?from=&to=${v.latitude}%2C${v.longitude}`;
  document.getElementById("btn-osm-maps").href = osmUrl;

  document.getElementById("directions-modal").style.display = "flex";
};

// 3. Review Box Modal
window.openReviewModal = function (vendorId) {
  const v = state.vendors.find((item) => item.id === vendorId);
  if (!v) return;

  document.getElementById("review-vendor-id").value = v.id;
  document.getElementById("review-vendor-title").textContent = `Đang gửi lời chúc đến: ${v.name}`;
  document.getElementById("review-comment").value = "";
  document.getElementById("review-rating").value = 5;
  document.getElementById("review-tags").value = "";

  // Reset tag pills
  document.querySelectorAll("#review-tag-picker .tag-pill").forEach((btn) => btn.classList.remove("active"));
  updateStarDisplay(5);

  document.getElementById("review-modal").style.display = "flex";
};

// 4. Admin Modal (Add/Edit Vendor)
window.openAddVendor = function () {
  if (!checkAdminPermission()) return;

  document.getElementById("admin-modal-title").textContent = "Thêm Điểm Bán Hè Phố Mới";
  document.getElementById("admin-vendor-id").value = "";
  document.getElementById("admin-vendor-form").reset();

  // Preset sensible defaults in Saigon D1
  document.getElementById("admin-lat").value = 10.7765;
  document.getElementById("admin-lng").value = 106.6853;
  document.getElementById("admin-open-1").value = "06:00";
  document.getElementById("admin-close-1").value = "11:30";
  document.getElementById("admin-price-min").value = 15000;
  document.getElementById("admin-price-max").value = 35000;

  document.getElementById("admin-modal").style.display = "flex";
};

window.openEditVendor = function (vendorId) {
  if (!checkAdminPermission()) return;

  const v = state.vendors.find((item) => item.id === vendorId);
  if (!v) return;

  document.getElementById("admin-modal-title").textContent = "Chỉnh Sửa Điểm Bán Hè Phố";
  document.getElementById("admin-vendor-id").value = v.id;
  document.getElementById("admin-name").value = v.name || "";
  document.getElementById("admin-category").value = v.category || "Khác";
  document.getElementById("admin-district").value = v.district || "Quận 1";
  document.getElementById("admin-address").value = v.address || "";
  document.getElementById("admin-lat").value = v.latitude || "";
  document.getElementById("admin-lng").value = v.longitude || "";
  document.getElementById("admin-open-1").value = v.open_time || "06:00";
  document.getElementById("admin-close-1").value = v.close_time || "11:30";
  document.getElementById("admin-open-2").value = v.open_time_2 || "";
  document.getElementById("admin-close-2").value = v.close_time_2 || "";
  document.getElementById("admin-price-min").value = v.price_min || 15000;
  document.getElementById("admin-price-max").value = v.price_max || 35000;
  document.getElementById("admin-phone").value = v.phone || "";
  document.getElementById("admin-dishes").value = v.dishes || "";
  document.getElementById("admin-story").value = v.story || "";
  document.getElementById("admin-image").value = v.image_url || "";

  document.getElementById("admin-modal").style.display = "flex";
};

window.deleteVendor = async function (vendorId) {
  if (!checkAdminPermission()) return;
  const v = state.vendors.find((item) => item.id === vendorId);
  if (!confirm(`Bạn có chắc chắn muốn xóa điểm bán "${v ? v.name : vendorId}" không?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/vendors/${vendorId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Đã xóa điểm bán thành công!");
      await loadVendors();
    } else {
      alert("Lỗi xóa: " + (data.error || "Không thể xóa"));
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
};

// ================= ADMIN PERMISSION =================
function checkAdminPermission() {
  if (state.isAdmin) return true;
  const pin = prompt("Vui lòng nhập mã PIN quản trị viên (Mặc định: admin123):");
  if (pin === "admin123") {
    setAdminMode(true);
    showToast("Đăng nhập quyền Chủ Web / Admin thành công!");
    return true;
  } else if (pin !== null) {
    alert("Mã PIN không chính xác!");
  }
  return false;
}

function setAdminMode(enabled) {
  state.isAdmin = enabled;
  localStorage.setItem("saigon_streetfood_admin", enabled ? "1" : "0");
  document.getElementById("admin-banner-indicator").style.display = enabled ? "flex" : "none";
  renderVendorGrid();
}

function checkCachedAdmin() {
  if (localStorage.getItem("saigon_streetfood_admin") === "1") {
    state.isAdmin = true;
    document.getElementById("admin-banner-indicator").style.display = "flex";
  }
}

// ================= EVENT LISTENERS =================
function initEventListeners() {
  // District Filter Buttons
  document.querySelectorAll("#district-filters .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#district-filters .pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      state.currentDistrict = btn.dataset.district;
      applyFilters();
    });
  });

  // Category Filter Chips
  document.querySelectorAll("#category-filters .cat-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#category-filters .cat-chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      state.currentCategory = btn.dataset.category;
      applyFilters();
    });
  });

  // Search input
  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");
  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    clearBtn.style.display = e.target.value ? "block" : "none";
    applyFilters();
  });
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    clearBtn.style.display = "none";
    applyFilters();
  });

  // Open Now Toggle
  document.getElementById("filter-open-now").addEventListener("change", (e) => {
    state.isOpenNowOnly = e.target.checked;
    applyFilters();
  });

  // Sort Select
  document.getElementById("sort-select").addEventListener("change", (e) => {
    state.sortMode = e.target.value;
    applyFilters();
  });

  // Header Admin Button
  document.getElementById("btn-owner-mode").addEventListener("click", () => {
    if (state.isAdmin) {
      if (confirm("Bạn đang ở chế độ Quản trị viên. Bạn có muốn thoát chế độ Quản trị?")) {
        setAdminMode(false);
        showToast("Đã thoát chế độ Quản trị viên");
      } else {
        openAddVendor();
      }
    } else {
      openAddVendor();
    }
  });

  document.getElementById("btn-add-vendor-top").addEventListener("click", openAddVendor);

  // Map Controls
  document.getElementById("btn-locate-me").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        updateUserLocationMarker();
        state.map.flyTo([state.userLocation.lat, state.userLocation.lng], 16);
        applyFilters();
        showToast("Đã định vị vị trí hiện tại của bạn!");
      },
      () => {
        alert("Không thể lấy vị trí hiện tại. Vui lòng bật cấp quyền vị trí trong trình duyệt.");
      }
    );
  });

  document.getElementById("btn-reset-map").addEventListener("click", () => {
    state.map.flyTo(SAIGON_CENTER, DEFAULT_ZOOM);
  });

  // Mobile view toggle (Map vs List)
  const viewToggleBtn = document.getElementById("btn-view-toggle");
  let isMapViewOnMobile = true;
  viewToggleBtn.addEventListener("click", () => {
    const mapPane = document.getElementById("map-container");
    const listPane = document.getElementById("list-container");
    const label = document.getElementById("view-toggle-text");

    if (isMapViewOnMobile) {
      mapPane.style.display = "none";
      listPane.style.display = "block";
      label.textContent = "Bản đồ";
      isMapViewOnMobile = false;
    } else {
      mapPane.style.display = "block";
      listPane.style.display = "none";
      label.textContent = "Danh sách";
      state.map.invalidateSize();
      isMapViewOnMobile = true;
    }
  });

  // Coordinate Picker on Map Button
  document.getElementById("btn-pick-from-map").addEventListener("click", () => {
    document.getElementById("admin-modal").style.display = "none";
    startLocationPicking();
  });

  document.getElementById("btn-cancel-picker").addEventListener("click", () => {
    endLocationPicking();
    document.getElementById("admin-modal").style.display = "flex";
  });

  // Preset image buttons in admin form
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("admin-image").value = btn.dataset.url;
    });
  });

  // Admin Form Submit (Add or Edit)
  document.getElementById("admin-vendor-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("admin-vendor-id").value;
    const payload = {
      name: document.getElementById("admin-name").value.trim(),
      category: document.getElementById("admin-category").value,
      district: document.getElementById("admin-district").value,
      address: document.getElementById("admin-address").value.trim(),
      latitude: parseFloat(document.getElementById("admin-lat").value),
      longitude: parseFloat(document.getElementById("admin-lng").value),
      open_time: document.getElementById("admin-open-1").value,
      close_time: document.getElementById("admin-close-1").value,
      open_time_2: document.getElementById("admin-open-2").value,
      close_time_2: document.getElementById("admin-close-2").value,
      price_min: parseInt(document.getElementById("admin-price-min").value, 10) || 15000,
      price_max: parseInt(document.getElementById("admin-price-max").value, 10) || 35000,
      phone: document.getElementById("admin-phone").value.trim(),
      dishes: document.getElementById("admin-dishes").value.trim(),
      story: document.getElementById("admin-story").value.trim(),
      image_url: document.getElementById("admin-image").value.trim()
    };

    try {
      let res;
      if (id) {
        // Update existing
        res = await fetch(`/api/vendors/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new
        res = await fetch("/api/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        document.getElementById("admin-modal").style.display = "none";
        showToast(id ? "Đã cập nhật quán thành công!" : "Đã thêm điểm bán mới thành công!");
        await loadVendors();
      } else {
        alert("Lỗi: " + (data.error || "Không thể lưu"));
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Đã xảy ra lỗi khi lưu thông tin quán.");
    }
  });

  // Admin DB Reset Button
  document.getElementById("btn-reset-db").addEventListener("click", async () => {
    if (confirm("Bạn có chắc muốn khôi phục về 12 quán mặc định ban đầu không? Dữ liệu bạn thêm sẽ bị xóa.")) {
      try {
        const res = await fetch("/api/reset", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          document.getElementById("admin-modal").style.display = "none";
          await loadVendors();
        }
      } catch (err) {
        console.error("Reset error:", err);
      }
    }
  });

  // Review Form: Star Choice Clicks
  const starChoices = document.querySelectorAll("#star-picker .star-choice");
  const starDesc = document.getElementById("star-desc");
  const starDescriptions = {
    1: "1 sao - Cần cải thiện nhiều",
    2: "2 sao - Tạm được",
    3: "3 sao - Khá ổn",
    4: "4 sao - Rất ngon, cô chú thân thiện",
    5: "5 sao - Tuyệt vời, ủng hộ cô chú hết mình!"
  };

  starChoices.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.dataset.rating, 10);
      document.getElementById("review-rating").value = rating;
      updateStarDisplay(rating);
    });
  });

  function updateStarDisplay(rating) {
    starChoices.forEach((s) => {
      const r = parseInt(s.dataset.rating, 10);
      if (r <= rating) {
        s.classList.add("active");
      } else {
        s.classList.remove("active");
      }
    });
    starDesc.textContent = starDescriptions[rating] || "";
  }

  // Review Form: Tag Pill Toggles
  document.querySelectorAll("#review-tag-picker .tag-pill").forEach((tagBtn) => {
    tagBtn.addEventListener("click", () => {
      tagBtn.classList.toggle("active");
      const activeTags = Array.from(document.querySelectorAll("#review-tag-picker .tag-pill.active")).map(
        (b) => b.dataset.tag
      );
      document.getElementById("review-tags").value = activeTags.join(", ");
    });
  });

  // Review Form Submit
  document.getElementById("review-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const vendorId = document.getElementById("review-vendor-id").value;
    const payload = {
      author: document.getElementById("review-author").value.trim() || "Thực khách ấm lòng",
      rating: parseInt(document.getElementById("review-rating").value, 10) || 5,
      tags: document.getElementById("review-tags").value,
      comment: document.getElementById("review-comment").value.trim()
    };

    try {
      const res = await fetch(`/api/vendors/${vendorId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById("review-modal").style.display = "none";
        showToast("Cảm ơn bạn đã gửi lời chúc và ủng hộ cô chú! ❤️");
        await loadVendors();
        if (state.selectedVendorId == vendorId) {
          window.viewVendorDetail(vendorId);
        }
      } else {
        alert("Lỗi: " + (data.error || "Không thể gửi đánh giá"));
      }
    } catch (err) {
      console.error("Submit review error:", err);
    }
  });

  // Close Modals on backdrop or close button
  setupModalClose("vendor-modal", "modal-close-btn");
  setupModalClose("directions-modal", "directions-close-btn");
  setupModalClose("review-modal", "review-close-btn");
  setupModalClose("admin-modal", "admin-close-btn");
  document.getElementById("admin-cancel-btn").addEventListener("click", () => {
    document.getElementById("admin-modal").style.display = "none";
  });
}

function setupModalClose(modalId, closeBtnId) {
  const modal = document.getElementById(modalId);
  const btn = document.getElementById(closeBtnId);
  if (btn) {
    btn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }
}

// Map picker helpers
function startLocationPicking() {
  state.isPickingLocation = true;
  document.getElementById("map-picker-banner").style.display = "flex";
  document.getElementById("map").style.cursor = "crosshair";
}

function endLocationPicking() {
  state.isPickingLocation = false;
  document.getElementById("map-picker-banner").style.display = "none";
  document.getElementById("map").style.cursor = "";
}

// Reset all search & filter
window.resetFilters = function () {
  state.currentDistrict = "Tất cả";
  state.currentCategory = "Tất cả";
  state.searchQuery = "";
  state.isOpenNowOnly = false;
  state.sortMode = "default";

  document.querySelectorAll("#district-filters .pill").forEach((p) => p.classList.remove("active"));
  document.querySelector('#district-filters .pill[data-district="Tất cả"]').classList.add("active");

  document.querySelectorAll("#category-filters .cat-chip").forEach((c) => c.classList.remove("active"));
  document.querySelector('#category-filters .cat-chip[data-category="Tất cả"]').classList.add("active");

  document.getElementById("search-input").value = "";
  document.getElementById("search-clear").style.display = "none";
  document.getElementById("filter-open-now").checked = false;
  document.getElementById("sort-select").value = "default";

  applyFilters();
};

// ================= UTILITIES =================
function formatPrice(num) {
  if (!num) return "0đ";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString("vi-VN")} lúc ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (e) {
    return isoStr;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.backgroundColor = "#212529";
  toast.style.color = "#ffffff";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "9999px";
  toast.style.fontSize = "0.9rem";
  toast.style.fontWeight = "600";
  toast.style.boxShadow = "0 8px 16px rgba(0,0,0,0.2)";
  toast.style.zIndex = "9999";
  toast.style.animation = "fadeIn 0.2s ease";
  toast.textContent = msg;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}
