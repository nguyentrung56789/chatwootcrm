// ===================== config.js =====================

// 1) CẤU HÌNH THEO ỨNG DỤNG
window.COD_CONFIGS = {
  index: { table: "kv_nhan_vien" },
  kh:   { table: "kv_khachhang" },
  dh: { table: "don_hang" },
  dhct:   { table: "don_hang_chitiet" }
};

// 2) HÀM TRỘN CẤU HÌNH
window.getConfig = (name) => {
  const base = window.COD_BASE || {};
  const per  = (window.COD_CONFIGS || {})[name] || {};
  return { ...base, ...per };
};