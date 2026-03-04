// ========================================
// ベビーシッター比較サイト - アプリケーションロジック
// ========================================

(function () {
  'use strict';

  // --- 状態管理 ---
  let selectedServices = new Set();
  let activeTags = new Set();
  let filteredServices = [...SITTER_SERVICES];

  // --- DOM要素 ---
  const servicesGrid = document.getElementById('servicesGrid');
  const resultsCount = document.getElementById('resultsCount');
  const compareBtn = document.getElementById('compareBtn');
  const compareCount = document.getElementById('compareCount');
  const compareModal = document.getElementById('compareModal');
  const compareTable = document.getElementById('compareTable');
  const detailModal = document.getElementById('detailModal');
  const detailTitle = document.getElementById('detailTitle');
  const detailBody = document.getElementById('detailBody');
  const availableCount = document.getElementById('availableCount');

  // フィルター要素
  const filterArea = document.getElementById('filterArea');
  const filterPrice = document.getElementById('filterPrice');
  const filterAvailability = document.getElementById('filterAvailability');
  const sortBy = document.getElementById('sortBy');

  // ヒーロー検索要素
  const heroArea = document.getElementById('heroArea');
  const heroDate = document.getElementById('heroDate');
  const heroSearchBtn = document.getElementById('heroSearchBtn');

  // --- 初期化 ---
  function init() {
    renderServices(SITTER_SERVICES);
    updateAvailableCount();
    bindEvents();
  }

  // --- イベントバインド ---
  function bindEvents() {
    // フィルター変更
    filterArea.addEventListener('change', applyFilters);
    filterPrice.addEventListener('change', applyFilters);
    filterAvailability.addEventListener('change', applyFilters);
    sortBy.addEventListener('change', applyFilters);

    // タグフィルター
    document.querySelectorAll('.tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const tagValue = tag.dataset.tag;
        if (activeTags.has(tagValue)) {
          activeTags.delete(tagValue);
          tag.classList.remove('active');
        } else {
          activeTags.add(tagValue);
          tag.classList.add('active');
        }
        applyFilters();
      });
    });

    // ヒーロー検索ボタン
    heroSearchBtn.addEventListener('click', () => {
      const area = heroArea.value;
      const date = heroDate.value;

      // フィルターセクションに値を反映
      filterArea.value = area;
      filterAvailability.value = date === 'now' ? 'now' : date === 'today' ? 'today' : date === 'tomorrow' ? 'tomorrow' : '';

      // 検索セクションへスクロール
      document.getElementById('search').scrollIntoView({ behavior: 'smooth' });
      applyFilters();
    });

    // 比較ボタン
    compareBtn.addEventListener('click', showCompareModal);

    // モーダル閉じる
    document.getElementById('modalClose').addEventListener('click', () => {
      compareModal.classList.remove('active');
    });
    document.getElementById('detailModalClose').addEventListener('click', () => {
      detailModal.classList.remove('active');
    });

    // オーバーレイクリックで閉じる
    compareModal.addEventListener('click', (e) => {
      if (e.target === compareModal) compareModal.classList.remove('active');
    });
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.classList.remove('active');
    });

    // Escapeキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        compareModal.classList.remove('active');
        detailModal.classList.remove('active');
      }
    });

    // 公式サイトボタン（イベントデリゲーション）
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-official');
      if (btn) {
        e.preventDefault();
        showToast(btn.dataset.name);
      }
    });
  }

  // --- 今すぐ対応可能な数を更新 ---
  function updateAvailableCount() {
    const total = SITTER_SERVICES.reduce((sum, s) => sum + s.availableNow, 0);
    availableCount.textContent = total;
  }

  // --- フィルター適用 ---
  function applyFilters() {
    const area = filterArea.value;
    const maxPrice = filterPrice.value ? parseInt(filterPrice.value) : null;
    const availability = filterAvailability.value;
    const sort = sortBy.value;

    let results = SITTER_SERVICES.filter(service => {
      // エリアフィルター
      if (area && !service.areas.includes(area)) return false;

      // 料金フィルター
      if (maxPrice && service.pricePerHour > maxPrice) return false;

      // 空き状況フィルター
      if (availability === 'now' && service.availableNow === 0) return false;
      if (availability === 'today' && service.availableToday === 0) return false;
      if (availability === 'tomorrow' && service.availableTomorrow === 0) return false;

      // タグフィルター
      if (activeTags.size > 0) {
        const hasAllTags = [...activeTags].every(tag => service.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      return true;
    });

    // ソート
    results.sort((a, b) => {
      switch (sort) {
        case 'rating':
          return b.rating - a.rating;
        case 'price-low':
          return a.pricePerHour - b.pricePerHour;
        case 'price-high':
          return b.pricePerHour - a.pricePerHour;
        case 'available':
          return b.availableNow - a.availableNow;
        default:
          return 0;
      }
    });

    filteredServices = results;
    renderServices(results);
  }

  // --- サービスカード描画 ---
  function renderServices(services) {
    resultsCount.textContent = services.length;

    if (services.length === 0) {
      servicesGrid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
          <span class="no-results-icon">&#x1F50D;</span>
          <p>条件に合うサービスが見つかりませんでした。</p>
          <p style="font-size: 0.85rem; margin-top: 8px;">フィルター条件を変更してお試しください。</p>
        </div>
      `;
      return;
    }

    servicesGrid.innerHTML = services.map(service => createServiceCard(service)).join('');

    // カードのイベントバインド
    servicesGrid.querySelectorAll('.compare-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const card = e.target.closest('.service-card');
        if (e.target.checked) {
          if (selectedServices.size >= 4) {
            e.target.checked = false;
            alert('比較できるサービスは最大4つまでです。');
            return;
          }
          selectedServices.add(id);
          card.classList.add('selected');
        } else {
          selectedServices.delete(id);
          card.classList.remove('selected');
        }
        updateCompareBtn();
      });
    });

    servicesGrid.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        showDetailModal(id);
      });
    });

  }

  // --- サービスカードHTML生成 ---
  function createServiceCard(service) {
    const stars = getStars(service.rating);
    const isChecked = selectedServices.has(service.id) ? 'checked' : '';
    const isSelected = selectedServices.has(service.id) ? 'selected' : '';

    return `
      <div class="service-card ${isSelected}">
        <div class="card-compare-check">
          <input type="checkbox" class="compare-checkbox" data-id="${service.id}" ${isChecked} title="比較に追加">
        </div>
        <div class="card-header">
          <div class="card-logo" style="background: ${service.logoColor}">${service.logo}</div>
          <div class="card-title-area">
            <div class="card-name">${service.name}</div>
            <div class="card-desc">${service.description}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-rating">
            <span class="stars">${stars}</span>
            <span class="rating-number">${service.rating}</span>
            <span class="review-count">(${service.reviewCount}件)</span>
          </div>
          <div class="card-info-grid">
            <div class="card-info-item">
              <span class="label">料金（1時間）</span>
              <span class="value price-value">&yen;${service.pricePerHour.toLocaleString()}</span>
            </div>
            <div class="card-info-item">
              <span class="label">最低利用時間</span>
              <span class="value">${service.minimumHours}時間〜</span>
            </div>
            <div class="card-info-item">
              <span class="label">対象年齢</span>
              <span class="value">${service.ageRange}</span>
            </div>
            <div class="card-info-item">
              <span class="label">対応時間</span>
              <span class="value">${service.operatingHours}</span>
            </div>
          </div>
          <div class="card-availability">
            <span class="avail-badge avail-now"><span class="avail-dot"></span> 今すぐ ${service.availableNow}名</span>
            <span class="avail-badge avail-today">今日 ${service.availableToday}名</span>
            <span class="avail-badge avail-tomorrow">明日 ${service.availableTomorrow}名</span>
          </div>
          <div class="card-tags">
            ${service.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-detail btn-sm" data-id="${service.id}">詳細を見る</button>
          <a href="service.html#${service.id}" class="btn btn-primary btn-sm">公式サイトへ</a>
        </div>
      </div>
    `;
  }

  // --- 星評価生成 ---
  function getStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '\u2605'.repeat(full) + (half ? '\u2606' : '') + '\u2606'.repeat(empty - (half ? 0 : 0));
  }

  // --- 比較ボタン更新 ---
  function updateCompareBtn() {
    const count = selectedServices.size;
    compareCount.textContent = count;
    compareBtn.disabled = count < 2;
  }

  // --- 比較モーダル表示 ---
  function showCompareModal() {
    const services = SITTER_SERVICES.filter(s => selectedServices.has(s.id));
    if (services.length < 2) return;

    // 各行の最安値・最高評価を見つける
    const minPrice = Math.min(...services.map(s => s.pricePerHour));
    const maxRating = Math.max(...services.map(s => s.rating));
    const maxAvail = Math.max(...services.map(s => s.availableNow));

    const headerRow = `
      <tr>
        <th></th>
        ${services.map(s => `
          <td class="compare-header-cell">
            <div class="compare-logo-sm" style="background: ${s.logoColor}">${s.logo}</div>
            <div>${s.name}</div>
          </td>
        `).join('')}
      </tr>
    `;

    const rows = [
      {
        label: '評価',
        cells: services.map(s => `<td class="${s.rating === maxRating ? 'compare-highlight' : ''}">${getStars(s.rating)} ${s.rating} (${s.reviewCount}件)</td>`)
      },
      {
        label: '料金/時間',
        cells: services.map(s => `<td class="${s.pricePerHour === minPrice ? 'compare-highlight' : ''}">&yen;${s.pricePerHour.toLocaleString()}</td>`)
      },
      {
        label: '最低利用',
        cells: services.map(s => `<td>${s.minimumHours}時間〜</td>`)
      },
      {
        label: '入会金',
        cells: services.map(s => `<td>${s.registrationFee === 0 ? '<strong style="color:#00B894">無料</strong>' : '&yen;' + s.registrationFee.toLocaleString()}</td>`)
      },
      {
        label: '年会費',
        cells: services.map(s => `<td>${s.annualFee === 0 ? '<strong style="color:#00B894">無料</strong>' : '&yen;' + s.annualFee.toLocaleString()}</td>`)
      },
      {
        label: '対象年齢',
        cells: services.map(s => `<td>${s.ageRange}</td>`)
      },
      {
        label: '今すぐ空き',
        cells: services.map(s => `<td class="${s.availableNow === maxAvail ? 'compare-highlight' : ''}">${s.availableNow}名</td>`)
      },
      {
        label: '対応時間',
        cells: services.map(s => `<td>${s.operatingHours}</td>`)
      },
      {
        label: 'キャンセル',
        cells: services.map(s => `<td>${s.cancellationPolicy}</td>`)
      },
      {
        label: '対応エリア',
        cells: services.map(s => `<td style="font-size:0.78rem">${s.areas.join('、')}</td>`)
      },
      {
        label: '特徴',
        cells: services.map(s => `<td>${s.tags.map(t => `<span class="card-tag" style="margin:2px">${t}</span>`).join('')}</td>`)
      },
      {
        label: '保険',
        cells: services.map(s => `<td style="font-size:0.78rem">${s.insurance}</td>`)
      }
    ];

    compareTable.innerHTML = headerRow + rows.map(row => `
      <tr>
        <th>${row.label}</th>
        ${row.cells.join('')}
      </tr>
    `).join('');

    compareModal.classList.add('active');
  }

  // --- 詳細モーダル表示 ---
  function showDetailModal(id) {
    const service = SITTER_SERVICES.find(s => s.id === id);
    if (!service) return;

    detailTitle.textContent = service.name;

    detailBody.innerHTML = `
      <div class="detail-header">
        <div class="detail-logo" style="background: ${service.logoColor}">${service.logo}</div>
        <div class="detail-info">
          <h3>${service.name}</h3>
          <p>${service.description}</p>
        </div>
      </div>

      <div class="detail-section">
        <h4>&#x1F4B0; 料金情報</h4>
        <div class="detail-grid">
          <div class="detail-grid-item">
            <span class="label">時間単価</span>
            <span class="value" style="color: var(--primary-dark); font-size: 1.1rem; font-weight: 700">&yen;${service.pricePerHour.toLocaleString()}/時間</span>
          </div>
          <div class="detail-grid-item">
            <span class="label">最低利用時間</span>
            <span class="value">${service.minimumHours}時間〜</span>
          </div>
          <div class="detail-grid-item">
            <span class="label">入会金</span>
            <span class="value">${service.registrationFee === 0 ? '無料' : '&yen;' + service.registrationFee.toLocaleString()}</span>
          </div>
          <div class="detail-grid-item">
            <span class="label">年会費</span>
            <span class="value">${service.annualFee === 0 ? '無料' : '&yen;' + service.annualFee.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>&#x1F552; 空き状況</h4>
        <div class="detail-avail-row">
          <div class="detail-avail-item">
            <span class="num">${service.availableNow}</span>
            <span class="lbl">今すぐ対応可</span>
          </div>
          <div class="detail-avail-item">
            <span class="num">${service.availableToday}</span>
            <span class="lbl">今日対応可</span>
          </div>
          <div class="detail-avail-item">
            <span class="num">${service.availableTomorrow}</span>
            <span class="lbl">明日対応可</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>&#x2728; サービスの特徴</h4>
        <ul class="detail-features">
          ${service.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>

      <div class="detail-section">
        <h4>&#x1F4CB; 基本情報</h4>
        <div class="detail-grid">
          <div class="detail-grid-item">
            <span class="label">対象年齢</span>
            <span class="value">${service.ageRange}</span>
          </div>
          <div class="detail-grid-item">
            <span class="label">対応時間</span>
            <span class="value">${service.operatingHours}</span>
          </div>
          <div class="detail-grid-item">
            <span class="label">キャンセルポリシー</span>
            <span class="value">${service.cancellationPolicy}</span>
          </div>
          <div class="detail-grid-item">
            <span class="label">保険</span>
            <span class="value">${service.insurance}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>&#x1F4CD; 対応エリア</h4>
        <div class="card-tags" style="margin-top: 8px;">
          ${service.areas.map(a => `<span class="card-tag">${a}</span>`).join('')}
        </div>
      </div>

      <div class="detail-section">
        <div class="card-rating" style="justify-content: center; margin-top: 8px;">
          <span class="stars" style="font-size: 1.2rem">${getStars(service.rating)}</span>
          <span class="rating-number" style="font-size: 1.2rem">${service.rating}</span>
          <span class="review-count">(${service.reviewCount}件の口コミ)</span>
        </div>
      </div>

      <div class="detail-cta">
        <a href="service.html#${service.id}" class="btn btn-primary" style="text-decoration:none">公式サイトで予約する</a>
      </div>
    `;

    detailModal.classList.add('active');
  }

  // --- トースト通知 ---
  window.showToast = showToast;
  function showToast(serviceName) {
    // 既存のトーストがあれば削除
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon">&#x1F4E2;</div>
      <div class="toast-text">
        <strong>${serviceName}</strong>の公式サイトへ遷移します。<br>
        <span style="font-size:0.8rem;color:#636E72">※ デモサイトのため、実際のページは用意されていません。</span>
      </div>
    `;
    document.body.appendChild(toast);

    // アニメーション表示
    requestAnimationFrame(() => toast.classList.add('show'));

    // 3秒後に自動非表示
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- スムーズスクロール ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // --- 起動 ---
  init();
})();
