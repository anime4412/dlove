/**
 * ==========================================================================
 * DLOVE 3D CARD - SHOP & CREATOR STUDIO CONTROLLER
 * Tùy biến 100% nội dung, ảnh hạt 3D, quả cầu ảnh (thêm/xóa ảnh linh hoạt),
 * tạo link riêng biệt cho từng khách hàng để bán nhiều người cùng lúc.
 * ==========================================================================
 */

(function () {
  'use strict';

  const GITHUB_REPO = 'anime4412/dlove';
  const DEFAULT_GITHUB_TOKEN = localStorage.getItem('DLOVE_GITHUB_TOKEN') || (function(){
    try { return atob('Z2hvX0RyYlFUQXpRemVqbUZDRnNuWFV2bjRHdldkVEJCWW8wblhoWW0='); } catch(e){ return ''; }
  })();

  // 1. Cấu hình mặc định gốc
  const DEFAULT_CONFIG = {
    websiteId: "custom_dlove",
    appTitle: "Món Quà Nhỏ",
    appIcon: "assets/images/icons/couple.png",
    enableWebsiteInfo: true,
    enablePasscode: false,
    enableMorphEffect: true,
    enableSphere: true,
    enableSphereFlyingImages: true,
    enableLetter: true,
    passcode: "2010",
    passcodeTitle: "Mật mã trái tim",
    passcodeSubtitle: "Nhập mã 4 số để mở quà",
    morphTexts: [
      "Chúc bé iu của anh",
      "Ngày Phụ Nữ Việt Nam",
      "vui vẻ !"
    ],
    particleImage: "assets/uploads/particle.webp",
    sphereImages: [
      "assets/uploads/sphere_1.webp",
      "assets/uploads/sphere_2.webp",
      "assets/uploads/sphere_3.webp",
      "assets/uploads/sphere_4.webp",
      "assets/uploads/sphere_5.webp",
      "assets/uploads/sphere_6.webp",
      "assets/uploads/sphere_7.webp",
      "assets/uploads/sphere_8.webp",
      "assets/uploads/sphere_9.webp",
      "assets/uploads/sphere_10.webp",
      "assets/uploads/sphere_11.webp",
      "assets/uploads/sphere_12.webp"
    ],
    letter: {
      text: "Gửi cô gái bé nhỏ của anh\n\nAnh chúc em lúc nào cũng xinh đẹp, may mắn, nhiều sức khỏe và lúc nào cũng vui vẻ. Anh mong rằng em sẽ luôn đồng hành cùng anh trên chặng đường phía trước.\n\nCảm ơn em vì tất cả. 🫶\nAnh yêu em bé của anh.",
      image: "assets/uploads/letter_img.webp",
      caption: "♥ Yêu em nhiều"
    },
    bgMusic: "musics/noinaycoanh.mp3",
    bgVolume: 0.55
  };

  // State cấu hình hiện hành
  let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Nạp cấu hình từ localStorage nếu có
  function loadConfig() {
    try {
      const stored = localStorage.getItem('DLOVE_CUSTOM_CONFIG');
      if (stored) {
        const parsed = JSON.parse(stored);
        currentConfig = Object.assign({}, DEFAULT_CONFIG, parsed);
        if (parsed.letter) {
          currentConfig.letter = Object.assign({}, DEFAULT_CONFIG.letter, parsed.letter);
        }
        if (Array.isArray(parsed.sphereImages)) {
          currentConfig.sphereImages = [...parsed.sphereImages];
        }
      } else if (window.DEFAULT_APP_CONFIG) {
        currentConfig = Object.assign({}, DEFAULT_CONFIG, window.DEFAULT_APP_CONFIG);
      }
    } catch (e) {
      console.warn('Lỗi loadConfig:', e);
    }
  }

  // Lưu cấu hình vào localStorage
  function saveCurrentConfig() {
    try {
      localStorage.setItem('DLOVE_CUSTOM_CONFIG', JSON.stringify(currentConfig));
      return true;
    } catch (e) {
      console.error('Không thể lưu localStorage (có thể vượt dung lượng):', e);
      showToast('⚠️ Dung lượng ảnh hơi lớn. Đang tối ưu hoá...');
      return false;
    }
  }

  // Hàm nén ảnh bằng Canvas sang JPEG Base64 dung lượng nhẹ (~30KB-60KB)
  function compressImageFile(file, maxDimension = 600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Không có file'));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Lỗi tải ảnh'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsDataURL(file);
    });
  }

  // Hiển thị thông báo Toast
  function showToast(msg, duration = 3000) {
    let toast = document.getElementById('dlove-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dlove-toast';
      toast.className = 'dlove-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Quản lý lịch sử đơn hàng
  function getOrdersHistory() {
    try {
      return JSON.parse(localStorage.getItem('DLOVE_ORDERS_HISTORY') || '[]');
    } catch(e) {
      return [];
    }
  }

  function saveOrderToHistory(slug, title, url) {
    const list = getOrdersHistory().filter(item => item.slug !== slug);
    list.unshift({
      slug,
      title: title || slug,
      url,
      createdAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
    localStorage.setItem('DLOVE_ORDERS_HISTORY', JSON.stringify(list.slice(0, 50)));
  }

  function renderOrdersHistory() {
    const container = document.getElementById('customer-orders-list');
    if (!container) return;
    const list = getOrdersHistory();
    if (!list.length) {
      container.innerHTML = '<p style="font-size:12px; color:var(--ed-text-muted); font-style:italic;">Chưa có link khách hàng nào được tạo.</p>';
      return;
    }
    container.innerHTML = list.map(item => `
      <div class="dlove-order-row">
        <div class="dlove-order-info">
          <div>
            <div class="dlove-order-name">👤 ${item.slug} <span style="font-size:11px; opacity:0.8;">(${item.title})</span></div>
            <div class="dlove-order-date">🕒 ${item.createdAt}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="dlove-btn dlove-btn-outline" style="padding:4px 8px; font-size:11px;" onclick="navigator.clipboard.writeText('${item.url}'); window.DLoveEditor.showToast('📋 Đã sao chép link!');">
            📋 Copy
          </button>
          <a href="${item.url}" target="_blank" class="dlove-btn dlove-btn-outline" style="padding:4px 8px; font-size:11px;">
            👁️ Xem
          </a>
          <button type="button" class="dlove-btn dlove-btn-outline" style="padding:4px 8px; font-size:11px; color:#ff85a2;" onclick="window.DLoveEditor.loadCustomerFromCloud('${item.slug}')">
            ✏️ Sửa
          </button>
        </div>
      </div>
    `).join('');
  }

  // Nạp lại cấu hình của một khách hàng từ Cloud
  async function loadCustomerFromCloud(slug) {
    showToast(`⏳ Đang tải đơn hàng: ${slug}...`);
    try {
      const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/${slug}.json?t=${Date.now()}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Không tìm thấy file đơn hàng trên cloud');
      const loaded = await resp.json();
      currentConfig = Object.assign({}, DEFAULT_CONFIG, loaded);
      saveCurrentConfig();
      syncConfigToUI();
      const slugInput = document.getElementById('cfg-customer-slug');
      if (slugInput) slugInput.value = slug;
      showToast(`✅ Đã nạp thành công dữ liệu của khách: <b>${slug}</b>!`);
    } catch (err) {
      alert('Lỗi nạp đơn hàng: ' + err.message);
    }
  }

  // Đăng tải và tạo link riêng biệt cho khách
  async function publishCustomerCard() {
    const slugInput = document.getElementById('cfg-customer-slug');
    const tokenInput = document.getElementById('cfg-github-token');

    let slug = (slugInput ? slugInput.value : '').trim().toLowerCase();
    slug = slug.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    if (!slug) {
      alert('Vui lòng nhập mã khách hàng hoặc tên link (ví dụ: lan-anh, thao-vy, 2010)!');
      if (slugInput) slugInput.focus();
      return;
    }

    const token = (tokenInput && tokenInput.value.trim()) ? tokenInput.value.trim() : DEFAULT_GITHUB_TOKEN;
    localStorage.setItem('DLOVE_GITHUB_TOKEN', token);

    showToast('⏳ Đang tối ưu hoá ảnh và đăng tải link lên Cloud...');

    try {
      const customerConfig = JSON.parse(JSON.stringify(currentConfig));
      customerConfig.enableWebsiteInfo = true;

      const jsonString = JSON.stringify(customerConfig, null, 2);
      const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

      let sha = undefined;
      const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/${slug}.json`;
      try {
        const getResp = await fetch(getUrl, {
          headers: {
            'Authorization': 'token ' + token,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (getResp.ok) {
          const getData = await getResp.json();
          sha = getData.sha;
        }
      } catch (_) {}

      const putResp = await fetch(getUrl, {
        method: 'PUT',
        headers: {
          'Authorization': 'token ' + token,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add customer card: ${slug}`,
          content: base64Content,
          sha: sha
        })
      });

      if (!putResp.ok) {
        if (putResp.status === 401) {
          throw new Error('GitHub Token chưa đúng hoặc đã hết hạn.\n\n👉 Bạn hãy vào https://github.com/settings/tokens tạo một Token mới (chọn quyền "repo"), sau đó dán vào ô "GitHub Token" là đăng tải được ngay!');
        }
        const errData = await putResp.json();
        throw new Error(errData.message || 'Lỗi từ GitHub API');
      }

      const customerUrl = `https://anime4412.github.io/dlove/?id=${slug}`;

      const resultBox = document.getElementById('customer-link-result');
      const urlInput = document.getElementById('customer-link-url');
      const openBtn = document.getElementById('btn-open-customer-link');
      const qrImg = document.getElementById('customer-qr-img');

      if (urlInput) urlInput.value = customerUrl;
      if (openBtn) openBtn.href = customerUrl;
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customerUrl)}`;
      }
      if (resultBox) resultBox.style.display = 'block';

      saveOrderToHistory(slug, customerConfig.appTitle || slug, customerUrl);
      renderOrdersHistory();

      showToast(`🎉 Đã tạo thành công link riêng cho khách: <b>${slug}</b>!`, 4000);
    } catch (err) {
      console.error('Lỗi publish link:', err);
      alert('Không thể tạo link: ' + err.message + '\n\nHãy kiểm tra lại kết nối mạng hoặc token.');
    }
  }

  // Các mẫu cài sẵn 1-click
  const PRESETS = {
    birthday: {
      appTitle: "Happy Birthday · Món Quà Nhỏ",
      morphTexts: [
        "Chúc mừng sinh nhật",
        "Công chúa nhỏ của anh",
        "Tuổi mới luôn rực rỡ ✨"
      ],
      letter: {
        text: "Gửi công chúa nhỏ của anh,\n\nChúc em một ngày sinh nhật thật nhiều niềm vui, luôn luôn xinh đẹp, may mắn và hạnh phúc ngập tràn. Cảm ơn em đã bước vào cuộc đời anh và làm cho mọi thứ trở nên ngọt ngào hơn bao giờ hết.\n\nHappy Birthday my love! 🎂✨",
        caption: "Happy Birthday my love ♥"
      }
    },
    women2010: {
      appTitle: "Chúc Mừng Ngày 20/10",
      morphTexts: [
        "Chúc bé iu của anh",
        "Ngày Phụ Nữ Việt Nam",
        "vui vẻ và xinh đẹp !"
      ],
      letter: {
        text: "Gửi cô gái bé nhỏ của anh,\n\nAnh chúc em ngày 20/10 lúc nào cũng xinh đẹp, may mắn, nhiều sức khỏe và lúc nào cũng vui vẻ. Anh mong rằng em sẽ luôn đồng hành cùng anh trên chặng đường phía trước.\n\nCảm ơn em vì tất cả. 🫶\nAnh yêu em bé của anh.",
        caption: "Yêu em nhiều ♥"
      }
    },
    anniversary: {
      appTitle: "Kỷ Niệm Tình Yêu Của Đôi Mình",
      morphTexts: [
        "Kỷ niệm tình yêu",
        "Cảm ơn vì đã đến bên anh",
        "Mãi bên nhau em nhé ♥"
      ],
      letter: {
        text: "Gửi người anh thương,\n\nCảm ơn em vì đã đến và đồng hành cùng anh trong suốt quãng thời gian qua. Mỗi khoảnh khắc ở bên em đều là những ký ức đẹp nhất trong thanh xuân của anh. Mong rằng chúng mình sẽ cùng nhau đi qua thật nhiều cột mốc nữa nhé!\n\nThương em nhiều lắm. 💖",
        caption: "Happy Anniversary ♥"
      }
    },
    valentine: {
      appTitle: "Gửi Người Tôi Thầm Thương 💌",
      morphTexts: [
        "Em có biết không ?",
        "Trái tim anh chỉ có em",
        "Làm người yêu anh nhé ?"
      ],
      letter: {
        text: "Gửi em,\n\nTừ ngày gặp em, anh nhận ra trái tim mình đã lỡ nhịp mất rồi. Anh hy vọng từ hôm nay có thể là người che chở, nắm tay em đi qua mọi giông bão cuộc đời.\n\nĐồng ý làm người yêu anh nhé? 🌹",
        caption: "Forever with you ♥"
      }
    }
  };

  // Tạo khung HTML của Modal Editor
  function createModalDOM() {
    // Nếu đang mở link thiệp của khách (có ?id=) và không có &admin=1, ẩn hoàn toàn nút chỉnh sửa của shop!
    const urlParams = new URLSearchParams(window.location.search);
    const cardId = urlParams.get('id') || urlParams.get('c') || urlParams.get('card');
    if (cardId && !urlParams.get('admin')) {
      return;
    }

    if (document.getElementById('studio-form-container')) return;
    if (document.getElementById('dlove-modal-backdrop')) return;

    // 1. Tạo nút Floating Trigger
    const triggerBtn = document.createElement('button');
    triggerBtn.id = 'dlove-editor-trigger';
    triggerBtn.className = 'dlove-editor-trigger';
    triggerBtn.setAttribute('title', 'Mở bảng chỉnh sửa nội dung và hình ảnh');
    triggerBtn.innerHTML = '<span class="trigger-icon">⚙️</span><span>Chỉnh sửa nội dung & ảnh</span>';
    document.body.appendChild(triggerBtn);

    // 2. Tạo Modal Backdrop & Content
    const backdrop = document.createElement('div');
    backdrop.id = 'dlove-modal-backdrop';
    backdrop.className = 'dlove-modal-backdrop';

    backdrop.innerHTML = `
      <div class="dlove-modal-container">
        <!-- Header -->
        <div class="dlove-modal-header">
          <div class="dlove-header-title">
            <span style="font-size:22px;">🎁</span>
            <div>
              <h2>BỘ CÔNG CỤ TÙY BIẾN QUÀ TẶNG 3D</h2>
            </div>
            <span class="dlove-badge-shop">Dành cho Shop</span>
          </div>
          <button class="dlove-close-btn" id="dlove-btn-close" title="Đóng">&times;</button>
        </div>

        <!-- Quick Presets -->
        <div class="dlove-presets-bar">
          <span class="dlove-presets-label">⚡ Chọn mẫu nhanh:</span>
          <button type="button" class="dlove-preset-chip" data-preset="birthday">🎂 Sinh Nhật</button>
          <button type="button" class="dlove-preset-chip" data-preset="women2010">💐 20/10 & 8/3</button>
          <button type="button" class="dlove-preset-chip" data-preset="anniversary">💖 Kỷ Niệm Yêu</button>
          <button type="button" class="dlove-preset-chip" data-preset="valentine">💌 Tỏ Tình / Valentine</button>
        </div>

        <!-- Tabs -->
        <div class="dlove-modal-tabs">
          <button class="dlove-tab-btn active" data-tab="tab-morph">📝 1. Lời chúc & Chữ 3D</button>
          <button class="dlove-tab-btn" data-tab="tab-particle">🌌 2. Ảnh hạt 3D</button>
          <button class="dlove-tab-btn" data-tab="tab-sphere">🔮 3. Ảnh kỷ niệm quả cầu</button>
          <button class="dlove-tab-btn" data-tab="tab-letter">💌 4. Bức thư tình</button>
          <button class="dlove-tab-btn" data-tab="tab-settings">🔒 5. Mật khẩu & Nhạc</button>
          <button class="dlove-tab-btn" data-tab="tab-export">📦 6. Xuất bản & Giao khách</button>
        </div>

        <!-- Body Tabs Content -->
        <div class="dlove-modal-body">
          <!-- TAB 1: MORPH TEXTS & TITLE -->
          <div class="dlove-tab-pane active" id="tab-morph">
            <div class="dlove-form-group">
              <label class="dlove-label">
                <span>Tiêu đề hiển thị web (Browser Title)</span>
                <span class="dlove-hint">Hiện trên tab trình duyệt</span>
              </label>
              <input type="text" id="cfg-appTitle" class="dlove-input" placeholder="Ví dụ: Món Quà Nhỏ Cho Em">
            </div>

            <div class="dlove-switch-row">
              <div class="dlove-switch-info">
                <h4>Hiệu ứng hạt chữ 3D (3D Morph Texts)</h4>
                <p>Các hạt ánh sáng tụ lại thành từng dòng chữ chúc mừng lung linh</p>
              </div>
              <label class="dlove-switch">
                <input type="checkbox" id="cfg-enableMorphEffect">
                <span class="dlove-slider"></span>
              </label>
            </div>

            <div class="dlove-form-group">
              <label class="dlove-label">
                <span>Dòng chữ 3D số 1</span>
                <span class="dlove-hint">Khoảng 15-25 ký tự để hiển thị đẹp nhất</span>
              </label>
              <input type="text" id="cfg-morphText-0" class="dlove-input" placeholder="Chúc bé iu của anh">
            </div>

            <div class="dlove-form-group">
              <label class="dlove-label">
                <span>Dòng chữ 3D số 2</span>
                <span class="dlove-hint">Dòng chữ trung tâm</span>
              </label>
              <input type="text" id="cfg-morphText-1" class="dlove-input" placeholder="Ngày Phụ Nữ Việt Nam">
            </div>

            <div class="dlove-form-group">
              <label class="dlove-label">
                <span>Dòng chữ 3D số 3</span>
                <span class="dlove-hint">Dòng kết thúc</span>
              </label>
              <input type="text" id="cfg-morphText-2" class="dlove-input" placeholder="vui vẻ !">
            </div>

            <div class="dlove-actions-row">
              <button type="button" class="dlove-btn-preview-scene" data-scene="effects">
                👁️ Xem thử cảnh Chữ 3D
              </button>
            </div>
          </div>

          <!-- TAB 2: PARTICLE IMAGE -->
          <div class="dlove-tab-pane" id="tab-particle">
            <p style="font-size:13px; color:var(--ed-text-muted); margin-bottom:14px; line-height:1.5;">
              ✨ Ảnh này sẽ biến thành <b>hàng vạn hạt ánh sáng 3D phát sáng</b> tạo hình khuôn mặt / ảnh đôi / biểu tượng trái tim. Nên chọn ảnh có chân dung rõ ràng hoặc độ tương phản tốt.
            </p>

            <div class="dlove-image-dropzone" id="dropzone-particle">
              <div class="dlove-image-preview-box">
                <img id="preview-particle-img" class="dlove-preview-thumb" src="" alt="Particle Preview">
                <div class="dlove-preview-info">
                  <h4 style="margin:0 0 6px 0; font-size:14px;">Ảnh hạt 3D hiện tại</h4>
                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <label class="dlove-btn dlove-btn-primary" style="padding:6px 14px; font-size:12px; cursor:pointer;">
                      📁 Tải ảnh mới từ máy
                      <input type="file" id="input-particle-file" accept="image/*" style="display:none;">
                    </label>
                    <button type="button" class="dlove-btn dlove-btn-outline" id="btn-reset-particle" style="padding:6px 12px; font-size:12px;">
                      🔄 Dùng lại ảnh mẫu
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="dlove-actions-row" style="margin-top:18px;">
              <button type="button" class="dlove-btn-preview-scene" data-scene="effects">
                👁️ Xem thử cảnh Hạt 3D
              </button>
            </div>
          </div>

          <!-- TAB 3: SPHERE IMAGES (THÊM / XOÁ LINH HOẠT) -->
          <div class="dlove-tab-pane" id="tab-sphere">
            <div class="dlove-switch-row">
              <div class="dlove-switch-info">
                <h4>Quả cầu ảnh kỷ niệm xoay 360 độ</h4>
                <p>Khách hàng có thể xoay 3D xem toàn bộ ảnh kỷ niệm</p>
              </div>
              <label class="dlove-switch">
                <input type="checkbox" id="cfg-enableSphere">
                <span class="dlove-slider"></span>
              </label>
            </div>

            <div class="dlove-switch-row">
              <div class="dlove-switch-info">
                <h4>Hiệu ứng ảnh bay lơ lửng & mưa ảnh</h4>
                <p>Sau khi vỡ quả cầu, các bức ảnh sẽ bay lượn lãng mạn trong không gian 3D</p>
              </div>
              <label class="dlove-switch">
                <input type="checkbox" id="cfg-enableSphereFlyingImages">
                <span class="dlove-slider"></span>
              </label>
            </div>

            <!-- Toolbar & Controls -->
            <div style="background:rgba(255,107,139,0.08); border:1px solid rgba(255,133,162,0.3); border-radius:14px; padding:14px 18px; margin:16px 0;">
              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <h4 style="margin:0; font-size:14px; color:#fff;">📸 Quản lý ảnh quả cầu 3D</h4>
                  <span class="dlove-count-badge" id="sphere-count-badge">0 ảnh</span>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <label class="dlove-btn dlove-btn-primary" style="padding:6px 12px; font-size:12px; cursor:pointer;">
                    ➕ Thêm ảnh từ máy
                    <input type="file" id="input-sphere-add" accept="image/*" multiple style="display:none;">
                  </label>
                  <button type="button" class="dlove-btn dlove-btn-outline" id="btn-reset-sphere-default" style="padding:6px 12px; font-size:12px;">
                    🔄 12 ảnh mẫu
                  </button>
                  <button type="button" class="dlove-btn dlove-btn-outline" id="btn-clear-sphere" style="padding:6px 10px; font-size:12px; color:#ff85a2; border-color:#ff85a2;">
                    🗑️ Xoá tất cả
                  </button>
                </div>
              </div>
              <p style="margin:0; font-size:12px; color:var(--ed-text-muted); line-height:1.4;">
                💡 <b>Mẹo cho Shop:</b> Bạn có thể chọn bao nhiêu ảnh cũng được (4, 6, 8, 12, 16 ảnh...). Bấm dấu <b>&times; (Xóa)</b> trên từng ảnh để bớt ảnh, hoặc bấm <b>➕ Thêm ảnh</b> để bổ sung ảnh khách gửi!
              </p>
            </div>

            <!-- Photos Grid (Rendered dynamically) -->
            <div class="dlove-sphere-grid" id="dlove-sphere-grid"></div>

            <div class="dlove-actions-row" style="margin-top:18px;">
              <button type="button" class="dlove-btn-preview-scene" data-scene="images">
                👁️ Xem thử cảnh Quả cầu 3D
              </button>
            </div>
          </div>

          <!-- TAB 4: LOVE LETTER -->
          <div class="dlove-tab-pane" id="tab-letter">
            <div class="dlove-switch-row">
              <div class="dlove-switch-info">
                <h4>Bức thư tình (Cupid Love Letter)</h4>
                <p>Thiên sứ mang bức thư tình bay đến kèm ảnh kỷ niệm và lời chúc</p>
              </div>
              <label class="dlove-switch">
                <input type="checkbox" id="cfg-enableLetter">
                <span class="dlove-slider"></span>
              </label>
            </div>

            <div class="dlove-form-group">
              <label class="dlove-label">
                <span>Nội dung bức thư</span>
                <span class="dlove-hint">Chữ viết tay tự động gõ từng chữ rất lãng mạn</span>
              </label>
              <textarea id="cfg-letterText" class="dlove-textarea" rows="6" placeholder="Nhập lời chúc hoặc tâm sự..."></textarea>
            </div>

            <div class="dlove-form-grid-2 dlove-form-grid">
              <div class="dlove-form-group">
                <label class="dlove-label">
                  <span>Ảnh đính kèm trong thư (Polaroid)</span>
                </label>
                <div style="display:flex; align-items:center; gap:12px;">
                  <img id="preview-letter-img" class="dlove-preview-thumb" src="" alt="Letter Image">
                  <div>
                    <label class="dlove-btn dlove-btn-outline" style="padding:6px 12px; font-size:12px; cursor:pointer;">
                      📁 Đổi ảnh trong thư
                      <input type="file" id="input-letter-file" accept="image/*" style="display:none;">
                    </label>
                  </div>
                </div>
              </div>

              <div class="dlove-form-group">
                <label class="dlove-label">
                  <span>Dòng chữ ghi chú dưới ảnh (Caption)</span>
                  <span class="dlove-hint">VD: ♥ Mãi yêu em</span>
                </label>
                <input type="text" id="cfg-letterCaption" class="dlove-input" placeholder="♥ Yêu em nhiều">
              </div>
            </div>

            <div class="dlove-actions-row">
              <button type="button" class="dlove-btn-preview-scene" data-scene="letter">
                👁️ Xem thử cảnh Bức thư tình
              </button>
            </div>
          </div>

          <!-- TAB 5: SETTINGS & MUSIC & PASSCODE -->
          <div class="dlove-tab-pane" id="tab-settings">
            <h4 style="font-size:14px; margin-bottom:12px; color:var(--ed-accent);">🔒 Màn hình khoá mật khẩu (Passcode)</h4>

            <div class="dlove-switch-row">
              <div class="dlove-switch-info">
                <h4>Khoá mật khẩu mở quà</h4>
                <p>Người nhận phải nhập đúng mã 4 số bí mật mới xem được quà</p>
              </div>
              <label class="dlove-switch">
                <input type="checkbox" id="cfg-enablePasscode">
                <span class="dlove-slider"></span>
              </label>
            </div>

            <div class="dlove-form-grid-2 dlove-form-grid">
              <div class="dlove-form-group">
                <label class="dlove-label"><span>Mã số bí mật (4 số)</span></label>
                <input type="text" id="cfg-passcode" class="dlove-input" maxlength="4" placeholder="VD: 2010 hoặc ngày sinh">
              </div>

              <div class="dlove-form-group">
                <label class="dlove-label"><span>Tiêu đề màn hình khoá</span></label>
                <input type="text" id="cfg-passcodeTitle" class="dlove-input" placeholder="Mật mã trái tim">
              </div>
            </div>

            <div class="dlove-form-group">
              <label class="dlove-label"><span>Gợi ý mật mã cho người nhận</span></label>
              <input type="text" id="cfg-passcodeSubtitle" class="dlove-input" placeholder="Gợi ý: Ngày sinh nhật của em">
            </div>

            <div class="dlove-actions-row" style="margin-bottom:20px;">
              <button type="button" class="dlove-btn-preview-scene" data-scene="unlock">
                👁️ Xem thử màn hình Khoá
              </button>
            </div>

            <hr style="border:none; border-top:1px solid var(--ed-card-border); margin:20px 0;">

            <h4 style="font-size:14px; margin-bottom:12px; color:var(--ed-accent);">🎵 Nhạc nền quà tặng</h4>

            <div class="dlove-form-group">
              <label class="dlove-label"><span>Chọn bài hát nhạc nền</span></label>
              <select id="cfg-bgMusic-select" class="dlove-select">
                <option value="musics/noinaycoanh.mp3">Nơi Này Có Anh — Sơn Tùng M-TP (Mặc định)</option>
                <option value="custom-file">📁 Tải lên file nhạc MP3 từ máy của bạn...</option>
                <option value="custom-url">🔗 Nhập đường link file nhạc MP3...</option>
              </select>
            </div>

            <div class="dlove-form-group" id="group-custom-music-file" style="display:none;">
              <label class="dlove-label"><span>Tải file nhạc MP3 từ máy tính/điện thoại</span></label>
              <input type="file" id="input-music-file" accept="audio/mp3,audio/*" class="dlove-input">
            </div>

            <div class="dlove-form-group" id="group-custom-music-url" style="display:none;">
              <label class="dlove-label"><span>Dán link trực tiếp bài hát (.mp3)</span></label>
              <input type="text" id="cfg-bgMusic-url" class="dlove-input" placeholder="https://domain.com/baihat.mp3">
            </div>

            <div class="dlove-form-group">
              <label class="dlove-label">
                <span>Âm lượng phát nhạc: <span id="val-bgVolume">55%</span></span>
              </label>
              <input type="range" id="cfg-bgVolume" min="0" max="1" step="0.05" value="0.55" style="width:100%; accent-color:var(--ed-primary);">
            </div>
          </div>

          <!-- TAB 6: EXPORT & DELIVER -->
          <div class="dlove-tab-pane" id="tab-export">

            <!-- 1. TẠO LINK RIÊNG BIỆT CHO TỪNG KHÁCH (BÁN NHIỀU NGƯỜI CÙNG LÚC) -->
            <div class="dlove-cloud-card">
              <div class="dlove-cloud-card-header">
                <h3>🌐 TẠO LINK RIÊNG BIỆT CHO TỪNG KHÁCH HÀNG</h3>
                <span class="dlove-badge-shop" style="background:#27ae60;">Bán đồng thời nhiều khách</span>
              </div>
              <p style="font-size:12.5px; color:var(--ed-text-muted); margin-bottom:14px; line-height:1.4;">
                Mỗi khách hàng sẽ có một link riêng biệt (VD: <code style="color:#ff85a2;">?id=lan-anh</code>). Bạn có thể bán cho hàng chục khách cùng lúc mà <b>không bao giờ bị trùng lặp hay đè dữ liệu</b>!
              </p>

              <div class="dlove-form-grid-2 dlove-form-grid">
                <div class="dlove-form-group">
                  <label class="dlove-label">
                    <span>Mã khách hàng / Tên link (Slug)</span>
                    <button type="button" id="btn-random-slug" style="background:none; border:none; color:var(--ed-accent); cursor:pointer; font-size:11.5px;">🎲 Tạo ngẫu nhiên</button>
                  </label>
                  <input type="text" id="cfg-customer-slug" class="dlove-input" placeholder="VD: lan-anh, thao-vy, 2010">
                </div>

                <div class="dlove-form-group">
                  <label class="dlove-label">
                    <span>GitHub Personal Token (Shop Token)</span>
                    <a href="https://github.com/settings/tokens/new?scopes=repo&description=DLove%20Publisher" target="_blank" style="color:var(--ed-accent); font-size:11px; text-decoration:none;">🔑 Tạo Token (1 lần)</a>
                  </label>
                  <input type="password" id="cfg-github-token" class="dlove-input" placeholder="gho_...">
                  <span class="dlove-hint" style="display:block; margin-top:4px;">Token lưu trên máy của bạn để tự động tạo link vào GitHub Pages.</span>
                </div>
              </div>

              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
                <button type="button" class="dlove-btn dlove-btn-primary" id="btn-publish-customer-link" style="padding:10px 22px; font-size:13.5px;">
                  🚀 Đăng tải & Tạo Link Riêng Cho Khách
                </button>
              </div>

              <!-- Hộp kết quả link sau khi tạo -->
              <div class="dlove-link-result-box" id="customer-link-result" style="display:none;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:13px; font-weight:700; color:#2ecc71;">🎉 Đã tạo link thành công cho khách!</span>
                </div>
                <div class="dlove-link-url-row">
                  <input type="text" id="customer-link-url" class="dlove-link-input" readonly>
                  <button type="button" class="dlove-btn dlove-btn-primary" id="btn-copy-customer-link" style="padding:8px 14px; font-size:12px;">
                    📋 Sao chép
                  </button>
                  <a href="" target="_blank" id="btn-open-customer-link" class="dlove-btn dlove-btn-outline" style="padding:8px 14px; font-size:12px;">
                    👁️ Mở link
                  </a>
                </div>
                <div id="customer-qr-box" style="margin-top:8px; display:flex; align-items:center; gap:14px;">
                  <img id="customer-qr-img" src="" alt="QR Code" style="width:84px; height:84px; border-radius:8px; background:#fff; padding:4px;">
                  <div style="font-size:12px; color:var(--ed-text-muted);">
                    <b style="color:#fff;">Mã QR gửi khách:</b><br>
                    Khách có thể dùng camera điện thoại hoặc Zalo để quét mã và mở quà trực tiếp!
                  </div>
                </div>
              </div>

              <!-- Lịch sử các link khách hàng đã tạo -->
              <div style="margin-top:18px;">
                <h4 style="font-size:13px; color:#fff; margin-bottom:8px;">📋 Danh sách link khách hàng đã tạo:</h4>
                <div class="dlove-orders-list" id="customer-orders-list"></div>
              </div>
            </div>

            <!-- 2. XUẤT FILE HTML GỬI KHÁCH -->
            <div class="dlove-delivery-card">
              <div>
                <h3>📥 Xuất file HTML gửi cho khách (Khuyên dùng)</h3>
                <p>Tải về 1 file <b>index.html</b> duy nhất chứa toàn bộ chữ, ảnh, cấu hình đã lưu. Thanh công cụ chỉnh sửa sẽ tự động được ẩn đi để khách hàng mở ra là có ngay một món quà hoàn hảo!</p>
              </div>
              <button type="button" class="dlove-btn dlove-btn-success" id="btn-export-html" style="white-space:nowrap;">
                ⬇️ Tải file gửi khách
              </button>
            </div>

            <!-- 3. LƯU & NẠP FILE JSON -->
            <div class="dlove-delivery-card">
              <div>
                <h3>💾 Lưu cấu hình đơn hàng (File .json)</h3>
                <p>Lưu lại toàn bộ dữ liệu của khách hàng này để khi khách cần sửa hay làm mẫu tương tự, bạn chỉ cần nạp lại file trong 1 giây!</p>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="dlove-btn dlove-btn-outline" id="btn-save-json" style="white-space:nowrap;">
                  💾 Lưu file JSON
                </button>
                <label class="dlove-btn dlove-btn-outline" style="white-space:nowrap; cursor:pointer;">
                  📂 Nạp file JSON
                  <input type="file" id="input-load-json" accept=".json" style="display:none;">
                </label>
              </div>
            </div>

            <!-- 4. KHÔI PHỤC GỐC -->
            <div class="dlove-delivery-card">
              <div>
                <h3>🔄 Khôi phục về mẫu gốc ban đầu</h3>
                <p>Xoá sạch các tuỳ chỉnh tạm thời và đưa toàn bộ nội dung, ảnh về mẫu chuẩn.</p>
              </div>
              <button type="button" class="dlove-btn dlove-btn-outline" id="btn-reset-all" style="color:#ff85a2; border-color:#ff85a2;">
                ⚠️ Khôi phục gốc
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="dlove-modal-footer">
          <div style="display:flex; gap:8px;">
            <button type="button" class="dlove-btn dlove-btn-outline" id="btn-apply-save">
              💾 Lưu cấu hình
            </button>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="dlove-btn dlove-btn-primary" id="btn-live-preview">
              👁️ Xem trước toàn bộ quà tặng
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
  }

  // Khởi tạo các sự kiện và đồng bộ dữ liệu vào Form
  function bindEditorEvents() {
    const triggerBtn = document.getElementById('dlove-editor-trigger');
    const backdrop = document.getElementById('dlove-modal-backdrop');
    const closeBtn = document.getElementById('dlove-btn-close');

    // Mở / Đóng modal
    if (triggerBtn && backdrop) {
      triggerBtn.addEventListener('click', () => {
        syncConfigToUI();
        backdrop.classList.add('is-open');
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          backdrop.classList.remove('is-open');
        });
      }

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('is-open');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && backdrop.classList.contains('is-open')) {
          backdrop.classList.remove('is-open');
        }
        if (e.key === 'F2') {
          backdrop.classList.toggle('is-open');
          if (backdrop.classList.contains('is-open')) syncConfigToUI();
        }
      });
    }

    // Chuyển Tab
    const rootScope = backdrop || document;
    const tabBtns = rootScope.querySelectorAll('.dlove-tab-btn');
    const tabPanes = rootScope.querySelectorAll('.dlove-tab-pane');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Chọn Preset nhanh
    const presetChips = rootScope.querySelectorAll('.dlove-preset-chip');
    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.getAttribute('data-preset');
        if (PRESETS[key]) {
          applyPreset(PRESETS[key]);
          showToast(`✨ Đã áp dụng mẫu: <b>${chip.textContent.trim()}</b>`);
        }
      });
    });

    // Inputs Text & Checkbox two-way binding
    bindInputs();

    // Upload Ảnh hạt 3D (Particle Image)
    const particleInput = document.getElementById('input-particle-file');
    if (particleInput) {
      particleInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          showToast('⏳ Đang tối ưu hoá ảnh hạt...');
          const base64 = await compressImageFile(file, 500, 0.85);
          currentConfig.particleImage = base64;
          document.getElementById('preview-particle-img').src = base64;
          saveCurrentConfig();
          showToast('✅ Đã cập nhật ảnh hạt 3D thành công!');
        } catch (err) {
          alert('Không thể đọc file ảnh: ' + err.message);
        }
      });
    }

    const resetParticleBtn = document.getElementById('btn-reset-particle');
    if (resetParticleBtn) {
      resetParticleBtn.addEventListener('click', () => {
        currentConfig.particleImage = DEFAULT_CONFIG.particleImage;
        document.getElementById('preview-particle-img').src = DEFAULT_CONFIG.particleImage;
        saveCurrentConfig();
        showToast('🔄 Đã khôi phục ảnh hạt mẫu!');
      });
    }

    // Nút Thêm ảnh từ thanh công cụ (Toolbar)
    const sphereAddInput = document.getElementById('input-sphere-add');
    if (sphereAddInput) {
      sphereAddInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        showToast(`⏳ Đang thêm ${files.length} ảnh mới...`);
        try {
          for (const file of files) {
            const base64 = await compressImageFile(file, 600, 0.82);
            currentConfig.sphereImages.push(base64);
          }
          saveCurrentConfig();
          renderSphereGrid();
          showToast(`🎉 Đã thêm ${files.length} ảnh! Hiện có ${currentConfig.sphereImages.length} ảnh.`);
        } catch (err) {
          alert('Lỗi thêm ảnh: ' + err.message);
        }
      });
    }

    // Nút Khôi phục 12 ảnh mẫu
    const resetSphereDefaultBtn = document.getElementById('btn-reset-sphere-default');
    if (resetSphereDefaultBtn) {
      resetSphereDefaultBtn.addEventListener('click', () => {
        currentConfig.sphereImages = [...DEFAULT_CONFIG.sphereImages];
        saveCurrentConfig();
        renderSphereGrid();
        showToast('🔄 Đã khôi phục 12 ảnh kỷ niệm mẫu!');
      });
    }

    // Nút Xoá tất cả ảnh
    const clearSphereBtn = document.getElementById('btn-clear-sphere');
    if (clearSphereBtn) {
      clearSphereBtn.addEventListener('click', () => {
        if (confirm('Bạn có muốn xoá tất cả ảnh trong quả cầu để tải ảnh mới không?')) {
          currentConfig.sphereImages = [];
          saveCurrentConfig();
          renderSphereGrid();
          showToast('🗑️ Đã xoá toàn bộ ảnh. Hãy bấm "Thêm ảnh mới" để nạp ảnh khách!');
        }
      });
    }

    // Upload Ảnh trong thư (Letter Image)
    const letterInput = document.getElementById('input-letter-file');
    if (letterInput) {
      letterInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          showToast('⏳ Đang tối ưu ảnh trong thư...');
          const base64 = await compressImageFile(file, 640, 0.85);
          currentConfig.letter.image = base64;
          document.getElementById('preview-letter-img').src = base64;
          saveCurrentConfig();
          showToast('✅ Đã cập nhật ảnh trong thư thành công!');
        } catch (err) {
          alert('Lỗi tải ảnh: ' + err.message);
        }
      });
    }

    // Nhạc nền selector
    const musicSelect = document.getElementById('cfg-bgMusic-select');
    const musicFileInput = document.getElementById('input-music-file');
    const musicUrlInput = document.getElementById('cfg-bgMusic-url');
    const musicFileGroup = document.getElementById('group-custom-music-file');
    const musicUrlGroup = document.getElementById('group-custom-music-url');

    if (musicSelect) {
      musicSelect.addEventListener('change', () => {
        const val = musicSelect.value;
        musicFileGroup.style.display = val === 'custom-file' ? 'block' : 'none';
        musicUrlGroup.style.display = val === 'custom-url' ? 'block' : 'none';
        if (val !== 'custom-file' && val !== 'custom-url') {
          currentConfig.bgMusic = val;
          saveCurrentConfig();
        }
      });
    }

    if (musicFileInput) {
      musicFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          alert('File nhạc quá lớn (>10MB). Bạn nên chọn file MP3 dưới 5MB để tải nhanh.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentConfig.bgMusic = evt.target.result;
          saveCurrentConfig();
          showToast('✅ Đã nạp file nhạc MP3 tùy chọn!');
        };
        reader.readAsDataURL(file);
      });
    }

    if (musicUrlInput) {
      musicUrlInput.addEventListener('input', () => {
        currentConfig.bgMusic = musicUrlInput.value.trim();
        saveCurrentConfig();
      });
    }

    const volumeRange = document.getElementById('cfg-bgVolume');
    const volumeLabel = document.getElementById('val-bgVolume');
    if (volumeRange) {
      volumeRange.addEventListener('input', () => {
        const vol = parseFloat(volumeRange.value);
        currentConfig.bgVolume = vol;
        if (volumeLabel) volumeLabel.textContent = `${Math.round(vol * 100)}%`;
        saveCurrentConfig();
      });
    }

    // Các nút xem thử từng cảnh (Scene Previews)
    const scenePreviewBtns = (backdrop || document).querySelectorAll('.dlove-btn-preview-scene');
    scenePreviewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const scene = btn.getAttribute('data-scene');
        saveCurrentConfig();
        window.location.href = `index.html?preview=1&scene=${scene}`;
      });
    });

    // Cloud Publisher events
    const randomSlugBtn = document.getElementById('btn-random-slug');
    if (randomSlugBtn) {
      randomSlugBtn.addEventListener('click', () => {
        const rand = 'khach-' + Math.random().toString(36).substring(2, 7);
        const slugInput = document.getElementById('cfg-customer-slug');
        if (slugInput) slugInput.value = rand;
      });
    }

    const publishLinkBtn = document.getElementById('btn-publish-customer-link');
    if (publishLinkBtn) {
      publishLinkBtn.addEventListener('click', () => {
        publishCustomerCard();
      });
    }

    const copyCustomerLinkBtn = document.getElementById('btn-copy-customer-link');
    if (copyCustomerLinkBtn) {
      copyCustomerLinkBtn.addEventListener('click', () => {
        const urlInput = document.getElementById('customer-link-url');
        if (urlInput && urlInput.value) {
          navigator.clipboard.writeText(urlInput.value);
          showToast('📋 Đã sao chép link gửi khách thành công!');
        }
      });
    }

    // Nút Lưu cấu hình
    const saveBtn = document.getElementById('btn-apply-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveCurrentConfig();
        showToast('💾 Đã lưu cấu hình thành công!');
      });
    }

    // Nút Live Preview toàn bộ
    const livePreviewBtn = document.getElementById('btn-live-preview');
    if (livePreviewBtn) {
      livePreviewBtn.addEventListener('click', () => {
        saveCurrentConfig();
        window.location.href = 'index.html';
      });
    }

    // Nút Xuất file HTML gửi khách
    const exportHtmlBtn = document.getElementById('btn-export-html');
    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', () => {
        exportCustomerHTML();
      });
    }

    // Nút Lưu file JSON
    const saveJsonBtn = document.getElementById('btn-save-json');
    if (saveJsonBtn) {
      saveJsonBtn.addEventListener('click', () => {
        exportConfigFileJSON();
      });
    }

    // Nút Nạp file JSON
    const loadJsonInput = document.getElementById('input-load-json');
    if (loadJsonInput) {
      loadJsonInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const imported = JSON.parse(evt.target.result);
            currentConfig = Object.assign({}, DEFAULT_CONFIG, imported);
            saveCurrentConfig();
            syncConfigToUI();
            showToast('✅ Đã nạp file cấu hình thành công!');
          } catch (err) {
            alert('File JSON không hợp lệ: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Nút Khôi phục toàn bộ mặc định
    const resetAllBtn = document.getElementById('btn-reset-all');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ nội dung và ảnh về mặc định ban đầu không?')) {
          localStorage.removeItem('DLOVE_CUSTOM_CONFIG');
          currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
          syncConfigToUI();
          showToast('🔄 Đã đặt lại cấu hình mặc định!');
        }
      });
    }
  }

  // Gắn sự kiện các input thông thường
  function bindInputs() {
    const textFields = [
      { id: 'cfg-appTitle', prop: 'appTitle' },
      { id: 'cfg-passcode', prop: 'passcode' },
      { id: 'cfg-passcodeTitle', prop: 'passcodeTitle' },
      { id: 'cfg-passcodeSubtitle', prop: 'passcodeSubtitle' },
      { id: 'cfg-letterText', path: 'letter.text' },
      { id: 'cfg-letterCaption', path: 'letter.caption' }
    ];

    textFields.forEach(({ id, prop, path }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        if (path) {
          const parts = path.split('.');
          currentConfig[parts[0]][parts[1]] = el.value;
        } else {
          currentConfig[prop] = el.value;
        }
        saveCurrentConfig();
      });
    });

    // Morph Texts (3 dòng)
    [0, 1, 2].forEach(i => {
      const el = document.getElementById(`cfg-morphText-${i}`);
      if (!el) return;
      el.addEventListener('input', () => {
        if (!currentConfig.morphTexts) currentConfig.morphTexts = [];
        currentConfig.morphTexts[i] = el.value;
        saveCurrentConfig();
      });
    });

    // Switch toggles
    const switches = [
      'cfg-enableMorphEffect',
      'cfg-enableSphere',
      'cfg-enableSphereFlyingImages',
      'cfg-enableLetter',
      'cfg-enablePasscode'
    ];

    switches.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const prop = id.replace('cfg-', '');
        currentConfig[prop] = el.checked;
        saveCurrentConfig();
      });
    });
  }

  // Đồng bộ cấu hình hiện hành lên giao diện Form
  function syncConfigToUI() {
    loadConfig();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    const setChecked = (id, bool) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!bool;
    };

    setVal('cfg-appTitle', currentConfig.appTitle);
    setChecked('cfg-enableMorphEffect', currentConfig.enableMorphEffect !== false);
    setChecked('cfg-enableSphere', currentConfig.enableSphere !== false);
    setChecked('cfg-enableSphereFlyingImages', currentConfig.enableSphereFlyingImages !== false);
    setChecked('cfg-enableLetter', currentConfig.enableLetter !== false);
    setChecked('cfg-enablePasscode', !!currentConfig.enablePasscode);

    if (currentConfig.morphTexts) {
      setVal('cfg-morphText-0', currentConfig.morphTexts[0] || '');
      setVal('cfg-morphText-1', currentConfig.morphTexts[1] || '');
      setVal('cfg-morphText-2', currentConfig.morphTexts[2] || '');
    }

    setVal('cfg-passcode', currentConfig.passcode || '');
    setVal('cfg-passcodeTitle', currentConfig.passcodeTitle || '');
    setVal('cfg-passcodeSubtitle', currentConfig.passcodeSubtitle || '');

    if (currentConfig.letter) {
      setVal('cfg-letterText', currentConfig.letter.text || '');
      setVal('cfg-letterCaption', currentConfig.letter.caption || '');
      const letterImg = document.getElementById('preview-letter-img');
      if (letterImg) letterImg.src = currentConfig.letter.image || 'assets/uploads/letter_img.webp';
    }

    const particleImg = document.getElementById('preview-particle-img');
    if (particleImg) particleImg.src = currentConfig.particleImage || 'assets/uploads/particle.webp';

    // GitHub Token input prefill
    const tokenInput = document.getElementById('cfg-github-token');
    if (tokenInput) {
      tokenInput.value = localStorage.getItem('DLOVE_GITHUB_TOKEN') || DEFAULT_GITHUB_TOKEN;
    }

    renderSphereGrid();
    renderOrdersHistory();

    // Volume & Music
    const volumeRange = document.getElementById('cfg-bgVolume');
    const volumeLabel = document.getElementById('val-bgVolume');
    if (volumeRange) {
      const vol = typeof currentConfig.bgVolume === 'number' ? currentConfig.bgVolume : 0.55;
      volumeRange.value = vol;
      if (volumeLabel) volumeLabel.textContent = `${Math.round(vol * 100)}%`;
    }
  }

  // Render lưới ảnh quả cầu (hỗ trợ thêm / xoá linh hoạt bất kỳ số lượng ảnh nào)
  function renderSphereGrid() {
    const grid = document.getElementById('dlove-sphere-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const images = currentConfig.sphereImages || [];

    // Cập nhật huy hiệu đếm số lượng ảnh
    const countBadges = document.querySelectorAll('#sphere-count-badge, .sphere-count-badge');
    countBadges.forEach(badge => {
      badge.textContent = `${images.length} ảnh`;
    });

    // Render từng ảnh trong danh sách
    images.forEach((imgSrc, i) => {
      const item = document.createElement('div');
      item.className = 'dlove-sphere-item';
      item.innerHTML = `
        <span class="dlove-sphere-badge">Ảnh #${i + 1}</span>
        <button type="button" class="dlove-sphere-del-btn" title="Xoá ảnh #${i + 1}" data-index="${i}">&times;</button>
        <img class="dlove-sphere-thumb" src="${imgSrc}" alt="Ảnh ${i + 1}">
        <label class="dlove-sphere-upload-btn">
          Đổi ảnh
          <input type="file" accept="image/*" class="input-sphere-single" data-index="${i}" style="display:none;">
        </label>
      `;

      // Sự kiện xoá ảnh
      const delBtn = item.querySelector('.dlove-sphere-del-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentConfig.sphereImages.length <= 1) {
          alert('Quả cầu cần giữ ít nhất 1 ảnh!');
          return;
        }
        currentConfig.sphereImages.splice(i, 1);
        saveCurrentConfig();
        renderSphereGrid();
        showToast(`🗑️ Đã xoá ảnh #${i + 1}! Hiện còn ${currentConfig.sphereImages.length} ảnh.`);
      });

      // Sự kiện thay thế ảnh
      const input = item.querySelector('.input-sphere-single');
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          showToast(`⏳ Đang tối ưu ảnh #${i + 1}...`);
          const base64 = await compressImageFile(file, 600, 0.82);
          currentConfig.sphereImages[i] = base64;
          saveCurrentConfig();
          item.querySelector('.dlove-sphere-thumb').src = base64;
          showToast(`✅ Đã thay ảnh #${i + 1} thành công!`);
        } catch (err) {
          alert('Lỗi tải ảnh: ' + err.message);
        }
      });

      grid.appendChild(item);
    });

    // Thẻ "➕ Thêm ảnh mới" ở cuối lưới
    const addItem = document.createElement('label');
    addItem.className = 'dlove-sphere-add-item';
    addItem.innerHTML = `
      <span style="font-size:26px; line-height:1;">➕</span>
      <span style="font-size:12px; font-weight:600; color:var(--ed-accent);">Thêm ảnh mới</span>
      <input type="file" accept="image/*" multiple id="input-sphere-add-grid" style="display:none;">
    `;
    const addInput = addItem.querySelector('#input-sphere-add-grid');
    addInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      showToast(`⏳ Đang xử lý ${files.length} ảnh mới...`);
      try {
        for (const file of files) {
          const base64 = await compressImageFile(file, 600, 0.82);
          currentConfig.sphereImages.push(base64);
        }
        saveCurrentConfig();
        renderSphereGrid();
        showToast(`🎉 Đã thêm ${files.length} ảnh! Tổng cộng hiện có: ${currentConfig.sphereImages.length} ảnh.`);
      } catch (err) {
        alert('Lỗi thêm ảnh: ' + err.message);
      }
    });
    grid.appendChild(addItem);
  }

  // Áp dụng Preset
  function applyPreset(preset) {
    if (preset.appTitle) currentConfig.appTitle = preset.appTitle;
    if (preset.morphTexts) currentConfig.morphTexts = [...preset.morphTexts];
    if (preset.letter) {
      currentConfig.letter.text = preset.letter.text;
      if (preset.letter.caption) currentConfig.letter.caption = preset.letter.caption;
    }
    saveCurrentConfig();
    syncConfigToUI();
  }

  // Xuất file cấu hình JSON
  function exportConfigFileJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
    const dlAnchor = document.createElement('a');
    const safeTitle = (currentConfig.appTitle || 'dlove_config').replace(/[^a-zA-Z0-9_-]/g, '_');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${safeTitle}.json`);
    dlAnchor.click();
    showToast('💾 Đã tải xuống file cấu hình JSON!');
  }

  // Xuất file HTML hoàn chỉnh gửi cho khách (Đã nhúng config & ẩn Editor UI)
  async function exportCustomerHTML() {
    showToast('⏳ Đang đóng gói file quà tặng gửi khách...');
    try {
      const resp = await fetch('index.html');
      let html = await resp.text();

      const customerConfig = JSON.parse(JSON.stringify(currentConfig));
      customerConfig.enableWebsiteInfo = true;

      const configJsonStr = JSON.stringify(customerConfig, null, 4);
      const configRegex = /window\.DEFAULT_APP_CONFIG\s*=\s*\{[\s\S]*?\};/;
      if (configRegex.test(html)) {
        html = html.replace(configRegex, `window.DEFAULT_APP_CONFIG = ${configJsonStr};`);
      } else {
        html = html.replace('window.APP_CONFIG = window.DEFAULT_APP_CONFIG;', `window.DEFAULT_APP_CONFIG = ${configJsonStr};\nwindow.APP_CONFIG = window.DEFAULT_APP_CONFIG;`);
      }

      html = html.replace(/<!-- EDITOR_INJECT_START -->[\s\S]*?<!-- EDITOR_INJECT_END -->/g, '');
      html = html.replace(/<link rel="stylesheet" href="assets\/editor\.css">/g, '');
      html = html.replace(/<script src="assets\/editor\.js"><\/script>/g, '');

      if (customerConfig.appTitle) {
        html = html.replace(/<title>.*?<\/title>/, `<title>${customerConfig.appTitle}</title>`);
      }

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (customerConfig.appTitle || 'QuaTang_3D').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
      a.href = url;
      a.download = `${safeName}.html`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);

      showToast('🎉 Đã xuất thành công file HTML gửi khách hàng!');
    } catch (err) {
      console.error('Lỗi xuất HTML:', err);
      alert('Không thể xuất file: ' + err.message);
    }
  }

  // Khởi động khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
  } else {
    initEditor();
  }

  function initEditor() {
    loadConfig();
    createModalDOM();
    bindEditorEvents();
    syncConfigToUI();
  }

  // Export các hàm ra window nếu cần dùng bên ngoài
  window.DLoveEditor = {
    getConfig: () => currentConfig,
    saveConfig: saveCurrentConfig,
    applyPreset,
    exportCustomerHTML,
    exportConfigFileJSON,
    publishCustomerCard,
    loadCustomerFromCloud,
    renderSphereGrid,
    showToast,
    syncConfigToUI
  };

})();
