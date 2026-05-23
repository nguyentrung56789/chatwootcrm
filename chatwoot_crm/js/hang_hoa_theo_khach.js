"use strict";

const LOGIN_STORAGE_KEY = "chatwoot_crm_user";
const VIEW_HANG_HOA_THEO_KHACH = "sql_hanghoa_theokhach";
const TABLE_NHAN_VIEN = getConfiguredTableName("index", "kv_nhan_vien");
const MAX_ROWS = 500;
const CHATWOOT_FETCH_INFO_EVENT = "chatwoot-dashboard-app:fetch-info";

let currentUser = getLoginUser();
let supabaseClient = null;
let SUPABASE_REST_URL = "";
let SUPABASE_REST_ANON = "";

let chatwootContext = null;
let chatwootContextRaw = "";
let chatwootContextReadyResolvers = [];

let allRows = [];
let filteredRows = [];
let currentMakh = "";
let sortField = "so_luong";
let sortDirection = "desc";

const loginPopup = document.getElementById("loginPopup");
const popupMaNvInput = document.getElementById("popupMaNvInput");
const popupMatKhauInput = document.getElementById("popupMatKhauInput");
const popupLoginBtn = document.getElementById("popupLoginBtn");
const popupLoginMessage = document.getElementById("popupLoginMessage");
const popupCfgNote = document.getElementById("popupCfgNote");

const reloadBtn = document.getElementById("reloadBtn");
const logoutBtn = document.getElementById("logoutBtn");
const searchInput = document.getElementById("searchInput");
const statusText = document.getElementById("statusText");
const messageBox = document.getElementById("messageBox");
const tableWrap = document.getElementById("tableWrap");
const detailBody = document.getElementById("detailBody");
const footerInfo = document.getElementById("footerInfo");

window.addEventListener("message", handleChatwootMessage);

reloadBtn.addEventListener("click", function () {
  loadByMakh();
});

logoutBtn.addEventListener("click", function () {
  localStorage.removeItem(LOGIN_STORAGE_KEY);
  currentUser = null;
  clearData();
  openLoginPopup();
});

popupLoginBtn.addEventListener("click", loginFromPopup);

popupMatKhauInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    loginFromPopup();
  }
});

searchInput.addEventListener("input", function () {
  applySearchSortRender();
});

document.querySelectorAll("th.sortable").forEach(function (th) {
  th.addEventListener("click", function () {
    const field = th.getAttribute("data-sort");
    if (!field) return;

    if (sortField === field) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDirection = field === "so_luong" ? "desc" : "asc";
    }

    applySearchSortRender();
  });
});

init();

async function init() {
  await initSupabase();

  requestChatwootContext();
  setTimeout(requestChatwootContext, 300);
  setTimeout(requestChatwootContext, 900);
  setTimeout(requestChatwootContext, 1600);

  if (!supabaseClient) {
    statusText.textContent = "Lỗi cấu hình";
    showMessage("Chưa lấy được Supabase URL hoặc anon key.", true);
    openLoginPopup();
    return;
  }

  if (!currentUser) {
    statusText.textContent = "Chưa đăng nhập";
    showMessage("Vui lòng đăng nhập để xem hàng hóa đã mua.", false);
    openLoginPopup();
    return;
  }

  closeLoginPopup();
  await loadByMakh();
}

function getConfiguredTableName(configName, fallbackTable) {
  try {
    if (typeof window.getConfig === "function") {
      const cfg = window.getConfig(configName);
      if (cfg && typeof cfg === "object" && cfg.table) {
        return cfg.table;
      }
    }
  } catch (error) {
    console.warn("Không lấy được cấu hình bảng:", configName, error);
  }

  return fallbackTable;
}

async function initSupabase() {
  try {
    popupCfgNote.textContent = "Đang lấy cấu hình Supabase.";

    let supabaseUrl = "";
    let supabaseAnon = "";

    try {
      const resp = await fetch("/api/getConfig", {
        headers: {
          "x-internal-key": window.getInternalKey ? window.getInternalKey() : ""
        }
      });

      if (resp.ok) {
        const cfg = await resp.json();
        supabaseUrl = cfg.url || "";
        supabaseAnon = cfg.anon || cfg.key || "";
      }
    } catch (error) {
      console.warn("Không gọi được /api/getConfig trực tiếp:", error);
    }

    if ((!supabaseUrl || !supabaseAnon) && window.configReady) {
      await window.configReady;

      if (typeof window.getConfig === "function") {
        const urlValue = window.getConfig("url");
        const anonValue = window.getConfig("anon");

        if (typeof urlValue === "string") {
          supabaseUrl = supabaseUrl || urlValue;
        }

        if (typeof anonValue === "string") {
          supabaseAnon = supabaseAnon || anonValue;
        }
      }
    }

    if (!supabaseUrl || !supabaseAnon) {
      popupCfgNote.textContent = "Thiếu cấu hình Supabase";
      popupLoginMessage.textContent = "Chưa lấy được Supabase URL hoặc anon key.";
      return;
    }

    SUPABASE_REST_URL = supabaseUrl;
    SUPABASE_REST_ANON = supabaseAnon;
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnon);

    popupCfgNote.textContent = "Sẵn sàng đăng nhập";
    popupLoginMessage.textContent = "";
  } catch (error) {
    console.error("Lỗi initSupabase:", error);
    popupCfgNote.textContent = "Lỗi cấu hình Supabase";
    popupLoginMessage.textContent = error.message || "Không lấy được cấu hình.";
  }
}

async function loginFromPopup() {
  const maNv = popupMaNvInput.value.trim();
  const matKhau = popupMatKhauInput.value.trim();

  popupLoginMessage.textContent = "";

  if (!maNv || !matKhau) {
    popupLoginMessage.textContent = "Vui lòng nhập mã nhân viên và mật khẩu.";
    return;
  }

  if (!supabaseClient) {
    popupLoginMessage.textContent = "Supabase chưa sẵn sàng.";
    return;
  }

  popupLoginBtn.disabled = true;
  popupLoginBtn.textContent = "Đang đăng nhập...";

  const { data, error } = await supabaseClient
    .from(TABLE_NHAN_VIEN)
    .select("ma_nv, mat_khau, ten_nv, dien_thoai, hoat_dong, admin")
    .or(`ma_nv.eq.${escapeSupabaseOrValue(maNv)},dien_thoai.eq.${escapeSupabaseOrValue(maNv)}`)
    .eq("mat_khau", matKhau)
    .maybeSingle();

  popupLoginBtn.disabled = false;
  popupLoginBtn.textContent = "Đăng nhập";

  if (error) {
    console.error("Lỗi đăng nhập:", error);
    popupLoginMessage.textContent = "Lỗi kiểm tra đăng nhập.";
    return;
  }

  if (!data) {
    popupLoginMessage.textContent = "Sai mã nhân viên hoặc mật khẩu.";
    return;
  }

  if (data.hoat_dong === false) {
    popupLoginMessage.textContent = "Tài khoản đã bị khóa.";
    return;
  }

  currentUser = {
    ma_nv: data.ma_nv,
    ten_nv: data.ten_nv,
    admin: data.admin === true,
    login_at: new Date().toISOString()
  };

  localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(currentUser));

  popupMaNvInput.value = "";
  popupMatKhauInput.value = "";
  popupLoginMessage.textContent = "";

  closeLoginPopup();
  await loadByMakh();
}

async function loadByMakh() {
  if (!currentUser) {
    statusText.textContent = "Chưa đăng nhập";
    showMessage("Vui lòng đăng nhập để xem hàng hóa đã mua.", false);
    openLoginPopup();
    return;
  }

  setLoading(true);

  try {
    let makh =
      getQueryParam("makh") ||
      getQueryParam("ma_kh") ||
      getQueryParam("ma_khach_hang");

    if (!makh) {
      await waitForChatwootContext(1800);
      makh = getMakhFromChatwootContext();
    }

    if (!makh) {
      currentMakh = "";
      statusText.textContent = "Thiếu makh";
      hideTable("Không lấy được mã khách hàng từ URL hoặc Chatwoot custom_attributes.", false);
      return;
    }

    currentMakh = makh;
    statusText.textContent = "KH: " + makh;

    await loadHangHoaTheoKhach(makh);
  } catch (error) {
    statusText.textContent = "Lỗi tải dữ liệu";
    hideTable("Lỗi tải dữ liệu: " + getErrorMessage(error), true);
  } finally {
    setLoading(false);
  }
}

async function loadHangHoaTheoKhach(makh) {
  const { data, error } = await supabaseClient
    .from(VIEW_HANG_HOA_THEO_KHACH)
    .select("ma_hang, ten_hang, so_luong")
    .eq("makh", makh)
    .order("so_luong", { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    throw error;
  }

  allRows = data || [];
  applySearchSortRender();
}

function applySearchSortRender() {
  const keyword = normalizeText(searchInput.value);

  filteredRows = allRows.filter(function (item) {
    if (!keyword) return true;

    const text = normalizeText(
      String(item.ma_hang || "") + " " + String(item.ten_hang || "")
    );

    return text.includes(keyword);
  });

  filteredRows.sort(compareRows);

  renderHangHoa(filteredRows, currentMakh);
}

function compareRows(a, b) {
  let va = a[sortField];
  let vb = b[sortField];

  if (sortField === "so_luong") {
    va = Number(va || 0);
    vb = Number(vb || 0);
  } else {
    va = normalizeText(va);
    vb = normalizeText(vb);
  }

  if (va < vb) return sortDirection === "asc" ? -1 : 1;
  if (va > vb) return sortDirection === "asc" ? 1 : -1;
  return 0;
}

function renderHangHoa(rows, makh) {
  updateSortIcons();

  if (!allRows.length) {
    hideTable("Không tìm thấy hàng hóa đã mua của mã khách: " + makh, false);
    return;
  }

  if (!rows.length) {
    detailBody.innerHTML = `
      <tr>
        <td colspan="3">Không có mặt hàng nào khớp từ khóa tìm kiếm.</td>
      </tr>
    `;
    tableWrap.classList.remove("hidden");
    footerInfo.classList.remove("hidden");
    footerInfo.textContent = "0 / " + allRows.length + " mặt hàng.";
    statusText.textContent = "KH: " + makh + " · 0 / " + allRows.length + " mặt hàng";
    hideMessage();
    return;
  }

  detailBody.innerHTML = rows.map(function (item) {
    return `
      <tr>
        <td>${escapeHtml(item.ma_hang)}</td>
        <td>${escapeHtml(item.ten_hang)}</td>
        <td class="right">${escapeHtml(formatNumber(item.so_luong))}</td>
      </tr>
    `;
  }).join("");

  tableWrap.classList.remove("hidden");
  footerInfo.classList.remove("hidden");

  const suffix = searchInput.value.trim()
    ? rows.length + " / " + allRows.length + " mặt hàng"
    : rows.length + " mặt hàng";

  footerInfo.textContent = suffix + ".";
  statusText.textContent = "KH: " + makh + " · " + suffix;

  hideMessage();
}

function updateSortIcons() {
  document.querySelectorAll("th.sortable").forEach(function (th) {
    const icon = th.querySelector(".sort-icon");
    const field = th.getAttribute("data-sort");

    if (!icon) return;

    if (field === sortField) {
      icon.textContent = sortDirection === "asc" ? "▲" : "▼";
    } else {
      icon.textContent = "";
    }
  });
}

function clearData() {
  allRows = [];
  filteredRows = [];
  detailBody.innerHTML = "";
  tableWrap.classList.add("hidden");
  footerInfo.classList.add("hidden");
  footerInfo.textContent = "";
  statusText.textContent = "Chưa đăng nhập";
  showMessage("Vui lòng đăng nhập để xem hàng hóa đã mua.", false);
}

function hideTable(message, isError) {
  allRows = [];
  filteredRows = [];
  detailBody.innerHTML = "";
  tableWrap.classList.add("hidden");
  footerInfo.classList.add("hidden");
  footerInfo.textContent = "";

  showMessage(message, isError);
}

function showMessage(message, isError) {
  messageBox.classList.remove("hidden");
  messageBox.className = isError ? "message error" : "message";
  messageBox.textContent = message || "";
}

function hideMessage() {
  messageBox.classList.add("hidden");
  messageBox.textContent = "";
}

function setLoading(isLoading) {
  reloadBtn.disabled = isLoading;
  reloadBtn.textContent = isLoading ? "Đang tải..." : "↻ Làm mới";
}

function openLoginPopup() {
  loginPopup.classList.remove("hidden");
  setTimeout(function () {
    popupMaNvInput.focus();
  }, 100);
}

function closeLoginPopup() {
  loginPopup.classList.add("hidden");
}

function getLoginUser() {
  try {
    const raw = localStorage.getItem(LOGIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function getQueryParam(name) {
  const value = new URLSearchParams(window.location.search).get(name);

  if (!value || String(value).includes("{{")) {
    return "";
  }

  return String(value).trim();
}

function getMakhFromChatwootContext() {
  const ctx = window.__CHATWOOT_APP_CONTEXT__ || chatwootContext || null;
  const c = ctx && ctx.conversation ? ctx.conversation : null;

  const candidates = [
    ctx && ctx.contact && ctx.contact.custom_attributes,
    ctx && ctx.sender && ctx.sender.custom_attributes,

    c && c.sender && c.sender.custom_attributes,
    c && c.contact && c.contact.custom_attributes,

    c && c.meta && c.meta.sender && c.meta.sender.custom_attributes,
    c && c.meta && c.meta.contact && c.meta.contact.custom_attributes,

    ctx && ctx.conversation && ctx.conversation.sender && ctx.conversation.sender.custom_attributes,
    ctx && ctx.conversation && ctx.conversation.contact && ctx.conversation.contact.custom_attributes
  ];

  for (const attrs of candidates) {
    if (!attrs || typeof attrs !== "object") {
      continue;
    }

    const makh =
      attrs.makh ||
      attrs.ma_kh ||
      attrs.maKH ||
      attrs.ma_khach_hang ||
      attrs["mã khách hàng"] ||
      attrs["ma khach hang"] ||
      attrs.customer_code ||
      "";

    if (String(makh).trim()) {
      return String(makh).trim();
    }
  }

  if (chatwootContextRaw) {
    const rawMakh =
      extractFirstMatch(chatwootContextRaw, /["']makh["']\s*:\s*["']([^"']+)["']/i) ||
      extractFirstMatch(chatwootContextRaw, /["']ma_kh["']\s*:\s*["']([^"']+)["']/i) ||
      extractFirstMatch(chatwootContextRaw, /["']ma_khach_hang["']\s*:\s*["']([^"']+)["']/i) ||
      extractFirstMatch(chatwootContextRaw, /["']mã khách hàng["']\s*:\s*["']([^"']+)["']/i);

    if (rawMakh) {
      return String(rawMakh).trim();
    }
  }

  return "";
}

function handleChatwootMessage(event) {
  chatwootContextRaw = getRawText(event.data);
  window.__CHATWOOT_APP_CONTEXT_RAW__ = chatwootContextRaw;

  const context = extractChatwootContextFromMessage(event.data);

  if (context) {
    chatwootContext = context;
    window.__CHATWOOT_APP_CONTEXT__ = context;
  }

  resolveWaitingChatwootContext();
}

function extractChatwootContextFromMessage(rawData) {
  const payload = tryParseJson(rawData);

  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.event === "appContext") {
    return payload.data || null;
  }

  if (payload.data && payload.data.event === "appContext") {
    return payload.data.data || null;
  }

  if (payload.conversation && typeof payload.conversation === "object") {
    return payload;
  }

  if (payload.data && payload.data.conversation && typeof payload.data.conversation === "object") {
    return payload.data;
  }

  return null;
}

function requestChatwootContext() {
  try {
    window.parent.postMessage(CHATWOOT_FETCH_INFO_EVENT, "*");
  } catch (error) {
    console.warn("Không gửi được yêu cầu lấy Chatwoot context:", error);
  }
}

function waitForChatwootContext(timeoutMs) {
  if (chatwootContext || window.__CHATWOOT_APP_CONTEXT__ || chatwootContextRaw) {
    return Promise.resolve(chatwootContext || window.__CHATWOOT_APP_CONTEXT__ || null);
  }

  requestChatwootContext();

  return new Promise(function (resolve) {
    const timer = setTimeout(function () {
      resolve(chatwootContext || window.__CHATWOOT_APP_CONTEXT__ || null);
    }, timeoutMs || 1500);

    chatwootContextReadyResolvers.push(function (context) {
      clearTimeout(timer);
      resolve(context || null);
    });
  });
}

function resolveWaitingChatwootContext() {
  const resolvers = chatwootContextReadyResolvers;
  chatwootContextReadyResolvers = [];

  resolvers.forEach(function (resolve) {
    resolve(chatwootContext || window.__CHATWOOT_APP_CONTEXT__ || null);
  });
}

function tryParseJson(value) {
  if (typeof value !== "string") {
    return value;
  }

  let current = value;

  for (let i = 0; i < 4; i++) {
    if (typeof current !== "string") {
      return current;
    }

    const text = current.trim();

    if (!text || (!text.startsWith("{") && !text.startsWith("["))) {
      return value;
    }

    try {
      current = JSON.parse(text);
    } catch (error) {
      return value;
    }
  }

  return current;
}

function getRawText(value) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value || {});
  } catch (error) {
    return "";
  }
}

function extractFirstMatch(text, regex) {
  const match = String(text || "").match(regex);
  return match && match[1] ? String(match[1]) : null;
}

function escapeSupabaseOrValue(value) {
  return String(value || "")
    .replaceAll(",", "\\,")
    .replaceAll(")", "\\)")
    .replaceAll("(", "\\(");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("vi-VN") : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getErrorMessage(error) {
  if (!error) {
    return "Không rõ lỗi";
  }

  if (error.message) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
}
