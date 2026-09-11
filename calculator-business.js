const businessRenderSettings=p.renderSettings;
const businessBindSettings=p.bindSettings;
const businessRenderCalculator=p.renderCalculator;
const businessBindCalculator=p.bindCalculator;
const businessRenderPrinters=p.renderPrinters;
const businessBindPrinters=p.bindPrinters;

function ensureBusinessData(){
  if(!Array.isArray(this.data.customers))this.data.customers=[];
  if(!Array.isArray(this.data.customerHistory))this.data.customerHistory=[];
  const c=this.data.calculator||(this.data.calculator={});
  if(c.customerId===undefined)c.customerId="";
  if(c.customerName===undefined)c.customerName="";
  const x1=this.data.printers?.find(pr=>/x1\s*carbon|x1c/i.test(String(pr.name||"")));
  if(x1&&(!Number.isFinite(Number(x1.electricity))||Number(x1.electricity)<=0))x1.electricity=0.15;
}

p.renderCalculator=function(r){
  ensureBusinessData.call(this);let html=businessRenderCalculator.call(this,r);const c=this.data.calculator;
  const opts=this.data.customers.map(x=>`<option value="${this.escape(x.id)}">${this.escape(x.name)}</option>`).join("");
  const card=`<div class="business-customer-card"><h3>👤 Клиент</h3><div class="business-customer-row"><select id="business-customer-select"><option value="">Без сохранённого клиента</option>${opts}</select><button type="button" id="business-new-customer">＋ Новый</button></div><input id="business-customer-name" type="text" placeholder="Имя / название клиента" value="${this.escape(c.customerName||"")}"><input id="business-customer-phone" type="text" placeholder="Телефон / контакт (необязательно)"><div class="business-customer-hint">Клиент сохраняется в расчёте, истории и PDF.</div></div>`;
  return html.replace('<div class="calculator-presets">',card+'<div class="calculator-presets">');
};

p.bindCalculator=function(){
  businessBindCalculator.call(this);ensureBusinessData.call(this);
  const s=this.querySelector('#business-customer-select'),n=this.querySelector('#business-customer-name'),ph=this.querySelector('#business-customer-phone');
  const cur=this.data.customers.find(x=>x.id===this.data.calculator.customerId);
  if(s)s.value=this.data.calculator.customerId||'';if(n)n.value=this.data.calculator.customerName||cur?.name||'';if(ph)ph.value=cur?.phone||'';
  if(s)s.addEventListener('change',()=>{const c=this.data.customers.find(x=>x.id===s.value);this.data.calculator.customerId=c?.id||'';this.data.calculator.customerName=c?.name||'';if(n)n.value=c?.name||'';if(ph)ph.value=c?.phone||'';this.saveData();});
  if(n)n.addEventListener('input',()=>{this.data.calculator.customerName=n.value;this.data.calculator.customerId='';this.saveData();});
  const add=this.querySelector('#business-new-customer');
  if(add)add.onclick=()=>{const name=(n?.value||'').trim(),phone=(ph?.value||'').trim();if(!name){this.toast('Введите имя клиента');return;}let c=this.data.customers.find(x=>x.name.toLowerCase()===name.toLowerCase());if(!c){c={id:this.id('customer'),name,phone,createdAt:new Date().toISOString()};this.data.customers.unshift(c);}else if(phone)c.phone=phone;this.data.calculator.customerId=c.id;this.data.calculator.customerName=c.name;this.saveData();this.render();this.toast('✓ Клиент сохранён');};
  const save=this.querySelector('#save-calc');
  if(save)save.addEventListener('click',()=>setTimeout(()=>{const r=this.calculate(),c=this.data.calculator;this.data.customerHistory.unshift({id:this.id('history'),createdAt:new Date().toISOString(),customerId:c.customerId||'guest',customerName:c.customerName||this.customerName(c.customerType)||'Без клиента',material:r.material?.name||'—',printer:r.printer?.name||'—',quantity:r.q||1,total:Number(r.salePrice)||0,cost:Number(r.cost)||0,profit:Math.max(0,(Number(r.salePrice)||0)-(Number(r.cost)||0)});this.data.customerHistory=this.data.customerHistory.slice(0,500);this.saveData();},50));
};

p.renderSettings=function(){
  ensureBusinessData.call(this);let html=businessRenderSettings.call(this);
  const rows=this.data.customers.length?this.data.customers.map(c=>`<div class="customer-row"><div><b>${this.escape(c.name)}</b>${c.phone?`<div class="customer-meta">${this.escape(c.phone)}</div>`:''}<div class="customer-meta">Расчётов: ${this.data.customerHistory.filter(h=>h.customerId===c.id).length}</div></div><button type="button" data-customer-delete="${this.escape(c.id)}">Удалить</button></div>`).join(''):'<div class="customer-empty">Пока нет сохранённых клиентов.</div>';
  const history=this.data.customerHistory.slice(0,20).map(h=>`<tr><td>${new Date(h.createdAt).toLocaleDateString('ru-RU')}</td><td>${this.escape(h.customerName)}</td><td>${this.escape(h.material)}</td><td>${h.quantity}</td><td>${this.money(h.total)}</td><td>${this.money(h.profit)}</td></tr>`).join('');
  const block=`<div class="business-customers"><h3>👥 Клиенты</h3><div class="business-section-hint">Локальная база клиентов и последние сохранённые расчёты.</div><div class="customer-list">${rows}</div><h4>История</h4><div class="history-table-wrap"><table><thead><tr><th>Дата</th><th>Клиент</th><th>Материал</th><th>Кол-во</th><th>Цена</th><th>Прибыль</th></tr></thead><tbody>${history||'<tr><td colspan="6">История пока пуста.</td></tr>'}</tbody></table></div></div>`;
  return html.replace('<div class="settings-version">',block+'<div class="settings-version">');
};

p.bindSettings=function(){businessBindSettings.call(this);ensureBusinessData.call(this);this.querySelectorAll('[data-customer-delete]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.customerDelete;if(!window.confirm('Удалить клиента? История останется.'))return;this.data.customers=this.data.customers.filter(c=>c.id!==id);if(this.data.calculator.customerId===id){this.data.calculator.customerId='';this.data.calculator.customerName='';}this.saveData();this.render();this.toast('✓ Клиент удалён');}));};

p.renderPrinters=function(){ensureBusinessData.call(this);let html=businessRenderPrinters.call(this);const tariff=Math.max(0,Number(this.data.settings?.electricityPrice)||10.25),hourly=(.15*tariff).toFixed(2);html+=`<div class="x1c-smart-note"><b>💡 Bambu Lab X1 Carbon + AMS</b><div>Рабочее значение для себестоимости: <b>0.15 kWh/h (≈150 Вт)</b>. При тарифе ${tariff.toFixed(2)} ₽/kWh это <b>${hourly} ₽/ч</b>.</div><div class="customer-meta">Измерения X1C с двумя AMS показывают около 103–135 Вт во время печати; другие измерения — около 150 Вт. При разогреве возможны кратковременные пики значительно выше. 150 Вт — практическое среднее для расчёта, не максимальная мощность.</div></div>`;return html;};
p.bindPrinters=function(){businessBindPrinters.call(this);ensureBusinessData.call(this);};

const businessBaseStyle=p.baseStyle;
p.baseStyle=function(){const base=businessBaseStyle.call(this);const extra=`
.business-customer-card,.business-customers{grid-column:1/-1;padding:14px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color);margin-top:12px}.business-customer-card h3,.business-customers h3{margin:0 0 8px}.business-customer-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.business-customer-card input{margin-top:8px;width:100%;box-sizing:border-box}.business-customer-hint,.business-section-hint,.customer-meta{font-size:10.5px;color:var(--secondary-text-color);margin-top:7px;line-height:1.45}.customer-list{display:grid;gap:7px;margin:10px 0}.customer-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px;border:1px solid var(--divider-color);border-radius:9px}.history-table-wrap{overflow:auto}.business-customers table{width:100%;border-collapse:collapse;font-size:11px}.business-customers th,.business-customers td{text-align:left;padding:7px;border-bottom:1px solid var(--divider-color);white-space:nowrap}.x1c-smart-note{margin-top:18px;padding:14px;border:1px solid var(--divider-color);border-radius:12px;background:var(--primary-background-color);font-size:11px;line-height:1.5}.x1c-smart-note b{font-size:12px}@media(max-width:700px){.business-customer-row{grid-template-columns:1fr}}
`;return base.replace('</style>',extra+'</style>');};
