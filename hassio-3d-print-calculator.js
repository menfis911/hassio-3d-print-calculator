class ThreeDPrintCalculator extends HTMLElement {
  constructor() {
    super();

    this.storageKey = "ha-3d-print-calculator-v2";

    this.defaults = {
      materials: [
        { id: "pla", name: "PLA", spoolWeight: 1000, price: 2200, stockGrams: 0, stockSpools: 0 },
        { id: "pla-plus", name: "PLA+", spoolWeight: 1000, price: 2500, stockGrams: 0, stockSpools: 0 },
        { id: "petg", name: "PETG", spoolWeight: 1000, price: 2400, stockGrams: 0, stockSpools: 0 },
        { id: "abs", name: "ABS", spoolWeight: 1000, price: 2600, stockGrams: 0, stockSpools: 0 },
        { id: "asa", name: "ASA", spoolWeight: 1000, price: 3200, stockGrams: 0, stockSpools: 0 },
        { id: "tpu-95a", name: "TPU 95A", spoolWeight: 1000, price: 3300, stockGrams: 0, stockSpools: 0 },
        { id: "tpu-85a", name: "TPU 85A", spoolWeight: 1000, price: 3500, stockGrams: 0, stockSpools: 0 },
        { id: "pa", name: "PA", spoolWeight: 1000, price: 4200, stockGrams: 0, stockSpools: 0 },
        { id: "pa-cf", name: "PA-CF", spoolWeight: 1000, price: 5500, stockGrams: 0, stockSpools: 0 },
        { id: "pet-cf", name: "PET-CF", spoolWeight: 1000, price: 5000, stockGrams: 0, stockSpools: 0 },
        { id: "pc", name: "PC", spoolWeight: 1000, price: 4500, stockGrams: 0, stockSpools: 0 }
      ],

      printers: [
        {
          id: "x1c",
          name: "Bambu Lab X1C",
          electricity: 2,
          depreciation: 50,
          consumables: 10
        }
      ],

      settings: {
        markup: 70,
        waste: 5,
        rounding: 50,

        pricingProfiles: [
          { id: "retail", name: "Розница", markup: 70 },
          { id: "wholesale", name: "Опт", markup: 40 },
          { id: "regular", name: "Постоянный клиент", markup: 30 },
          { id: "urgent", name: "Срочный заказ", markup: 100 }
        ],

        commercial: {
          retailMarkup: 70,
          regularDiscount: 15,
          urgentMarkup: 30,
          minimumOrder: 500,

          wholesaleTiers: [
            { minQuantity: 2, maxQuantity: 4, discount: 5 },
            { minQuantity: 5, maxQuantity: 9, discount: 10 },
            { minQuantity: 10, maxQuantity: 49, discount: 20 },
            { minQuantity: 50, maxQuantity: null, discount: 30 }
          ]
        }
      },

      calculator: {
        materialId: "tpu-95a",
        printerId: "x1c",

        weight: 106,
        hours: 2,
        minutes: 11,
        quantity: 1,

        packaging: 0,
        postProcessing: 0,
        labor: 0,

        customerType: "retail",
        urgent: false
      }
    };

    this.data = this.loadData();
    this.activeTab = "calculator";
    this._copyStatusTimer = null;
  }

  connectedCallback() {
    this.render();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(this.storageKey);

      if (!saved) {
        return structuredClone(this.defaults);
      }

      const parsed = JSON.parse(saved);

      const data = {
        ...structuredClone(this.defaults),
        ...parsed,

        settings: {
          ...this.defaults.settings,
          ...(parsed.settings || {})
        },

        calculator: {
          ...this.defaults.calculator,
          ...(parsed.calculator || {})
        },

        materials: Array.isArray(parsed.materials)
          ? parsed.materials
          : structuredClone(this.defaults.materials),

        printers: Array.isArray(parsed.printers)
          ? parsed.printers
          : structuredClone(this.defaults.printers)
      };

      data.materials = data.materials.map((m) => ({
        stockGrams: 0,
        stockSpools: 0,
        ...m
      }));

      if (!Array.isArray(data.settings.pricingProfiles)) {
        data.settings.pricingProfiles =
          structuredClone(this.defaults.settings.pricingProfiles);
      }

      data.settings.commercial = {
        ...structuredClone(this.defaults.settings.commercial),
        ...(data.settings.commercial || {})
      };

      if (!Array.isArray(data.settings.commercial.wholesaleTiers)) {
        data.settings.commercial.wholesaleTiers =
          structuredClone(this.defaults.settings.commercial.wholesaleTiers);
      }

      if (!["retail", "regular", "wholesale"].includes(data.calculator.customerType)) {
        data.calculator.customerType = "retail";
      }

      data.calculator.urgent = Boolean(data.calculator.urgent);

      return data;
    } catch (error) {
      console.error("3D Calculator: load error", error);
      return structuredClone(this.defaults);
    }
  }

  saveData() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  money(value) {
    return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
  }

  moneyExact(value) {
    return `${Number(value || 0).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ₽`;
  }

  showCopyStatus(text) {
    const el = this.querySelector("#copy-status");

    if (!el) return;

    el.textContent = text;
    el.style.opacity = "1";

    clearTimeout(this._copyStatusTimer);

    this._copyStatusTimer = setTimeout(() => {
      el.textContent = "";
      el.style.opacity = "0";
    }, 2500);
  }

  async copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        this.showCopyStatus("✓ Скопировано");
        return true;
      }
    } catch (error) {
      console.warn("Clipboard API failed:", error);
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const success = document.execCommand("copy");
      textarea.remove();

      if (success) {
        this.showCopyStatus("✓ Скопировано");
        return true;
      }
    } catch (error) {
      console.warn("Fallback clipboard failed:", error);
    }

    this.showCopyStatus("⚠️ Не удалось скопировать");
    return false;
  }

  number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  getMaterial() {
    return this.data.materials.find((m) => m.id === this.data.calculator.materialId) || this.data.materials[0];
  }

  getPrinter() {
    return this.data.printers.find((p) => p.id === this.data.calculator.printerId) || this.data.printers[0];
  }

  getWholesaleDiscount(quantity) {
    const tiers = this.data.settings.commercial.wholesaleTiers || [];

    const tier = tiers.find((t) => {
      const min = this.number(t.minQuantity);
      const max = t.maxQuantity === null || t.maxQuantity === "" || typeof t.maxQuantity === "undefined"
        ? Infinity
        : this.number(t.maxQuantity);
      return quantity >= min && quantity <= max;
    });

    return tier ? Math.max(0, this.number(tier.discount)) : 0;
  }

  getCustomerTypeName() {
    const type = this.data.calculator.customerType;
    if (type === "wholesale") return "Опт";
    if (type === "regular") return "Постоянный клиент";
    return "Розница";
  }

  calculate() {
    const material = this.getMaterial();
    const printer = this.getPrinter();
    const c = this.data.calculator;
    const s = this.data.settings;
    const commercial = s.commercial;

    const weight = Math.max(0, this.number(c.weight));
    const quantity = Math.max(1, Math.round(this.number(c.quantity, 1)));
    const hours = Math.max(0, this.number(c.hours));
    const minutes = Math.max(0, Math.min(59, this.number(c.minutes)));
    const packaging = Math.max(0, this.number(c.packaging));
    const postProcessing = Math.max(0, this.number(c.postProcessing));
    const labor = Math.max(0, this.number(c.labor));
    const totalHours = hours + minutes / 60;

    const wastePercent = Math.max(0, this.number(s.waste));
    const effectiveWeightPerUnit = weight * (1 + wastePercent / 100);
    const totalEffectiveWeight = effectiveWeightPerUnit * quantity;

    const pricePerGram = material && material.spoolWeight > 0 ? material.price / material.spoolWeight : 0;
    const materialCost = totalEffectiveWeight * pricePerGram;

    const machineHourlyCost = this.number(printer?.electricity) + this.number(printer?.depreciation) + this.number(printer?.consumables);
    const machineCost = totalHours * machineHourlyCost * quantity;
    const packagingCost = packaging * quantity;
    const postProcessingCost = postProcessing * quantity;
    const laborCost = labor * quantity;
    const cost = materialCost + machineCost + packagingCost + postProcessingCost + laborCost;

    const retailMarkup = Math.max(0, this.number(commercial.retailMarkup, s.markup));
    const retailBasePrice = cost * (1 + retailMarkup / 100);

    let discount = 0;
    let discountLabel = "";
    let customerPriceBeforeUrgent = retailBasePrice;

    if (c.customerType === "regular") {
      discount = Math.max(0, this.number(commercial.regularDiscount));
      customerPriceBeforeUrgent = retailBasePrice * (1 - discount / 100);
      discountLabel = `Постоянный клиент −${discount}%`;
    }

    if (c.customerType === "wholesale") {
      discount = this.getWholesaleDiscount(quantity);
      customerPriceBeforeUrgent = retailBasePrice * (1 - discount / 100);
      discountLabel = discount > 0 ? `Оптовая скидка −${discount}%` : "Оптовая скидка не применяется";
    }

    const discountAmount = retailBasePrice - customerPriceBeforeUrgent;
    const urgentMarkup = c.urgent ? Math.max(0, this.number(commercial.urgentMarkup)) : 0;
    const urgentCost = customerPriceBeforeUrgent * (urgentMarkup / 100);
    const priceBeforeMinimum = customerPriceBeforeUrgent + urgentCost;

    const minimumOrder = Math.max(0, this.number(commercial.minimumOrder));
    let salePrice = Math.max(minimumOrder, priceBeforeMinimum);
    const rounding = Math.max(0, this.number(s.rounding));

    if (rounding > 0) {
      salePrice = Math.ceil(salePrice / rounding) * rounding;
    }

    const salePricePerUnit = quantity > 0 ? salePrice / quantity : salePrice;
    const costPerUnit = quantity > 0 ? cost / quantity : cost;
    const profit = salePrice - cost;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    const minimumApplied = priceBeforeMinimum < minimumOrder;

    return {
      material,
      printer,
      totalHours,
      weight,
      quantity,
      effectiveWeightPerUnit,
      totalEffectiveWeight,
      pricePerGram,
      materialCost,
      machineCost,
      packagingCost,
      postProcessingCost,
      laborCost,
      cost,
      costPerUnit,
      retailMarkup,
      retailBasePrice,
      customerType: this.getCustomerTypeName(),
      discount,
      discountLabel,
      discountAmount,
      urgentMarkup,
      urgentCost,
      priceBeforeMinimum,
      minimumOrder,
      minimumApplied,
      salePrice,
      salePricePerUnit,
      profit,
      margin
    };
  }

  render() {
    const result = this.calculate();

    this.innerHTML = `
      <style>
        :host { display:block; height:100%; box-sizing:border-box; color:var(--primary-text-color); background:var(--primary-background-color); font-family:var(--paper-font-body1_-_font-family, Arial, sans-serif); }
        * { box-sizing:border-box; }
        .page { max-width:1250px; margin:0 auto; padding:28px; }
        .header { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:24px; }
        .title { font-size:30px; font-weight:700; }
        .subtitle { color:var(--secondary-text-color); margin-top:5px; }
        .tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
        button { border:0; border-radius:10px; padding:11px 16px; cursor:pointer; background:var(--secondary-background-color); color:var(--primary-text-color); font-size:14px; }
        button:hover { filter:brightness(1.08); }
        button.primary { background:var(--primary-color); color:var(--text-primary-color, white); }
        button.danger { color:var(--error-color); }
        button.active { background:var(--primary-color); color:white; }
        button.secondary { background:var(--primary-background-color); border:1px solid var(--divider-color); }
        .grid { display:grid; grid-template-columns:1.3fr 0.7fr; gap:20px; }
        .card { background:var(--card-background-color, var(--secondary-background-color)); border-radius:16px; padding:22px; box-shadow:var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,.12)); margin-bottom:20px; }
        .card h2 { margin:0 0 18px; font-size:20px; }
        .form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
        .field { display:flex; flex-direction:column; gap:7px; }
        .field.full { grid-column:1/-1; }
        label { font-size:13px; color:var(--secondary-text-color); }
        input, select { width:100%; border:1px solid var(--divider-color); border-radius:9px; padding:11px 12px; background:var(--primary-background-color); color:var(--primary-text-color); font-size:15px; outline:none; }
        input:focus, select:focus { border-color:var(--primary-color); }
        .result { position:sticky; top:20px; }
        .result-main { text-align:center; padding:15px 0 25px; }
        .result-label { color:var(--secondary-text-color); font-size:14px; }
        .result-price { font-size:42px; font-weight:800; margin-top:8px; }
        .result-row { display:flex; justify-content:space-between; gap:15px; padding:11px 0; border-bottom:1px solid var(--divider-color); }
        .result-row:last-child { border-bottom:0; }
        .result-row span:first-child { color:var(--secondary-text-color); }
        .profit { font-weight:700; }
        .hint { color:var(--secondary-text-color); font-size:13px; line-height:1.5; }
        .actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:18px; }
        table { width:100%; border-collapse:collapse; }
        th,td { padding:12px 10px; text-align:left; border-bottom:1px solid var(--divider-color); }
        th { color:var(--secondary-text-color); font-size:13px; font-weight:500; }
        td { font-size:14px; }
        .table-actions { display:flex; gap:6px; }
        .small-button { padding:7px 10px; border-radius:8px; font-size:13px; }
        .empty { padding:30px; text-align:center; color:var(--secondary-text-color); }
        .section-title { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:18px; }
        .section-title h2 { margin:0; }
        .material-editor { margin-top:22px; padding-top:22px; border-top:1px solid var(--divider-color); }
        .price-per-gram { padding:11px 12px; border-radius:9px; background:var(--primary-background-color); color:var(--secondary-text-color); font-size:14px; }
        .info-box { padding:15px; border-radius:10px; background:var(--primary-background-color); line-height:1.6; margin-bottom:15px; }
        .storage-status { font-size:13px; color:var(--secondary-text-color); }
        .stock-good { font-weight:700; }
        .stock-empty { color:var(--error-color); font-weight:700; }
        .summary-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .summary-box { padding:15px; border-radius:12px; background:var(--primary-background-color); }
        .summary-label { font-size:12px; color:var(--secondary-text-color); margin-bottom:5px; }
        .summary-value { font-size:20px; font-weight:700; }
        .big-success { font-size:26px; font-weight:800; }
        .profile-list { display:grid; gap:12px; }
        .profile-item { display:grid; grid-template-columns:1fr 130px 90px; gap:10px; align-items:center; padding:12px; border-radius:10px; background:var(--primary-background-color); }
        .choice-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        .choice { position:relative; }
        .choice input { position:absolute; opacity:0; pointer-events:none; }
        .choice label { display:block; cursor:pointer; padding:14px; border:1px solid var(--divider-color); border-radius:12px; background:var(--primary-background-color); color:var(--primary-text-color); font-size:14px; transition:.15s; }
        .choice label strong { display:block; font-size:15px; margin-bottom:4px; }
        .choice label span { display:block; color:var(--secondary-text-color); font-size:12px; }
        .choice input:checked + label { border-color:var(--primary-color); box-shadow:0 0 0 1px var(--primary-color); }
        .urgent-choice { display:flex; align-items:center; gap:10px; padding:14px; margin-top:12px; border:1px solid var(--divider-color); border-radius:12px; cursor:pointer; background:var(--primary-background-color); }
        .urgent-choice input { width:auto; }
        .price-breakdown { margin-top:18px; padding-top:18px; border-top:1px solid var(--divider-color); }
        .commercial-highlight { padding:15px; border-radius:12px; background:var(--primary-background-color); margin-top:15px; }
        .commercial-highlight b { font-size:17px; }
        .notice { padding:10px 12px; border-radius:9px; background:var(--primary-background-color); color:var(--secondary-text-color); font-size:13px; margin-top:10px; }
        @media (max-width:800px) {
          .page { padding:16px; }
          .grid { grid-template-columns:1fr; }
          .result { position:static; }
          .form-grid { grid-template-columns:1fr; }
          .field.full { grid-column:auto; }
          .header { align-items:flex-start; flex-direction:column; }
          .result-price { font-size:36px; }
          table { display:block; overflow-x:auto; }
          .summary-grid { grid-template-columns:1fr; }
          .profile-item { grid-template-columns:1fr; }
          .choice-grid { grid-template-columns:1fr; }
        }
      </style>

      <div class="page">
        <div class="header">
          <div>
            <div class="title">3D Калькулятор</div>
            <div class="subtitle">Себестоимость, цена продажи и склад материалов</div>
          </div>
          <div class="storage-status">💾 Сохраняется автоматически</div>
        </div>

        <div class="tabs">
          <button class="${this.activeTab === "calculator" ? "active" : ""}" data-tab="calculator">🧮 Калькулятор</button>
          <button class="${this.activeTab === "materials" ? "active" : ""}" data-tab="materials">🧵 Материалы</button>
          <button class="${this.activeTab === "printers" ? "active" : ""}" data-tab="printers">🖨 Принтеры</button>
          <button class="${this.activeTab === "settings" ? "active" : ""}" data-tab="settings">⚙️ Настройки</button>
        </div>

        <div id="content"></div>
      </div>
    `;

    this.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        this.activeTab = button.dataset.tab;
        this.render();
      });
    });

    const content = this.querySelector("#content");

    if (this.activeTab === "calculator") {
      content.innerHTML = this.renderCalculator(result);
      this.bindCalculator();
    }

    if (this.activeTab === "materials") {
      content.innerHTML = this.renderMaterials();
      this.bindMaterials();
    }

    if (this.activeTab === "printers") {
      content.innerHTML = this.renderPrinters();
      this.bindPrinters();
    }

    if (this.activeTab === "settings") {
      content.innerHTML = this.renderSettings();
      this.bindSettings();
    }
  }

  renderCalculator(result) {
    const c = this.data.calculator;

    return `
      <div class="grid">
        <div>
          <div class="card">
            <div class="section-title">
              <h2>Параметры заказа</h2>
              <button class="secondary" id="new-calculation">🗑 Новый расчёт</button>
            </div>

            <div class="form-grid">
              <div class="field">
                <label>Материал</label>
                <select id="calc-material">
                  ${this.data.materials.map((m) => `
                    <option value="${m.id}" ${m.id === c.materialId ? "selected" : ""}>${this.escape(m.name)}</option>
                  `).join("")}
                </select>
              </div>

              <div class="field">
                <label>Принтер</label>
                <select id="calc-printer">
                  ${this.data.printers.map((p) => `
                    <option value="${p.id}" ${p.id === c.printerId ? "selected" : ""}>${this.escape(p.name)}</option>
                  `).join("")}
                </select>
              </div>

              <div class="field"><label>Вес одного изделия, г</label><input id="calc-weight" type="number" min="0" step="0.1" value="${c.weight}"></div>
              <div class="field"><label>Количество изделий</label><input id="calc-quantity" type="number" min="1" step="1" value="${c.quantity}"></div>
              <div class="field"><label>Часы печати одного изделия</label><input id="calc-hours" type="number" min="0" step="1" value="${c.hours}"></div>
              <div class="field"><label>Минуты печати одного изделия</label><input id="calc-minutes" type="number" min="0" max="59" step="1" value="${c.minutes}"></div>
              <div class="field"><label>Упаковка, ₽ / изделие</label><input id="calc-packaging" type="number" min="0" step="1" value="${c.packaging}"></div>
              <div class="field"><label>Постобработка, ₽ / изделие</label><input id="calc-post-processing" type="number" min="0" step="1" value="${c.postProcessing}"></div>
              <div class="field"><label>Труд, ₽ / изделие</label><input id="calc-labor" type="number" min="0" step="1" value="${c.labor}"></div>
            </div>

            <div style="margin-top:22px">
              <label>Тип клиента</label>
              <div class="choice-grid">
                <div class="choice">
                  <input type="radio" name="customer-type" id="customer-retail" value="retail" ${c.customerType === "retail" ? "checked" : ""}>
                  <label for="customer-retail"><strong>🛒 Розница</strong><span>Базовая наценка ${this.data.settings.commercial.retailMarkup}%</span></label>
                </div>
                <div class="choice">
                  <input type="radio" name="customer-type" id="customer-regular" value="regular" ${c.customerType === "regular" ? "checked" : ""}>
                  <label for="customer-regular"><strong>⭐ Постоянный клиент</strong><span>Скидка ${this.data.settings.commercial.regularDiscount}%</span></label>
                </div>
                <div class="choice">
                  <input type="radio" name="customer-type" id="customer-wholesale" value="wholesale" ${c.customerType === "wholesale" ? "checked" : ""}>
                  <label for="customer-wholesale"><strong>📦 Опт</strong><span>Скидка зависит от количества</span></label>
                </div>
              </div>

              <label class="urgent-choice">
                <input type="checkbox" id="calc-urgent" ${c.urgent ? "checked" : ""}>
                <span><b>⚡ Срочный заказ</b><br><span class="muted">Надбавка ${this.data.settings.commercial.urgentMarkup}%</span></span>
              </label>
            </div>
          </div>

          <div class="card">
            <h2>Состав себестоимости</h2>
            <div class="summary-grid">
              <div class="summary-box"><div class="summary-label">Материал</div><div class="summary-value">${this.money(result.materialCost)}</div></div>
              <div class="summary-box"><div class="summary-label">Принтер и эксплуатация</div><div class="summary-value">${this.money(result.machineCost)}</div></div>
              <div class="summary-box"><div class="summary-label">Упаковка</div><div class="summary-value">${this.money(result.packagingCost)}</div></div>
              <div class="summary-box"><div class="summary-label">Постобработка</div><div class="summary-value">${this.money(result.postProcessingCost)}</div></div>
              <div class="summary-box"><div class="summary-label">Труд</div><div class="summary-value">${this.money(result.laborCost)}</div></div>
              <div class="summary-box"><div class="summary-label">Себестоимость одного изделия</div><div class="summary-value">${this.money(result.costPerUnit)}</div></div>
            </div>

            <div class="info-box" style="margin-top:18px">
              <b>Материал:</b> ${this.escape(result.material.name)}<br>
              <b>Расход с отходами:</b> ${result.totalEffectiveWeight.toFixed(1)} г<br>
              <b>Цена материала:</b> ${this.moneyExact(result.pricePerGram)}/г<br>
              <b>Тип клиента:</b> ${result.customerType}
              ${result.customerType === "wholesale" && result.discount > 0 ? `<br><b>Оптовая скидка:</b> ${result.discount}%` : ""}
              ${c.urgent ? `<br><b>Срочность:</b> +${result.urgentMarkup}%` : ""}
            </div>
          </div>
        </div>

        <div class="card result">
          <div class="result-main">
            <div class="result-label">Цена продажи за весь заказ</div>
            <div class="result-price">${this.money(result.salePrice)}</div>
            <div class="muted">${this.money(result.salePricePerUnit)} за изделие</div>
          </div>

          <div class="result-row"><span>Себестоимость</span><b>${this.money(result.cost)}</b></div>
          <div class="result-row"><span>Розничная базовая цена</span><b>${this.money(result.retailBasePrice)}</b></div>
          ${result.discount > 0 ? `<div class="result-row"><span>${result.discountLabel}</span><b>−${this.money(result.discountAmount)}</b></div>` : ""}
          ${c.urgent ? `<div class="result-row"><span>⚡ Срочность +${result.urgentMarkup}%</span><b>+${this.money(result.urgentCost)}</b></div>` : ""}
          ${result.minimumApplied ? `<div class="result-row"><span>Минимальный заказ</span><b>${this.money(result.minimumOrder)}</b></div>` : ""}
          <div class="result-row"><span>Прибыль</span><b class="profit">${this.money(result.profit)}</b></div>
          <div class="result-row"><span>Маржа</span><b>${result.margin.toFixed(1)}%</b></div>
          <div class="result-row"><span>Клиент</span><b>${result.customerType}</b></div>
          <div class="result-row"><span>Время печати</span><b>${result.totalHours.toFixed(2)} ч</b></div>
          <div class="result-row"><span>Материал</span><b>${result.totalEffectiveWeight.toFixed(1)} г</b></div>
          <div class="result-row"><span>Количество</span><b>${result.quantity} шт.</b></div>

          <div class="commercial-highlight"><div class="muted">Цена для клиента</div><b>${this.money(result.salePrice)}</b></div>

          <div class="actions">
            <button class="primary" id="copy-price">📋 Скопировать расчёт</button>
            <button id="copy-client-price">📄 Цена клиенту</button>
            <button id="consume-material">📦 Списать материал</button>
          </div>

          <div id="copy-status" class="notice" aria-live="polite" style="min-height:38px;opacity:0;transition:opacity .2s;"></div>
        </div>
      </div>
    `;
  }

  renderMaterials() {
    return `
      <div class="card">
        <div class="section-title">
          <h2>Материалы и склад</h2>
          <button class="primary" id="add-material">➕ Добавить материал</button>
        </div>
        <div class="hint">Цена катушки используется для расчёта себестоимости. Остаток хранится отдельно и изменяется при списании материала.</div><br>
        ${this.data.materials.length ? `
          <table>
            <thead><tr><th>Материал</th><th>Катушка</th><th>Цена</th><th>Цена/г</th><th>Остаток</th><th></th></tr></thead>
            <tbody>
              ${this.data.materials.map((m) => {
                const pricePerGram = m.spoolWeight > 0 ? m.price / m.spoolWeight : 0;
                const stock = this.number(m.stockGrams);
                return `
                  <tr>
                    <td><b>${this.escape(m.name)}</b></td>
                    <td>${m.spoolWeight} г</td>
                    <td>${this.money(m.price)}</td>
                    <td>${this.moneyExact(pricePerGram)}/г</td>
                    <td><div class="${stock > 0 ? "stock-good" : "stock-empty"}">${stock.toFixed(1)} г</div><div class="muted">${this.number(m.stockSpools)} кат.</div></td>
                    <td><div class="table-actions"><button class="small-button" data-stock-material="${m.id}">📦</button><button class="small-button" data-edit-material="${m.id}">✏️</button><button class="small-button danger" data-delete-material="${m.id}">🗑</button></div></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        ` : `<div class="empty">Материалов пока нет</div>`}
        <div id="material-editor"></div>
      </div>
    `;
  }

  renderMaterialEditor(material = null) {
    const isEdit = Boolean(material);
    return `
      <div class="material-editor">
        <h2>${isEdit ? "Редактирование материала" : "Новый материал"}</h2>
        <div class="form-grid">
          <div class="field full"><label>Название материала</label><input id="material-name" type="text" placeholder="Например: TPU 95A" value="${material ? this.escape(material.name) : ""}"></div>
          <div class="field"><label>Вес катушки, г</label><input id="material-weight" type="number" min="1" step="1" value="${material ? material.spoolWeight : 1000}"></div>
          <div class="field"><label>Цена катушки, ₽</label><input id="material-price" type="number" min="0" step="1" value="${material ? material.price : 0}"></div>
          <div class="field full"><label>Цена материала</label><div class="price-per-gram" id="material-price-per-gram">—</div></div>
        </div>
        <div class="actions"><button class="primary" id="save-material" data-material-id="${material ? material.id : ""}">💾 ${isEdit ? "Сохранить изменения" : "Добавить материал"}</button><button id="cancel-material">Отмена</button></div>
      </div>
    `;
  }

  renderStockEditor(material) {
    return `
      <div class="material-editor">
        <h2>Склад: ${this.escape(material.name)}</h2>
        <div class="info-box">Текущий остаток: <b>${this.number(material.stockGrams).toFixed(1)} г</b><br>Катушек: <b>${this.number(material.stockSpools)}</b></div>
        <div class="form-grid">
          <div class="field"><label>Добавить материала, г</label><input id="stock-add-grams" type="number" min="0" step="1" value="0"></div>
          <div class="field"><label>Добавить катушек</label><input id="stock-add-spools" type="number" min="0" step="1" value="0"></div>
          <div class="field"><label>Установить остаток, г</label><input id="stock-set-grams" type="number" min="0" step="1" placeholder="Не изменять"></div>
          <div class="field"><label>Установить катушки</label><input id="stock-set-spools" type="number" min="0" step="1" placeholder="Не изменять"></div>
        </div>
        <div class="actions"><button class="primary" id="save-stock" data-material-id="${material.id}">💾 Сохранить склад</button><button id="cancel-stock">Отмена</button></div>
      </div>
    `;
  }

  bindMaterials() {
    this.querySelector("#add-material")?.addEventListener("click", () => {
      const editor = this.querySelector("#material-editor");
      editor.innerHTML = this.renderMaterialEditor();
      this.bindMaterialEditor();
    });

    this.querySelectorAll("[data-edit-material]").forEach((button) => {
      button.addEventListener("click", () => {
        const material = this.data.materials.find((m) => m.id === button.dataset.editMaterial);
        if (!material) return;
        this.querySelector("#material-editor").innerHTML = this.renderMaterialEditor(material);
        this.bindMaterialEditor();
      });
    });

    this.querySelectorAll("[data-stock-material]").forEach((button) => {
      button.addEventListener("click", () => {
        const material = this.data.materials.find((m) => m.id === button.dataset.stockMaterial);
        if (!material) return;
        this.querySelector("#material-editor").innerHTML = this.renderStockEditor(material);
        this.bindStockEditor();
      });
    });

    this.querySelectorAll("[data-delete-material]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.deleteMaterial;
        const material = this.data.materials.find((m) => m.id === id);
        if (!material) return;
        if (!confirm(`Удалить материал "${material.name}"?`)) return;

        this.data.materials = this.data.materials.filter((m) => m.id !== id);
        if (this.data.calculator.materialId === id) {
          this.data.calculator.materialId = this.data.materials[0]?.id || "";
        }
        this.saveData();
        this.render();
      });
    });
  }

  bindStockEditor() {
    this.querySelector("#cancel-stock")?.addEventListener("click", () => this.render());

    this.querySelector("#save-stock")?.addEventListener("click", () => {
      const id = this.querySelector("#save-stock").dataset.materialId;
      const material = this.data.materials.find((m) => m.id === id);
      if (!material) return;

      const addGrams = this.number(this.querySelector("#stock-add-grams").value);
      const addSpools = this.number(this.querySelector("#stock-add-spools").value);
      const setGramsInput = this.querySelector("#stock-set-grams").value;
      const setSpoolsInput = this.querySelector("#stock-set-spools").value;

      if (setGramsInput !== "") {
        material.stockGrams = Math.max(0, this.number(setGramsInput));
      } else {
        material.stockGrams = Math.max(0, this.number(material.stockGrams) + addGrams);
      }

      if (setSpoolsInput !== "") {
        material.stockSpools = Math.max(0, this.number(setSpoolsInput));
      } else {
        material.stockSpools = Math.max(0, this.number(material.stockSpools) + addSpools);
      }

      this.saveData();
      this.render();
    });
  }

  bindMaterialEditor() {
    const name = this.querySelector("#material-name");
    const weight = this.querySelector("#material-weight");
    const price = this.querySelector("#material-price");
    const pricePerGram = this.querySelector("#material-price-per-gram");

    const updatePrice = () => {
      const w = this.number(weight.value);
      const p = this.number(price.value);
      pricePerGram.textContent = w > 0 ? `${(p / w).toFixed(2)} ₽/г` : "—";
    };

    weight.addEventListener("input", updatePrice);
    price.addEventListener("input", updatePrice);
    updatePrice();

    this.querySelector("#cancel-material")?.addEventListener("click", () => this.render());

    this.querySelector("#save-material")?.addEventListener("click", () => {
      const materialName = name.value.trim();
      const spoolWeight = this.number(weight.value);
      const spoolPrice = this.number(price.value);

      if (!materialName) { alert("Укажите название материала."); name.focus(); return; }
      if (spoolWeight <= 0) { alert("Вес катушки должен быть больше 0."); weight.focus(); return; }
      if (spoolPrice < 0) { alert("Цена катушки не может быть отрицательной."); price.focus(); return; }

      const id = this.querySelector("#save-material").dataset.materialId;

      if (id) {
        const material = this.data.materials.find((m) => m.id === id);
        if (material) {
          material.name = materialName;
          material.spoolWeight = spoolWeight;
          material.price = spoolPrice;
        }
      } else {
        this.data.materials.push({
          id: "material-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
          name: materialName,
          spoolWeight,
          price: spoolPrice,
          stockGrams: 0,
          stockSpools: 0
        });
      }

      this.saveData();
      this.render();
    });
  }

  renderPrinters() {
    return `
      <div class="card">
        <div class="section-title"><h2>Профили принтеров</h2><button class="primary" id="add-printer">➕ Добавить принтер</button></div>
        <div class="hint">Сейчас параметры эксплуатации задаются вручную. Автоматический расчёт электроэнергии и амортизации оставляем на следующий этап.</div><br>
        <table>
          <thead><tr><th>Принтер</th><th>Электричество ₽/ч</th><th>Амортизация ₽/ч</th><th>Расходники ₽/ч</th><th></th></tr></thead>
          <tbody>
            ${this.data.printers.map((p) => `
              <tr>
                <td><b>${this.escape(p.name)}</b></td><td>${p.electricity}</td><td>${p.depreciation}</td><td>${p.consumables}</td>
                <td><div class="table-actions"><button class="small-button" data-edit-printer="${p.id}">✏️</button><button class="small-button danger" data-delete-printer="${p.id}">🗑</button></div></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div id="printer-editor"></div>
      </div>
    `;
  }

  renderPrinterEditor(printer = null) {
    const isEdit = Boolean(printer);
    return `
      <div class="material-editor">
        <h2>${isEdit ? "Редактирование принтера" : "Новый принтер"}</h2>
        <div class="form-grid">
          <div class="field full"><label>Название принтера</label><input id="printer-name" type="text" placeholder="Например: Bambu Lab H2D" value="${printer ? this.escape(printer.name) : ""}"></div>
          <div class="field"><label>Электричество, ₽/ч</label><input id="printer-electricity" type="number" min="0" step="0.1" value="${printer ? printer.electricity : 2}"></div>
          <div class="field"><label>Амортизация, ₽/ч</label><input id="printer-depreciation" type="number" min="0" step="0.1" value="${printer ? printer.depreciation : 50}"></div>
          <div class="field"><label>Расходники, ₽/ч</label><input id="printer-consumables" type="number" min="0" step="0.1" value="${printer ? printer.consumables : 10}"></div>
        </div>
        <div class="actions"><button class="primary" id="save-printer" data-printer-id="${printer ? printer.id : ""}">💾 ${isEdit ? "Сохранить изменения" : "Добавить принтер"}</button><button id="cancel-printer">Отмена</button></div>
      </div>
    `;
  }

  bindPrinters() {
    this.querySelector("#add-printer")?.addEventListener("click", () => {
      this.querySelector("#printer-editor").innerHTML = this.renderPrinterEditor();
      this.bindPrinterEditor();
    });

    this.querySelectorAll("[data-edit-printer]").forEach((button) => {
      button.addEventListener("click", () => {
        const printer = this.data.printers.find((p) => p.id === button.dataset.editPrinter);
        if (!printer) return;
        this.querySelector("#printer-editor").innerHTML = this.renderPrinterEditor(printer);
        this.bindPrinterEditor();
      });
    });

    this.querySelectorAll("[data-delete-printer]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.deletePrinter;
        const printer = this.data.printers.find((p) => p.id === id);
        if (!printer) return;
        if (!confirm(`Удалить принтер "${printer.name}"?`)) return;
        if (this.data.printers.length <= 1) { alert("Нельзя удалить последний принтер."); return; }

        this.data.printers = this.data.printers.filter((p) => p.id !== id);
        if (this.data.calculator.printerId === id) this.data.calculator.printerId = this.data.printers[0].id;
        this.saveData();
        this.render();
      });
    });
  }

  bindPrinterEditor() {
    this.querySelector("#cancel-printer")?.addEventListener("click", () => this.render());

    this.querySelector("#save-printer")?.addEventListener("click", () => {
      const name = this.querySelector("#printer-name").value.trim();
      const electricity = this.number(this.querySelector("#printer-electricity").value);
      const depreciation = this.number(this.querySelector("#printer-depreciation").value);
      const consumables = this.number(this.querySelector("#printer-consumables").value);

      if (!name) { alert("Укажите название принтера."); return; }

      const id = this.querySelector("#save-printer").dataset.printerId;
      if (id) {
        const printer = this.data.printers.find((p) => p.id === id);
        if (printer) {
          printer.name = name;
          printer.electricity = electricity;
          printer.depreciation = depreciation;
          printer.consumables = consumables;
        }
      } else {
        this.data.printers.push({
          id: "printer-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
          name,
          electricity,
          depreciation,
          consumables
        });
      }

      this.saveData();
      this.render();
    });
  }

  renderSettings() {
    const s = this.data.settings;
    const c = s.commercial;
    const tiers = c.wholesaleTiers || [];

    return `
      <div class="card">
        <h2>Общие настройки расчёта</h2>
        <div class="form-grid">
          <div class="field"><label>Наценка по умолчанию, %</label><input id="setting-markup" type="number" min="0" step="1" value="${s.markup}"></div>
          <div class="field"><label>Отходы материала, %</label><input id="setting-waste" type="number" min="0" step="1" value="${s.waste}"></div>
          <div class="field">
            <label>Округление цены, ₽</label>
            <select id="setting-rounding">
              <option value="0" ${s.rounding === 0 ? "selected" : ""}>Без округления</option>
              <option value="10" ${s.rounding === 10 ? "selected" : ""}>До 10 ₽</option>
              <option value="50" ${s.rounding === 50 ? "selected" : ""}>До 50 ₽</option>
              <option value="100" ${s.rounding === 100 ? "selected" : ""}>До 100 ₽</option>
              <option value="500" ${s.rounding === 500 ? "selected" : ""}>До 500 ₽</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>💰 Коммерческое ценообразование</h2>
        <div class="hint">Эти параметры непосредственно влияют на цену для клиента.</div><br>
        <div class="form-grid">
          <div class="field"><label>Розница — базовая наценка, %</label><input id="commercial-retail" type="number" min="0" step="1" value="${c.retailMarkup}"></div>
          <div class="field"><label>Постоянный клиент — скидка, %</label><input id="commercial-regular" type="number" min="0" max="100" step="1" value="${c.regularDiscount}"></div>
          <div class="field"><label>Срочный заказ — надбавка, %</label><input id="commercial-urgent" type="number" min="0" step="1" value="${c.urgentMarkup}"></div>
          <div class="field"><label>Минимальная стоимость заказа, ₽</label><input id="commercial-minimum" type="number" min="0" step="50" value="${c.minimumOrder}"></div>
        </div>
      </div>

      <div class="card">
        <h2>📦 Оптовые скидки</h2>
        <div class="hint">Скидка автоматически определяется по количеству изделий в заказе.</div><br>
        <table>
          <thead><tr><th>От, шт.</th><th>До, шт.</th><th>Скидка, %</th></tr></thead>
          <tbody>
            ${tiers.map((tier, index) => `
              <tr>
                <td><input type="number" min="1" step="1" value="${tier.minQuantity}" data-tier-min="${index}"></td>
                <td><input type="number" min="1" step="1" value="${tier.maxQuantity === null ? "" : tier.maxQuantity}" placeholder="∞" data-tier-max="${index}"></td>
                <td><input type="number" min="0" max="100" step="1" value="${tier.discount}" data-tier-discount="${index}"></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="actions"><button class="primary" id="add-tier">➕ Добавить диапазон</button><button id="save-tiers">💾 Сохранить оптовые скидки</button></div>
      </div>

      <div class="card">
        <h2>Хранение данных</h2>
        <div class="info-box">Материалы, склад, принтеры, коммерческие настройки и текущий расчёт сохраняются в браузере этого устройства.<br><br>Ключ: <b>ha-3d-print-calculator-v2</b><br><br>Переход на V5 не удаляет данные V4.</div>
        <div class="actions"><button class="primary" id="export-data">📤 Экспорт JSON</button><button id="import-data">📥 Импорт JSON</button><button class="danger" id="reset-data">♻️ Сбросить всё</button></div>
        <input type="file" id="import-file" accept=".json,application/json" style="display:none">
      </div>
    `;
  }

  bindSettings() {
    const markup = this.querySelector("#setting-markup");
    const waste = this.querySelector("#setting-waste");
    const rounding = this.querySelector("#setting-rounding");
    const retail = this.querySelector("#commercial-retail");
    const regular = this.querySelector("#commercial-regular");
    const urgent = this.querySelector("#commercial-urgent");
    const minimum = this.querySelector("#commercial-minimum");

    const saveSettings = () => {
      this.data.settings.markup = Math.max(0, this.number(markup.value));
      this.data.settings.waste = Math.max(0, this.number(waste.value));
      this.data.settings.rounding = Math.max(0, this.number(rounding.value));
      this.data.settings.commercial.retailMarkup = Math.max(0, this.number(retail.value));
      this.data.settings.commercial.regularDiscount = Math.min(100, Math.max(0, this.number(regular.value)));
      this.data.settings.commercial.urgentMarkup = Math.max(0, this.number(urgent.value));
      this.data.settings.commercial.minimumOrder = Math.max(0, this.number(minimum.value));
      this.saveData();
    };

    markup.addEventListener("input", saveSettings);
    waste.addEventListener("input", saveSettings);
    rounding.addEventListener("change", saveSettings);
    retail.addEventListener("input", saveSettings);
    regular.addEventListener("input", saveSettings);
    urgent.addEventListener("input", saveSettings);
    minimum.addEventListener("input", saveSettings);

    this.querySelector("#add-tier")?.addEventListener("click", () => {
      this.data.settings.commercial.wholesaleTiers.push({ minQuantity: 100, maxQuantity: null, discount: 30 });
      this.saveData();
      this.render();
    });

    this.querySelector("#save-tiers")?.addEventListener("click", () => {
      const tiers = this.data.settings.commercial.wholesaleTiers;
      tiers.forEach((tier, index) => {
        const min = this.querySelector(`[data-tier-min="${index}"]`);
        const max = this.querySelector(`[data-tier-max="${index}"]`);
        const discount = this.querySelector(`[data-tier-discount="${index}"]`);
        tier.minQuantity = Math.max(1, Math.round(this.number(min.value, 1)));
        tier.maxQuantity = max.value === "" ? null : Math.max(tier.minQuantity, Math.round(this.number(max.value)));
        tier.discount = Math.min(100, Math.max(0, this.number(discount.value)));
      });
      this.saveData();
      this.render();
      alert("Оптовые скидки сохранены.");
    });

    this.querySelector("#export-data")?.addEventListener("click", () => {
      const json = JSON.stringify(this.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "3d-calculator-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    this.querySelector("#import-data")?.addEventListener("click", () => this.querySelector("#import-file").click());

    this.querySelector("#import-file")?.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        if (!Array.isArray(imported.materials) || !Array.isArray(imported.printers) || !imported.settings) {
          throw new Error("Некорректный файл.");
        }

        this.data = {
          ...structuredClone(this.defaults),
          ...imported,
          settings: { ...structuredClone(this.defaults.settings), ...(imported.settings || {}) },
          calculator: { ...structuredClone(this.defaults.calculator), ...(imported.calculator || {}) }
        };

        this.data.materials = this.data.materials.map((m) => ({ stockGrams: 0, stockSpools: 0, ...m }));
        this.data.settings.commercial = { ...structuredClone(this.defaults.settings.commercial), ...(this.data.settings.commercial || {}) };
        this.saveData();
        this.render();
        alert("Данные успешно импортированы.");
      } catch (error) {
        console.error(error);
        alert("Не удалось импортировать файл JSON.");
      }

      event.target.value = "";
    });

    this.querySelector("#reset-data")?.addEventListener("click", () => {
      if (!confirm("Сбросить ВСЕ материалы, склад, принтеры, коммерческие настройки и текущий расчёт к значениям по умолчанию?")) return;
      this.data = structuredClone(this.defaults);
      this.saveData();
      this.render();
    });
  }

  bindCalculator() {
    const fields = {
      materialId: this.querySelector("#calc-material"),
      printerId: this.querySelector("#calc-printer"),
      weight: this.querySelector("#calc-weight"),
      quantity: this.querySelector("#calc-quantity"),
      hours: this.querySelector("#calc-hours"),
      minutes: this.querySelector("#calc-minutes"),
      packaging: this.querySelector("#calc-packaging"),
      postProcessing: this.querySelector("#calc-post-processing"),
      labor: this.querySelector("#calc-labor")
    };

    Object.entries(fields).forEach(([key, element]) => {
      if (!element) return;
      const update = () => {
        this.data.calculator[key] = element.type === "number" ? this.number(element.value) : element.value;
        this.saveData();
        this.render();
      };
      element.addEventListener("input", update);
      element.addEventListener("change", update);
    });

    this.querySelectorAll('input[name="customer-type"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        this.data.calculator.customerType = radio.value;
        this.saveData();
        this.render();
      });
    });

    this.querySelector("#calc-urgent")?.addEventListener("change", (event) => {
      this.data.calculator.urgent = event.target.checked;
      this.saveData();
      this.render();
    });

    this.querySelector("#new-calculation")?.addEventListener("click", () => {
      if (!confirm("Очистить текущий расчёт?")) return;

      const materialId = this.data.materials.find((m) => m.id === "tpu-95a")?.id || this.data.materials[0]?.id || "";
      const printerId = this.data.printers.find((p) => p.id === "x1c")?.id || this.data.printers[0]?.id || "";

      this.data.calculator = {
        ...structuredClone(this.defaults.calculator),
        materialId,
        printerId,
        weight: 0,
        hours: 0,
        minutes: 0,
        quantity: 1,
        packaging: 0,
        postProcessing: 0,
        labor: 0,
        customerType: "retail",
        urgent: false
      };

      this.saveData();
      this.render();
    });

    this.querySelector("#consume-material")?.addEventListener("click", () => {
      const result = this.calculate();
      const material = result.material;
      const required = result.totalEffectiveWeight;
      const stock = this.number(material.stockGrams);

      if (required <= 0) { alert("Нечего списывать: расход материала равен 0 г."); return; }

      if (stock < required) {
        if (!confirm(`На складе только ${stock.toFixed(1)} г, а требуется ${required.toFixed(1)} г. Списать всё равно?`)) return;
      }

      material.stockGrams = Math.max(0, stock - required);
      this.saveData();
      this.render();
      alert(`Списано ${required.toFixed(1)} г материала "${material.name}".`);
    });

    this.querySelector("#copy-price")?.addEventListener("click", async () => {
      const r = this.calculate();
      const text = `Расчёт 3D-печати\n\nМатериал: ${r.material.name}\nПринтер: ${r.printer.name}\n\nТип клиента: ${r.customerType}\n${this.data.calculator.urgent ? `Срочный заказ: +${r.urgentMarkup}%` : ""}\n\nВес одного изделия: ${r.weight} г\nРасход с отходами: ${r.effectiveWeightPerUnit.toFixed(1)} г\nКоличество: ${r.quantity} шт.\n\nВремя одного изделия: ${this.data.calculator.hours} ч ${this.data.calculator.minutes} мин\nОбщее время: ${r.totalHours.toFixed(2)} ч\n\nМатериал: ${this.money(r.materialCost)}\nПринтер и эксплуатация: ${this.money(r.machineCost)}\nУпаковка: ${this.money(r.packagingCost)}\nПостобработка: ${this.money(r.postProcessingCost)}\nТруд: ${this.money(r.laborCost)}\n\nСебестоимость: ${this.money(r.cost)}\nРозничная базовая цена: ${this.money(r.retailBasePrice)}\n${r.discountLabel ? `${r.discountLabel}\n` : ""}${this.data.calculator.urgent ? `Срочность: +${this.money(r.urgentCost)}\n` : ""}Цена продажи: ${this.money(r.salePrice)}\nЦена за изделие: ${this.money(r.salePricePerUnit)}\nПрибыль: ${this.money(r.profit)}\nМаржа: ${r.margin.toFixed(1)}%`;
      await this.copyText(text);
    });

    this.querySelector("#copy-client-price")?.addEventListener("click", async () => {
      const r = this.calculate();
      const text = `Расчёт 3D-печати\n\nМатериал: ${r.material.name}\nКоличество: ${r.quantity} шт.\nВремя изготовления: ${this.data.calculator.hours} ч ${this.data.calculator.minutes} мин\n\nСтоимость заказа: ${this.money(r.salePrice)}\nСтоимость одного изделия: ${this.money(r.salePricePerUnit)}`;
      await this.copyText(text);
    });
  }

  renderMaterialManager() {
    return "";
  }

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

if (!customElements.get("three-d-print-calculator")) {
  customElements.define("three-d-print-calculator", ThreeDPrintCalculator);
}
