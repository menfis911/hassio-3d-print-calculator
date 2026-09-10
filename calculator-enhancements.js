const Calculator = customElements.get("three-d-print-calculator");
if (!Calculator) throw new Error("3D calculator main component was not registered");

const p = Calculator.prototype;
const originalBaseStyle = p.baseStyle;
const originalRenderSettings = p.renderSettings;
const originalBindSettings = p.bindSettings;
const originalCalculate = p.calculate;

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function normalizeCalculator(calc) {
  const c = calc || {};
  const q = Math.max(1, Math.round(n(c.quantity, 1)));
  if (!Object.prototype.hasOwnProperty.call(c, "packagingQty")) c.packagingQty = 0;
  if (!Object.prototype.hasOwnProperty.call(c, "postProcessingQty")) c.postProcessingQty = q;
  c.packagingQty = Math.max(0, Math.round(n(c.packagingQty, 0)));
  c.postProcessingQty = Math.max(0, Math.round(n(c.postProcessingQty, q)));
  return c;
}

function ensureSettings(settings) {
  const s = settings || {};
  if (!s.costs || typeof s.costs !== "object") s.costs = {};
  if (!Object.prototype.hasOwnProperty.call(s.costs, "packaging")) s.costs.packaging = 500;
  if (!Object.prototype.hasOwnProperty.call(s.costs, "postProcessing")) s.costs.postProcessing = 300;
  delete s.costs.labor;
  s.costs.packaging = Math.max(0, n(s.costs.packaging, 500));
  s.costs.postProcessing = Math.max(0, n(s.costs.postProcessing, 300));
  return s;
}

p.baseStyle = function () {
  const css = originalBaseStyle.call(this);
  const extra = `<style>
    .result-card{overflow:hidden}.price-hero{padding:18px;border-radius:14px;background:linear-gradient(135deg,var(--primary-color),var(--accent-color,var(--primary-color)));color:#fff;text-align:center;margin:0 0 14px}.price-hero .eyebrow{font-size:11px;opacity:.82;text-transform:uppercase;letter-spacing:.07em}.price-hero .price{font-size:36px;font-weight:800;line-height:1.05;margin:7px 0}.price-hero .per-unit{font-size:13px;opacity:.9}.result-section{padding:13px 0;border-top:1px solid var(--divider-color)}.result-section h3{margin:0 0 9px;font-size:14px}.cost-list,.commercial{display:grid;gap:3px}.cost-line,.commercial-line{display:flex;justify-content:space-between;gap:12px;padding:7px 0}.cost-line .meta{color:var(--secondary-text-color);font-size:11px}.cost-total{display:flex;justify-content:space-between;padding:11px;margin-top:5px;border-radius:9px;background:var(--primary-background-color);font-weight:800}.commercial-line .value{font-weight:700}.explain{padding:10px 11px;border-radius:9px;background:var(--primary-background-color);color:var(--secondary-text-color);font-size:11px;line-height:1.4;margin-top:7px}.field-hint{font-size:11px;color:var(--secondary-text-color);line-height:1.3;margin-top:-2px}.copy-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.copy-grid button{width:100%}.profit-positive{font-size:19px;font-weight:800}.minimum-note{padding:9px;border-radius:9px;background:var(--primary-background-color);font-size:11px;margin-top:7px}.copy-grid + #copy-status{display:none}.copy-grid + #copy-status.show{display:block}.settings-costs{grid-column:1/-1;padding:14px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color);margin-top:12px}.settings-costs h3{margin:0 0 5px;font-size:15px}.settings-costs .hint{color:var(--secondary-text-color);font-size:11px;line-height:1.4;margin-bottom:10px}.settings-cost-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(max-width:850px){.copy-grid{grid-template-columns:1fr}.settings-cost-grid{grid-template-columns:1fr}}
  </style>`;
  return css.replace("</style>", extra.replace("<style>", "").replace("</style>", "") + "</style>");
};

p.calculate = function (c = this.data.calculator) {
  const calc = normalizeCalculator(c);
  ensureSettings(this.data.settings);
  const q = Math.max(1, Math.round(n(calc.quantity, 1)));
  const packagingRate = n(this.data.settings.costs.packaging, 500);
  const postRate = n(this.data.settings.costs.postProcessing, 300);
  const packagingQty = Math.min(q, Math.max(0, Math.round(n(calc.packagingQty, 0))));
  const postQty = Math.min(q, Math.max(0, Math.round(n(calc.postProcessingQty, q))));
  const adapted = { ...calc, packaging: packagingRate * packagingQty / q, postProcessing: postRate * postQty / q, labor: 0 };
  const r = originalCalculate.call(this, adapted);
  r.packagingRate = packagingRate;
  r.postProcessingRate = postRate;
  r.packagingQty = packagingQty;
  r.postProcessingQty = postQty;
  r.packagingCost = packagingRate * packagingQty;
  r.postProcessingCost = postRate * postQty;
  r.laborCost = 0;
  r.cost = r.materialCost + r.machineCost + r.packagingCost + r.postProcessingCost;
  r.costPerUnit = r.cost / r.q;
  r.retailBasePrice = r.cost * (1 + r.retailMarkup / 100);
  let discount = 0;
  let discountLabel = "";
  let beforeUrgent = r.retailBasePrice;
  if (calc.customerType === "regular") {
    discount = Math.max(0, n(this.data.settings.commercial.regularDiscount));
    beforeUrgent = r.retailBasePrice * (1 - discount / 100);
    discountLabel = `Постоянный клиент −${discount}%`;
  }
  if (calc.customerType === "wholesale") {
    discount = this.wholesaleDiscount(r.q);
    beforeUrgent = r.retailBasePrice * (1 - discount / 100);
    discountLabel = discount ? `Оптовая скидка −${discount}%` : "Оптовая скидка не применяется";
  }
  const urgentMarkup = calc.urgent ? Math.max(0, n(this.data.settings.commercial.urgentMarkup)) : 0;
  const urgentCost = beforeUrgent * urgentMarkup / 100;
  const preMin = beforeUrgent + urgentCost;
  const minOrder = Math.max(0, n(this.data.settings.commercial.minimumOrder));
  let sale = Math.max(minOrder, preMin);
  const rounding = Math.max(0, n(this.data.settings.rounding));
  if (rounding) sale = Math.ceil(sale / rounding) * rounding;
  r.discount = discount;
  r.discountLabel = discountLabel;
  r.discountAmount = r.retailBasePrice - beforeUrgent;
  r.urgentMarkup = urgentMarkup;
  r.urgentCost = urgentCost;
  r.priceBeforeMinimum = preMin;
  r.minimumOrder = minOrder;
  r.minimumApplied = preMin < minOrder;
  r.salePrice = sale;
  r.salePricePerUnit = sale / r.q;
  r.profit = sale - r.cost;
  r.margin = sale ? (r.profit / sale) * 100 : 0;
  return r;
};

p.renderCalculator = function (r) {
  const c = normalizeCalculator(this.data.calculator);
  ensureSettings(this.data.settings);
  const q = Math.max(1, Math.round(n(c.quantity, 1)));
  c.packagingQty = Math.min(q, Math.max(0, Math.round(n(c.packagingQty, 0))));
  c.postProcessingQty = Math.min(q, Math.max(0, Math.round(n(c.postProcessingQty, q))));
  const settings = this.data.settings;
  return `<div class="grid"><div><div class="card"><h2>Расчёт</h2><div class="form">
  <div class="field"><label>Материал</label><select id="material">${this.data.materials.map(m=>`<option value="${m.id}" ${m.id===c.materialId?"selected":""}>${this.escape(m.name)}</option>`).join("")}</select></div>
  <div class="field"><label>Принтер</label><select id="printer">${this.data.printers.map(x=>`<option value="${x.id}" ${x.id===c.printerId?"selected":""}>${this.escape(x.name)}</option>`).join("")}</select></div>
  <div class="field"><label>Вес одного изделия, г</label><input id="weight" type="number" min="0" step="0.1" value="${c.weight}"></div>
  <div class="field"><label>Количество, шт.</label><input id="quantity" type="number" min="1" step="1" value="${q}"></div>
  <div class="field"><label>Время, часы</label><input id="hours" type="number" min="0" step="1" value="${c.hours}"></div>
  <div class="field"><label>Время, минуты</label><input id="minutes" type="number" min="0" max="59" step="1" value="${c.minutes}"></div>
  <div class="field"><label>📦 Упаковка, шт.</label><input id="packagingQty" type="number" min="0" max="${q}" step="1" value="${c.packagingQty}"><div class="field-hint">Ставка из настроек: ${this.money(settings.costs.packaging)} / шт. Можно поставить 0.</div></div>
  <div class="field"><label>🛠 Постобработка, шт.</label><input id="postProcessingQty" type="number" min="0" max="${q}" step="1" value="${c.postProcessingQty}"><div class="field-hint">По умолчанию = количество изделий. Можно изменить или поставить 0.</div></div>
  <div class="field full"><div class="explain">💡 Ставки задаются в настройках за 1 изделие. Здесь указывается, для скольких изделий применять упаковку и постобработку.</div></div>
  <div class="field full"><label>Тип клиента</label><div class="choice-grid"><div class="choice"><input type="radio" name="customerType" id="customer-retail" value="retail" ${c.customerType==="retail"?"checked":""}><label for="customer-retail"><strong>🛒 Розница</strong><span>Базовая наценка ${settings.commercial.retailMarkup}%</span></label></div><div class="choice"><input type="radio" name="customerType" id="customer-regular" value="regular" ${c.customerType==="regular"?"checked":""}><label for="customer-regular"><strong>⭐ Постоянный клиент</strong><span>Скидка ${settings.commercial.regularDiscount}%</span></label></div><div class="choice"><input type="radio" name="customerType" id="customer-wholesale" value="wholesale" ${c.customerType==="wholesale"?"checked":""}><label for="customer-wholesale"><strong>📦 Опт</strong><span>Скидка зависит от количества</span></label></div></div><label class="urgent-choice"><input id="urgent" type="checkbox" ${c.urgent?"checked":""}><span><b>⚡ Срочный заказ</b><br><span class="muted">Надбавка ${settings.commercial.urgentMarkup}%</span></span></label></div>
  </div></div><div class="card"><h3>Себестоимость</h3><div class="cost-list">
  <div class="cost-line"><span>🧵 Материал <span class="meta">(${this.money(r.materialCost/r.q)} / шт.)</span></span><b id="cost-material">${this.money(r.materialCost)}</b></div>
  <div class="cost-line"><span>🖨 Печать <span class="meta">(${this.money(r.machineCost/r.q)} / шт.)</span></span><b id="cost-machine">${this.money(r.machineCost)}</b></div>
  <div class="cost-line"><span>📦 Упаковка <span class="meta">(${this.money(r.packagingRate)} / шт. × ${r.packagingQty} шт.)</span></span><b id="cost-packaging">${this.money(r.packagingCost)}</b></div>
  <div class="cost-line"><span>🛠 Постобработка <span class="meta">(${this.money(r.postProcessingRate)} / шт. × ${r.postProcessingQty} шт.)</span></span><b id="cost-post">${this.money(r.postProcessingCost)}</b></div>
  </div><div class="cost-total"><span>Себестоимость заказа</span><span id="cost-total">${this.money(r.cost)}</span></div><div class="explain">Себестоимость — реальные затраты до наценки, скидки, срочности и минимального заказа.</div></div></div>
  <div class="result"><div class="card result-card"><div class="price-hero"><div class="eyebrow">Итого за заказ</div><div class="price" id="sale-price">${this.money(r.salePrice)}</div><div class="per-unit" id="sale-unit-hero">${this.money(r.salePricePerUnit)} за изделие</div></div><div class="summary"><div class="box"><span>Себестоимость</span><br><b id="cost">${this.money(r.cost)}</b></div><div class="box"><span>Прибыль</span><br><b id="profit" class="profit-positive">${this.money(r.profit)}</b></div><div class="box"><span>Цена / шт.</span><br><b id="sale-unit">${this.money(r.salePricePerUnit)}</b></div><div class="box"><span>Маржа</span><br><b id="margin">${r.margin.toFixed(1)}%</b></div></div>
  <div class="result-section"><h3>📊 Как получилась цена</h3><div class="commercial"><div class="commercial-line"><span>Цена с базовой наценкой</span><span class="value" id="commercial-base">${this.money(r.retailBasePrice)}</span></div><div class="commercial-line"><span id="commercial-discount-label">${this.escape(r.discountLabel||"Скидка")}</span><span class="value" id="commercial-discount">${r.discount?`−${this.money(r.discountAmount)}`:"0 ₽"}</span></div><div class="commercial-line"><span>⚡ Срочность</span><span class="value" id="commercial-urgent">${r.urgentMarkup?`+${r.urgentMarkup}% · ${this.money(r.urgentCost)}`:"Нет"}</span></div><div class="commercial-line"><span>Минимальный заказ</span><span class="value" id="commercial-minimum">${this.money(r.minimumOrder)}</span></div><div class="commercial-line"><span>Округление</span><span class="value">до ${this.money(settings.rounding)}</span></div></div><div id="minimum-note">${r.minimumApplied?`<div class="minimum-note">ℹ️ Сработал минимальный заказ: расчётная цена была ниже ${this.money(r.minimumOrder)}.</div>`:""}</div></div>
  <div class="result-section"><h3>📦 Заказ</h3><div class="commercial"><div class="commercial-line"><span>Количество</span><span class="value" id="order-qty">${r.q} шт.</span></div><div class="commercial-line"><span>Материал</span><span class="value">${this.escape(r.material?.name||"")}</span></div><div class="commercial-line"><span>Принтер</span><span class="value">${this.escape(r.printer?.name||"")}</span></div><div class="commercial-line"><span>Вес с учётом отходов</span><span class="value" id="order-weight">${r.totalEffectiveWeight.toFixed(1)} г</span></div></div></div>
  <div class="actions copy-grid"><button class="primary" id="save-calc">💾 Сохранить</button><button id="print-calc">🖨 Печать / PDF</button><button id="copy-calc">📋 Полный расчёт</button><button id="copy-client-price">📄 Цена клиенту</button></div><div id="copy-status" class="notice" aria-live="polite"></div></div></div></div>`;
};

p.updateResult = function () {
  const r = this.calculate();
  const set=(id,text)=>{const e=this.querySelector(`#${id}`);if(e)e.textContent=text;};
  set("sale-price",this.money(r.salePrice));set("sale-unit-hero",`${this.money(r.salePricePerUnit)} за изделие`);set("cost",this.money(r.cost));set("profit",this.money(r.profit));set("sale-unit",this.money(r.salePricePerUnit));set("margin",`${r.margin.toFixed(1)}%`);set("cost-material",this.money(r.materialCost));set("cost-machine",this.money(r.machineCost));set("cost-packaging",this.money(r.packagingCost));set("cost-post",this.money(r.postProcessingCost));set("cost-total",this.money(r.cost));set("commercial-base",this.money(r.retailBasePrice));set("commercial-discount",r.discount?`−${this.money(r.discountAmount)}`:"0 ₽");set("commercial-urgent",r.urgentMarkup?`+${r.urgentMarkup}% · ${this.money(r.urgentCost)}`:"Нет");set("commercial-minimum",this.money(r.minimumOrder));set("order-qty",`${r.q} шт.`);set("order-weight",`${r.totalEffectiveWeight.toFixed(1)} г");
  const dl=this.querySelector("#commercial-discount-label");if(dl)dl.textContent=r.discountLabel||"Скидка";const mn=this.querySelector("#minimum-note");if(mn)mn.innerHTML=r.minimumApplied?`<div class="minimum-note">ℹ️ Сработал минимальный заказ: расчётная цена была ниже ${this.money(r.minimumOrder)}.</div>`:"";
  const pq=this.querySelector("#packagingQty");if(pq)pq.max=r.q;const pp=this.querySelector("#postProcessingQty");if(pp)pp.max=r.q;
};

p.bindCalculator = function () {
  ["weight","quantity","hours","minutes","packagingQty","postProcessingQty"].forEach(id=>{const el=this.querySelector(`#${id}`);if(!el)return;el.addEventListener("input",()=>{this.data.calculator[id]=el.value;if(id==="quantity"){const q=Math.max(1,Math.round(n(el.value,1)));if(!Object.prototype.hasOwnProperty.call(this.data.calculator,"postProcessingQty")||n(this.data.calculator.postProcessingQty,0)===0)this.data.calculator.postProcessingQty=q;}this.saveData();this.updateResult();});el.addEventListener("change",()=>{this.data.calculator[id]=el.value;this.saveData();this.updateResult();});});
  const m=this.querySelector("#material"),pr=this.querySelector("#printer"),u=this.querySelector("#urgent");m.onchange=()=>{this.data.calculator.materialId=m.value;this.saveData();this.updateResult();};pr.onchange=()=>{this.data.calculator.printerId=pr.value;this.saveData();this.updateResult();};this.querySelectorAll("input[name=customerType]").forEach(e=>e.onchange=()=>{this.data.calculator.customerType=e.value;this.saveData();this.render();});u.onchange=()=>{this.data.calculator.urgent=u.checked;this.saveData();this.updateResult();};this.querySelector("#save-calc").onclick=()=>this.saveCalculation();this.querySelector("#print-calc").onclick=()=>this.printCalculation(this.calculate());this.querySelector("#copy-calc").onclick=()=>this.copy(this.textForResult(this.calculate()));const client=this.querySelector("#copy-client-price");if(client)client.onclick=()=>this.copy(this.textForClient(this.calculate()));
};

p.renderSettings = function () {
  const s=ensureSettings(this.data.settings);
  const html=originalRenderSettings.call(this);
  const block=`<div class="settings-costs"><h3>💰 Стандартные ставки за изделие</h3><div class="hint">Здесь задаётся стоимость одной упаковки и одной операции постобработки. В калькуляторе отдельно указывается количество изделий, к которым применять ставку.</div><div class="settings-cost-grid"><div class="field"><label>📦 Упаковка, ₽ / шт.</label><input id="set-packaging" type="number" min="0" step="1" value="${s.costs.packaging}"></div><div class="field"><label>🛠 Постобработка, ₽ / шт.</label><input id="set-post-processing" type="number" min="0" step="1" value="${s.costs.postProcessing}"></div></div></div>`;
  return html+block;
};

p.bindSettings = function () {
  originalBindSettings.call(this);
  const btn=this.querySelector("#save-settings");if(!btn)return;
  btn.addEventListener("click",()=>{const s=ensureSettings(this.data.settings);s.costs.packaging=Math.max(0,n(this.querySelector("#set-packaging")?.value,500));s.costs.postProcessing=Math.max(0,n(this.querySelector("#set-post-processing")?.value,300));delete s.costs.labor;this.saveData();this.toast("✓ Ставки сохранены");});
};

p.printCalculation = function (r) {
  const w=window.open("","_blank","width=900,height=900");if(!w){this.toast("⚠️ Разрешите всплывающие окна для печати");return;}
  const c=normalizeCalculator(this.data.calculator);const row=(name,value)=>`<tr><td>${name}</td><td>${value}</td></tr>`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Расчёт 3D печати</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#171717;font-size:11px;line-height:1.4;margin:0}.pdf-sheet{max-width:760px;margin:auto}.pdf-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #222;padding-bottom:10px;margin-bottom:16px}.pdf-title{font-size:21px;font-weight:700}.pdf-subtitle{font-size:10px;color:#666;margin-top:2px}.pdf-total{text-align:right}.pdf-total .label{font-size:9px;color:#666;text-transform:uppercase}.pdf-total .value{font-size:23px;font-weight:700}.pdf-section{margin:13px 0}.pdf-section h2{font-size:12px;margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid #ddd}.pdf-table{width:100%;border-collapse:collapse;font-size:10.5px}.pdf-table td{padding:4px;border-bottom:1px solid #eee}.pdf-table td:last-child{text-align:right;font-weight:600}.pdf-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.pdf-box{border:1px solid #ddd;border-radius:6px;padding:7px}.pdf-box .label{font-size:8px;color:#666}.pdf-box .value{font-size:13px;font-weight:700;margin-top:2px}.pdf-footer{margin-top:16px;padding-top:7px;border-top:1px solid #ddd;font-size:8px;color:#777;text-align:center}@media print{button{display:none}}</style></head><body><div class="pdf-sheet"><div class="pdf-header"><div><div class="pdf-title">3D Калькулятор</div><div class="pdf-subtitle">Расчёт стоимости заказа · ${new Date().toLocaleString("ru-RU")}</div></div><div class="pdf-total"><div class="label">Итого за заказ</div><div class="value">${this.money(r.salePrice)}</div></div></div><div class="pdf-section"><h2>Заказ</h2><table class="pdf-table">${row("Материал",this.escape(r.material?.name||""))}${row("Принтер",this.escape(r.printer?.name||""))}${row("Количество",`${r.q} шт.`)}${row("Вес одного изделия",`${r.weight} г`)}${row("Вес с отходами",`${r.totalEffectiveWeight.toFixed(1)} г`)}${row("Время печати",`${Math.floor(r.totalHours)} ч ${Math.round((r.totalHours%1)*60)} мин`)}${row("Тип клиента",this.escape(r.customerType))}</table></div><div class="pdf-section"><h2>Себестоимость</h2><table class="pdf-table">${row("Материал",this.money(r.materialCost))}${row("Печать",this.money(r.machineCost))}${row(`Упаковка · ${this.money(r.packagingRate)} ₽/шт. × ${r.packagingQty} шт.`,this.money(r.packagingCost))}${row(`Постобработка · ${this.money(r.postProcessingRate)} ₽/шт. × ${r.postProcessingQty} шт.`,this.money(r.postProcessingCost))}${row("Итого себестоимость",this.money(r.cost))}</table></div><div class="pdf-summary"><div class="pdf-box"><div class="label">ЦЕНА / ШТ.</div><div class="value">${this.money(r.salePricePerUnit)}</div></div><div class="pdf-box"><div class="label">ПРИБЫЛЬ</div><div class="value">${this.money(r.profit)}</div></div><div class="pdf-box"><div class="label">МАРЖА</div><div class="value">${r.margin.toFixed(1)}%</div></div></div><div class="pdf-section"><h2>Коммерческие условия</h2><table class="pdf-table">${row("Базовая цена с наценкой",this.money(r.retailBasePrice))}${row(r.discountLabel||"Скидка",r.discount?`−${this.money(r.discountAmount)}`:"0 ₽")}${row("Срочность",r.urgentMarkup?`+${r.urgentMarkup}% · ${this.money(r.urgentCost)}`:"Нет")}${row("Минимальный заказ",this.money(r.minimumOrder))}${row("Округление",`до ${this.money(this.data.settings.rounding)}`)}</table></div><div class="pdf-footer">Расчёт сформирован в 3D Калькуляторе</div></div><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`;
  w.document.open();w.document.write(html);w.document.close();w.focus();
};

console.log("[3D Print Calculator] UI enhancements 1.6.4 loaded");
