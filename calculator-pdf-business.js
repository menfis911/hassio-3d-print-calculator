const pdfBusinessBind=p.bindCalculator;
function buildBusinessPdf(){
  const r=this.calculate(),c=this.data.calculator,s=this.data.settings||{};
  const name=(c.customerName||'Без клиента').trim();
  const date=new Date().toLocaleString('ru-RU');
  const clientType=this.customerName(c.customerType);
  const discount=c.customerType==='regular'?Number(s.commercial?.regularDiscount)||0:Number(r.discount)||0;
  const waste=Number(s.waste)||0;
  const rows=[['Материал',r.material?.name||'—'],['Принтер',r.printer?.name||'—'],['Количество',`${r.q||1} шт.`],['Вес одного изделия',`${Number(r.weight||0).toFixed(1)} г`],['Отходы',`${waste}%`],['Вес с отходами',`${Number(r.totalEffectiveWeight||0).toFixed(1)} г`],['Время печати',`${Number(r.totalHours||0).toFixed(2)} ч`],['Упаковка',`${r.packagingRate||0} ₽/шт. × ${r.packagingQty||0} = ${r.packagingCost||0} ₽`],['Постобработка',`${r.postProcessingRate||0} ₽/шт. × ${r.postProcessingQty||0} = ${r.postProcessingCost||0} ₽`],['Себестоимость',this.money(r.cost)],['Цена до скидки',this.money(r.retailBasePrice)]];
  if(discount)rows.push(['Скидка',`−${discount}%`]);
  if(r.urgentMarkup)rows.push(['Срочность',`+${r.urgentMarkup}%`]);
  rows.push(['Итого за заказ',this.money(r.salePrice)],['Цена за изделие',this.money(r.salePricePerUnit)]);
  const tr=rows.map(x=>`<tr><td>${this.escape(x[0])}</td><td>${this.escape(String(x[1]))}</td></tr>`).join('');
  return `<div id="three-d-business-pdf" class="business-pdf"><h1>Расчёт 3D-печати</h1><div class="pdf-meta">Дата: ${this.escape(date)}</div><div class="pdf-client"><b>Клиент:</b> ${this.escape(name)}<br><span>${this.escape(clientType)}${discount?` · скидка −${discount}%`:''}</span></div><table><tbody>${tr}</tbody></table><div class="pdf-note"><b>Как сформирована цена:</b> материал с учётом отходов + печать (электроэнергия, амортизация, расходники) + упаковка + постобработка → наценка → скидка клиента → срочность → округление.</div></div>`;
}
pdfBusinessBind=function(){pdfBusinessBind.call(this);const b=this.querySelector('#print-calc');if(b)b.onclick=()=>{document.getElementById('three-d-business-pdf')?.remove();const w=document.createElement('div');w.innerHTML=buildBusinessPdf.call(this);const s=w.firstElementChild;document.body.appendChild(s);window.print();setTimeout(()=>s.remove(),1000);};};
p.bindCalculator=pdfBusinessBind;
const pdfBase=p.baseStyle;
p.baseStyle=function(){const b=pdfBase.call(this),x=`.business-pdf{display:none}.business-pdf table{width:100%;border-collapse:collapse;font:12px Arial}.business-pdf td{padding:8px;border-bottom:1px solid #ddd}.business-pdf .pdf-meta{font:12px Arial;color:#666;margin-bottom:14px}.business-pdf .pdf-client{padding:10px 12px;border:1px solid #ddd;border-radius:8px;margin-bottom:14px;font:12px Arial}.business-pdf .pdf-client span{font-size:10px;color:#666}.business-pdf .pdf-note{margin-top:14px;padding:10px;border:1px solid #ddd;border-radius:8px;font:10px Arial;line-height:1.5}@media print{body>*:not(#three-d-business-pdf){display:none!important}#three-d-business-pdf{display:block!important;padding:18mm;font-family:Arial,sans-serif;color:#111}#three-d-business-pdf h1{font-size:20px;margin:0 0 4px}}`;return b.replace('</style>',x+'</style>');};
