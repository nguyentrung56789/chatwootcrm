const LOGIN_STORAGE_KEY = "chatwoot_crm_user";
const TABLE_NHAN_VIEN = "kv_nhan_vien";

// Đổi 2 dòng này theo Supabase của anh
const SUPABASE_URL = "DAN_SUPABASE_URL_VAO_DAY";
const SUPABASE_ANON_KEY = "DAN_SUPABASE_ANON_KEY_VAO_DAY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const maNvInput = document.getElementById("ma_nv");
const matKhauInput = document.getElementById("mat_khau");
const btnLogin = document.getElementById("btnLogin");
const msg = document.getElementById("msg");
const cfgNote = document.getElementById("cfgNote");

cfgNote.textContent = "Sẵn sàng đăng nhập";

btnLogin.addEventListener("click", login);

matKhauInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    login();
  }
});

async function login() {
  const maNv = maNvInput.value.trim();
  const matKhau = matKhauInput.value.trim();

  msg.textContent = "";

  if (!maNv || !matKhau) {
    msg.textContent = "Vui lòng nhập mã nhân viên và mật khẩu.";
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Đang đăng nhập...";

  const { data, error } = await supabaseClient
    .from(TABLE_NHAN_VIEN)
    .select("ma_nv, mat_khau, ten_nv, admin, hoat_dong")
    .eq("ma_nv", maNv)
    .eq("mat_khau", matKhau)
    .maybeSingle();

  btnLogin.disabled = false;
  btnLogin.textContent = "Đăng nhập";

  if (error) {
    console.error("Lỗi đăng nhập:", error);
    msg.textContent = "Lỗi kiểm tra đăng nhập.";
    return;
  }

  if (!data) {
    msg.textContent = "Sai mã nhân viên hoặc mật khẩu.";
    return;
  }

  if (data.hoat_dong === false) {
    msg.textContent = "Tài khoản đã bị khóa.";
    return;
  }

  const loginUser = {
    ma_nv: data.ma_nv,
    ten_nv: data.ten_nv,
    admin: data.admin === true,
    login_at: new Date().toISOString()
  };

  localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(loginUser));

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect") || "ds_khachhang.html";

  window.location.href = redirect;
}