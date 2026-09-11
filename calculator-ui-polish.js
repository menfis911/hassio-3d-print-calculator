const polishRenderSettings=p.renderSettings;
const polishBindSettings=p.bindSettings;
const polishRenderCalculator=p.renderCalculator;
const polishBindCalculator=p.bindCalculator;
const polishRenderPrinters=p.renderPrinters;
const polishBindPrinters=p.bindPrinters;
const polishCalculate=p.calculate;
const polishBaseStyle=p.baseStyle;

function ensureCalculatorEnhancements(){
  const s=this.data.settings||(this.data.settings={});
  if(!Number.isFinite(Number(s.electricityPrice))||Number(s.electricityPrice)<=0)s.electricityPrice=10.25;
  if(!Array.isArray(this.data.presets))this.data.presets=[];
  if(!this.data.calculator||typeof this.data.calculator!=="object")this.data.calculator=this.clone(this.defaults.calculator);
  if(!Object.prototype.hasOwnProperty.call(this.data.calculator,"postProcessingQty")){
    this.data.calculator.postProcessingQty=Math.max(1,Math.round(Number(this.data.calculator.quantity)||1));
    this.data.calculator.postProcessingQtyManual=false;
  }
}

p.calculate=function(c=this.data.calculator){
  ensureCalculatorEnhancements.call(this);
  const printer=this.getPrinter(c?.printerId);
  if(!printer)return polishCalculate.call(this,c);
  const tariff=Math.max(0,Number(this.data.settings.electricityPrice)||10.25);
  const consumption=Math.max(0,Number(printer.electricity)||0);
  const oldElectricity=printer.electricity;
  printer.electricity=consumption*tariff;
  try{return polishCalculate.call(this,c);}finally{printer.electricity=oldElectricity;}
};

p.baseStyle=function(){
  const base=polishBaseStyle.call(this);
  const extra=`
.urgent-choice{width:fit-content;max-width:100%;margin:12px auto 0;padding:9px 14px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color);display:flex;align-items:center;justify-content:center;gap:9px;box-sizing:border-box;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease}
.urgent-choice:has(input:checked){border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 7%,var(--primary-background-color));box-shadow:0 2px 9px rgba(0,0,0,.05)}
.urgent-choice input{margin:0;width:auto}.urgent-choice .muted{font-size:11px}
.calculator-presets{grid-column:1/-1;padding:13px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color);margin-top:2px}
.calculator-presets h3{margin:0 0 4px;font-size:14px}.calculator-presets .hint{font-size:11px;color:var(--secondary-text-color);margin-bottom:9px}
.preset-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px}.preset-row select{min-width:0}.preset-row button{white-space:nowrap}
.duplicate-btn,.new-calc-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px}
.settings-electricity{grid-column:1/-1;padding:16px;border:1px solid var(--primary-color);border-radius:14px;background:var(--card-background-color,var(--secondary-background-color));margin-top:14px;box-shadow:0 2px 10px rgba(0,0,0,.08)}
.settings-electricity h3{margin:0 0 6px;font-size:16px}.settings-electricity .hint{color:var(--secondary-text-color);font-size:11px;line-height:1.5;margin-bottom:11px}
.settings-electricity .electricity-example{margin-top:10px;padding:10px;border-radius:10px;background:var(--primary-background-color);font-size:11px;line-height:1.45}
.settings-formula{grid-column:1/-1;margin-top:16px;padding:12px 14px;border-top:1px dashed var(--divider-color);color:var(--secondary-text-color);font-size:10.5px;line-height:1.55}
.settings-formula h4{margin:0 0 6px;color:var(--primary-text-color);font-size:12px}
.printer-formula{margin-top:20px}.printer-formula h3{margin:0 0 5px;font-size:16px}
.printer-formula .formula-intro{font-size:11px;color:var(--secondary-text-color);line-height:1.5;margin-bottom:12px}
.printer-formula-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}
.printer-formula-item{padding:13px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color)}
.printer-formula-item h4{margin:0 0 9px;font-size:14px}.formula-line{display:flex;justify-content:space-between;gap:10px;padding:6px 0}
.formula-line .meta{color:var(--secondary-text-color);font-size:10.5px;line-height:1.35;text-align:right}
.formula-total{display:flex;justify-content:space-between;gap:10px;margin-top:6px;padding-top:8px;border-top:1px solid var(--divider-color);font-weight:800}
.formula-guide{margin-top:11px;padding:10px;border-radius:10px;background:var(--card-background-color,var(--secondary-background-color));font-size:10.5px;line-height:1.55;color:var(--secondary-text-color)}
.formula-guide b{color:var(--primary-text-color)}
.settings-version{grid-column:1/-1;margin-top:30px;display:flex;justify-content:center;padding-bottom:8px}
.settings-version-button{width:min(100%,420px);min-height:54px;padding:10px 16px;border:1px solid var(--divider-color);border-radius:13px;background:var(--card-background-color,var(--primary-background-color));color:var(--primary-text-color);display:flex;align-items:center;gap:12px;cursor:pointer;text-align:left;box-sizing:border-box}
.waste-line{font-size:inherit;color:inherit}.waste-line .meta{font-size:11px;color:var(--secondary-text-color)}
@media(max-width:850px){.preset-row{grid-template-columns:1fr}.printer-formula-grid{grid-template-columns:1fr}}
`;
  return base.replace("</style>",extra+"</style>");
};

p.renderCalculator=function(r){
  ensureCalculatorEnhancements.call(this);
  let html=polishRenderCalculator.call(this,r);
  const presets=this.data.presets;
  const options=presets.length?presets.map(x=>`<option value="${this.escape(x.id)}">${this.escape(x.name)}</option>`).join(""):`<option value="">Нет сохранённых шаблонов</option>`;
  const preset=`<div class="calculator-presets"><h3>⚡ Шаблоны расчёта</h3><div class="hint">Сохраняйте типовые настройки и применяйте их к новому расчёту.</div><div class="preset-row"><select id="preset-select"><option value="">Выберите шаблон</option>${options}</select><button type="button" id="load-preset">Применить</button><button type="button" id="save-preset">＋ Сохранить</button></div></div>`;
  html=html.replace('<div class="actions copy-grid">',preset+'<div class="actions copy-grid">');
  html=html.replace('<button class="primary" id="save-calc">💾 Сохранить</button>','<button type="button" class="new-calc-btn" id="new-calc">＋ Новый расчёт</button><button class="primary" id="save-calc">💾 Сохранить</button><button type="button" class="duplicate-btn" id="duplicate-calc">📋 Дублировать</button>');
  const waste=Number(this.data.settings.waste)||0;
  html=html.replace('<div class="cost-line"><span>🧵 Материал',`<div class="cost-line waste-line"><span>♻️ Отходы <span class="meta">(к весу материала)</span></span><b>${waste}%</b></div><div class="cost-line"><span>🧵 Материал`);
  return html;
};

p.bindCalculator=function(){
  polishBindCalculator.call(this);
  ensureCalculatorEnhancements.call(this);
  const quantity=this.querySelector("#quantity"),post=this.querySelector("#postProcessingQty"),packaging=this.querySelector("#packagingQty");
  if(quantity)quantity.addEventListener("input",()=>{const q=Math.max(1,Math.round(Number(quantity.value)||1));this.data.calculator.quantity=q;if(!this.data.calculator.postProcessingQtyManual){this.data.calculator.postProcessingQty=q;if(post)post.value=q;}else if(post){const current=Math.max(0,Math.min(q,Math.round(Number(post.value)||0)));post.value=current;this.data.calculator.postProcessingQty=current;}if(packaging)packaging.max=q;if(post)post.max=q;this.saveData();if(typeof this.updateResult==="function")this.updateResult();});
  if(post){const markManual=()=>{const q=Math.max(1,Math.round(Number(quantity?.value)||1)),v=Math.max(0,Math.min(q,Math.round(Number(post.value)||0)));post.value=v;this.data.calculator.postProcessingQty=v;this.data.calculator.postProcessingQtyManual=true;this.saveData();if(typeof this.updateResult==="function")this.updateResult();};post.addEventListener("input",markManual);post.addEventListener("change",markManual);}
  if(packaging){const updatePack=()=>{const q=Math.max(1,Math.round(Number(quantity?.value)||1)),v=Math.max(0,Math.min(q,Math.round(Number(packaging.value)||0)));packaging.value=v;this.data.calculator.packagingQty=v;this.saveData();if(typeof this.updateResult==="function")this.updateResult();};packaging.addEventListener("input",updatePack);packaging.addEventListener("change",updatePack);}
  const duplicate=this.querySelector("#duplicate-calc");
  if(duplicate)duplicate.onclick=()=>{this.data.calculator=this.clone(this.data.calculator);this.data.calculator.postProcessingQtyManual=false;this.orderItems=[];this.activeTab="calculator";this.saveData();this.render();this.toast("✓ Новый расчёт создан из текущего");};
  const fresh=this.querySelector("#new-calc");
  if(fresh)fresh.onclick=()=>{const current=this.data.calculator,next=this.clone(this.defaults.calculator);next.materialId=current.materialId;next.printerId=current.printerId;next.postProcessingQty=Math.max(1,Math.round(Number(next.quantity)||1));next.postProcessingQtyManual=false;next.packagingQty=0;this.data.calculator=next;this.orderItems=[];this.activeTab="calculator";this.saveData();this.render();this.toast("✓ Новый расчёт");};
  const select=this.querySelector("#preset-select"),load=this.querySelector("#load-preset"),save=this.querySelector("#save-preset");
  if(load)load.onclick=()=>{const id=select?.value;if(!id)return;const preset=this.data.presets.find(x=>x.id===id);if(!preset)return;this.data.calculator=this.clone(preset.calculator);this.data.calculator.postProcessingQtyManual=Boolean(preset.calculator.postProcessingQtyManual);this.activeTab="calculator";this.saveData();this.render();this.toast(`✓ Шаблон «${preset.name}» применён`);};
  if(save)save.onclick=()=>{const name=window.prompt("Название шаблона",`${this.getMaterial()?.name||"Расчёт"} / ${this.getPrinter()?.name||"Принтер"}`);if(!name||!name.trim())return;this.data.presets=[{id:this.id("preset"),name:name.trim(),createdAt:new Date().toISOString(),calculator:this.clone(this.data.calculator)},...this.data.presets].slice(0,50);this.saveData();this.render();this.toast("✓ Шаблон сохранён");};
};

p.renderSettings=function(){
  ensureCalculatorEnhancements.call(this);
  let html=polishRenderSettings.call(this);
  html=html.replace(/<div class="settings-version">[\s\S]*?<\/button>\s*<\/div>\s*$/,"");
  const tariff=Number(this.data.settings.electricityPrice)||10.25,first=this.data.printers[0]||{},kwh=Math.max(0,Number(first.electricity)||0),dep=Math.max(0,Number(first.depreciation)||0),cons=Math.max(0,Number(first.consumables)||0),example=kwh*tariff+dep+cons;
  return html+`<div class="settings-electricity"><h3>⚡ Электроэнергия</h3><div class="hint"><b>Тариф участвует в себестоимости.</b> Здесь задаётся цена 1 кВт·ч, а у принтера — потребление в кВт·ч за час. Калькулятор умножает их и получает стоимость электроэнергии за час.</div><div class="field"><label>Тариф, ₽ / кВт·ч</label><input id="electricity-price" type="number" min="0" step="0.01" value="${tariff}"></div><div class="electricity-example">Пример: ${this.escape(first.name||"Принтер")} — ${kwh} кВт·ч/ч × ${this.moneyExact(tariff)} = <b>${this.moneyExact(kwh*tariff)} ₽/ч</b>. Плюс амортизация ${this.moneyExact(dep)} и расходники ${this.moneyExact(cons)} → <b>${this.moneyExact(example)} ₽/ч</b>.</div></div><div class="settings-formula"><h4>🧮 Как именно считает калькулятор</h4><div><b>1. Материал:</b> вес × (1 + отходы/100) × количество × цена материала/г.</div><div><b>2. Печать:</b> время × [потребление кВт·ч/ч × тариф + амортизация/ч + расходники/ч] × количество.</div><div><b>3. Упаковка:</b> ставка ₽/шт. × количество упаковок.</div><div><b>4. Постобработка:</b> ставка ₽/шт. × количество изделий.</div><div><b>5. Себестоимость:</b> материал + печать + упаковка + постобработка.</div><div><b>6. Цена:</b> себестоимость + наценка → скидка → срочность → минимум → округление.</div><div><b>7. Прибыль:</b> итоговая цена − себестоимость. Маржа = прибыль / итоговая цена × 100%.</div><div><b>8. Отходы:</b> например, 5% означает, что на 100 г готовых деталей в расчёт материала пойдёт 105 г.</div></div><div class="settings-version"><button type="button" class="settings-version-button" id="open-github-project"><span aria-hidden="true"><svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56.31-2.02-.56-2.61-.56-2.61-1.02-.72-1.02-1.87-1.02-1.87.92-.1 1.42.95 1.42.95.82 1.4 2.15 1 2.68.76.08-.6.32-1 .58-1.23-2.05-.23-4.2-1.03-4.2-4.57 0-1.01.36-1.83.95-2.48-.1-.23-.41-1.18.09-2.46 0 0 .77-.25 2.52.95.73-.2 1.51-.3 2.29-.3s1.56.1 2.29.3c1.75-1.2 2.52-.95 2.52-.95.5 1.28.19 2.23.09 2.46.59.65.95 1.47.95 2.48 0 3.55-2.16 4.34-4.21 4.57.33.28.62.83.62 1.67v2.47c0 .27.2.59.79.49A9.99 9.99 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg></span><span style="min-width:0;flex:1"><span style="display:block;font-size:13px;font-weight:700">3D Print Calculator</span><span style="display:block;font-size:11px;color:var(--secondary-text-color);margin-top:3px">Исходный код и обновления</span></span><span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:var(--primary-background-color);border:1px solid var(--divider-color);white-space:nowrap">v1.9.5</span></button></div>`;
};

p.bindSettings=function(){polishBindSettings.call(this);ensureCalculatorEnhancements.call(this);const input=this.querySelector("#electricity-price");if(input){const update=()=>{this.data.settings.electricityPrice=Math.max(0,Number(input.value)||0);this.saveData();};input.addEventListener("change",update);input.addEventListener("input",update);}const btn=this.querySelector("#open-github-project");if(btn)btn.onclick=()=>window.open("https://github.com/menfis911/hassio-3d-print-calculator","_blank","noopener,noreferrer");};

p.renderPrinters=function(){ensureCalculatorEnhancements.call(this);const html=polishRenderPrinters.call(this),tariff=Math.max(0,Number(this.data.settings.electricityPrice)||10.25);const cards=this.data.printers.map(pr=>{const kwh=Math.max(0,Number(pr.electricity)||0),dep=Math.max(0,Number(pr.depreciation)||0),cons=Math.max(0,Number(pr.consumables)||0),electricity=kwh*tariff,total=electricity+dep+cons;return `<div class="printer-formula-item"><h4>${this.escape(pr.name||"Принтер")}</h4><div class="formula-line"><span>Электроэнергия</span><span><b>${this.moneyExact(electricity)} / ч</b><br><span class="meta">${kwh} кВт·ч/ч × ${this.moneyExact(tariff)}</span></span></div><div class="formula-line"><span>Амортизация</span><span><b>${this.moneyExact(dep)} / ч</b></span></div><div class="formula-line"><span>Расходники</span><span><b>${this.moneyExact(cons)} / ч</b></span></div><div class="formula-total"><span>Итого себестоимость часа</span><span>${this.moneyExact(total)} / ч</span></div><div class="formula-guide"><b>Как указывать значения:</b><br>• <b>Электроэнергия</b> — фактическое потребление за 1 час. Например, 0,15 кВт·ч/ч = 150 Вт.<br>• <b>Амортизация</b> — (цена − остаточная стоимость + плановый ремонт) ÷ ожидаемые часы работы.<br>• <b>Расходники</b> — сопла, фильтры, смазка и другие расходы ÷ рабочие часы.<br><b>Итого:</b> электроэнергия + амортизация + расходники.</div></div>`;}).join("");return html+`<div class="card printer-formula"><h3>🧮 Стоимость часа принтера</h3><div class="formula-intro">Информационный блок ниже не заменяет карточки принтеров выше. Он показывает прозрачную формулу, которая реально входит в себестоимость заказа.</div><div class="printer-formula-grid">${cards}</div></div>`;};

p.bindPrinters=function(){polishBindPrinters.call(this);ensureCalculatorEnhancements.call(this);};

console.log("[3D Print Calculator] UI polish 1.9.5 loaded");
