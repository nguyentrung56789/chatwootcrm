"use strict";

const VIEW_NAME = "sql_hanghoa_theokhach";
const MAX_ROWS = 500;

let supabaseClient = null;
let allRows = [];
let currentMakh = "";
let sortField = "so_luong";
let sortDirection = "desc";

const searchInput = document.getElementById("searchInput");
const reloadBtn = document.getElementById("reloadBtn");
const customerInfo = document.getElementById("customerInfo");
const messageBox = document.getElementById("messageBox");
const tableWrap = document.getElementById("tableWrap");
const detailBody = document.getElementById("detailBody");
const footerInfo = document.getElementById("footerInfo");
const dataTable = document.getElementById("dataTable");

reloadBtn.addEventListener("click", loadData);
searchInput.addEventListener("input", render);

document.querySelectorAll("th.sortable").forEach(function (th) {
  th.addEventListener("click", function (event) {
    if (event.target && event.target.classList.contains("resizer")) return;

    const field = th.getAttribute("data-sort");
    if (!field) return;

    if (sortField === field) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDirection = field === "so_luong" ? "desc" : "asc";
    }

    render();
  });
});

initResizableColumns();
init();

async function init() {
  await initSupabase();

  if (!supabaseClient) {
    showMessage("Chưa lấy được Supabase config.", true);
    return;
  }

  await loadData();
}

async function initSupabase() {
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
    console.warn("Không gọi được /api/getConfig:", error);
  }

  if ((!supabaseUrl || !supabaseAnon) && window.configReady) {
    await window.configReady;

    if (typeof window.getConfig === "function") {
      supabaseUrl = supabaseUrl || window.getConfig("url") || "";
      supabaseAnon = supabaseAnon || window.getConfig("anon") || "";
    }
  }

  if (supabaseUrl && supabaseAnon) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnon);
  }
}

async function loadData() {
  setLoading(true);

  try {
    currentMakh = sessionStorage.getItem("FORM_CHA_MA_KH") || "";

    if (!currentMakh) {
      hideTable("Chưa chọn khách hàng từ form cha.", false);
      return;
    }

    renderCustomerInfo();

    const { data, error } = await supabaseClient
      .from(VIEW_NAME)
      .select("ma_hang, ten_hang, so_luong")
      .eq("makh", currentMakh)
      .order("so_luong", { ascending: false })
      .limit(MAX_ROWS);

    if (error) throw error;

    allRows = data || [];
    render();
  } catch (error) {
    hideTable("Lỗi tải dữ liệu: " + getErrorMessage(error), true);
  } finally {
    setLoading(false);
  }
}

function renderCustomerInfo() {
  const tenKh = sessionStorage.getItem("FORM_CHA_TEN_KH") || "";
  const dienThoai = sessionStorage.getItem("FORM_CHA_DIEN_THOAI") || "";
  const diaChi = sessionStorage.getItem("FORM_CHA_DIA_CHI") || "";

  const parts = [
    "<b>" + escapeHtml(currentMakh) + "</b>",
    tenKh ? escapeHtml(tenKh) : "",
    dienThoai ? escapeHtml(dienThoai) : "",
    diaChi ? escapeHtml(diaChi) : ""
  ].filter(Boolean);

  customerInfo.innerHTML = parts.join(" · ");
  customerInfo.classList.remove("hidden");
}

function render() {
  updateSortIcons();

  if (!allRows.length) {
    hideTable("Khách này chưa có hàng hóa.", false);
    return;
  }

  const keyword = normalizeText(searchInput.value);

  let rows = allRows.filter(function (item) {
    if (!keyword) return true;

    const text = normalizeText(
      String(item.ma_hang || "") + " " + String(item.ten_hang || "")
    );

    return text.includes(keyword);
  });

  rows.sort(compareRows);

  if (!rows.length) {
    detailBody.innerHTML = `
      <tr>
        <td colspan="3">Không có hàng nào khớp từ khóa.</td>
      </tr>
    `;
  } else {
    detailBody.innerHTML = rows.map(function (item) {
      const maHang = escapeHtml(item.ma_hang);
      const tenHang = escapeHtml(item.ten_hang);
      const soLuong = escapeHtml(formatNumber(item.so_luong));

      return `
        <tr>
          <td title="${maHang}">${maHang}</td>
          <td title="${tenHang}">${tenHang}</td>
          <td class="right" title="${soLuong}">${soLuong}</td>
        </tr>
      `;
    }).join("");
  }

  tableWrap.classList.remove("hidden");
  footerInfo.classList.remove("hidden");
  footerInfo.textContent = rows.length + " / " + allRows.length + " mặt hàng.";

  hideMessage();
}

function compareRows(a, b) {
  let valueA = a[sortField];
  let valueB = b[sortField];

  if (sortField === "so_luong") {
    valueA = Number(valueA || 0);
    valueB = Number(valueB || 0);
  } else {
    valueA = normalizeText(valueA);
    valueB = normalizeText(valueB);
  }

  if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
  if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;

  return 0;
}

function updateSortIcons() {
  document.querySelectorAll("th.sortable").forEach(function (th) {
    const icon = th.querySelector(".sort-icon");
    const field = th.getAttribute("data-sort");

    if (!icon) return;

    icon.textContent = field === sortField
      ? (sortDirection === "asc" ? "▲" : "▼")
      : "";
  });
}

function hideTable(message, isError) {
  allRows = [];
  detailBody.innerHTML = "";

  tableWrap.classList.add("hidden");
  footerInfo.classList.add("hidden");
  footerInfo.textContent = "";

  showMessage(message, isError);
}

function showMessage(message, isError) {
  messageBox.className = isError ? "message error" : "message";
  messageBox.textContent = message || "";
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  messageBox.classList.add("hidden");
  messageBox.textContent = "";
}

function setLoading(isLoading) {
  reloadBtn.disabled = isLoading;
  reloadBtn.textContent = isLoading ? "..." : "↻";
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
  if (!error) return "Không rõ lỗi";
  if (error.message) return error.message;

  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
}

function initResizableColumns() {
  document.querySelectorAll(".resizer").forEach(function (resizer) {
    resizer.addEventListener("mousedown", startResize);
    resizer.addEventListener("touchstart", startResize, { passive: false });
  });
}

function startResize(event) {
  event.preventDefault();
  event.stopPropagation();

  const colName = event.target.getAttribute("data-col");
  if (!colName) return;

  const col = dataTable.querySelector('col[data-col="' + colName + '"]');
  if (!col) return;

  const startX = getClientX(event);
  const startWidth = col.getBoundingClientRect().width || parseFloat(col.style.width) || 120;

  document.body.classList.add("resizing");

  function onMove(moveEvent) {
    moveEvent.preventDefault();

    const currentX = getClientX(moveEvent);
    const diff = currentX - startX;
    const nextWidth = Math.max(70, startWidth + diff);

    col.style.width = nextWidth + "px";
  }

  function onEnd() {
    document.body.classList.remove("resizing");

    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onEnd);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onEnd);
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
}

function getClientX(event) {
  if (event.touches && event.touches.length) {
    return event.touches[0].clientX;
  }

  if (event.changedTouches && event.changedTouches.length) {
    return event.changedTouches[0].clientX;
  }

  return event.clientX || 0;
}
