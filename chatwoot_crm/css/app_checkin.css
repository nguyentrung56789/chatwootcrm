:root{
  --bar-h:76px;
}

/* ===== RESET CƠ BẢN ===== */
html,body{
  margin:0;
  padding:0;
  height:100%;
  min-height:-webkit-fill-available;
  background:#000;
  color:#fff;
  font-family:system-ui, Segoe UI, Roboto, Arial;
  overflow:hidden;
}

/* ===== LOADING CAMERA ===== */
.stage{
  position:fixed;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#000;
  z-index:1;
  opacity:0;
  transform:scale(0.001);
  transition:.18s;
}
.stage.ready{
  opacity:1;
  transform:scale(1);
}

/* ===== VIDEO / CANVAS ===== */
video,canvas{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  background:#000;
  pointer-events:none;
}

/* ===== BAR NÚT ===== */
.bar{
  position:fixed;
  left:0; right:0; bottom:0;
  height:var(--bar-h);
  padding:10px 12px calc(10px + env(safe-area-inset-bottom));
  display:flex;
  gap:10px;
  justify-content:center;
  align-items:center;
  background:rgba(0,0,0,.28);
  backdrop-filter:blur(10px);
  border-top:1px solid rgba(255,255,255,.12);
  z-index:50;
}

/* ===== BUTTONS ===== */
.btn{
  appearance:none;
  border:none;
  border-radius:12px;
  padding:10px 14px;
  font-weight:700;
  font-size:15px;
  cursor:pointer;
  white-space:nowrap;
}

/* Màu */
.btn-blue{background:#2563eb;color:#fff;}
.btn-green{background:#10b981;color:#001b12;}
.btn-gray{background:#374151;color:#fff;}
.btn-on{background:#10b981!important;color:#fff!important;}

/* Icon */
.btn-icon{
  padding:10px;
  width:44px;
  height:44px;
  font-size:18px;
  display:flex;
  align-items:center;
  justify-content:center;
}

/* ===== TOAST ===== */
#toast{
  position:fixed;
  left:50%;
  top:0;
  transform:translate(-50%,-120%);
  opacity:0;
  padding:10px 14px;
  border-radius:12px;
  background:#e0f2fe;
  color:#075985;
  border:1px solid #38bdf8;
  font-weight:700;
  box-shadow:0 6px 22px rgba(0,0,0,.25);
  transition:.25s;
  z-index:99;
}

/* ===== TAG KH/HD ===== */
#tagInfo{
  position:fixed;
  left:12px;
  top:10px;
  padding:6px 10px;
  font-size:12px;
  border-radius:10px;
  backdrop-filter:blur(6px);
  background:#111a;
  border:1px solid #ffffff22;
  z-index:60;
}

/* ===== KHUNG CAMERA DẠNG APP ===== */
.cam-box{
  position:relative;
  width:100%;
  max-width:480px;
  aspect-ratio:9/16;
  margin:12px auto;
  background:#000;
  border-radius:18px;
  overflow:hidden;
}

.cam-box video,
.cam-box canvas{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
}

/* MOBILE: mở rộng cam-box */
@media(max-width:768px){
  .cam-box{
    max-width:none;
    height:min(70vh,600px);
    aspect-ratio:auto;
  }
}
