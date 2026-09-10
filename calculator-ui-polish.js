const Calculator=customElements.get("three-d-print-calculator");
if(!Calculator)throw new Error("3D calculator main component was not registered");
const p=Calculator.prototype;
const originalBaseStyle=p.baseStyle;
const originalRenderSettings=p.renderSettings;

p.baseStyle=function(){
  const css=originalBaseStyle.call(this);
  const extra=`
.urgent-choice{
  width:fit-content;
  max-width:100%;
  margin:12px auto 0;
  padding:9px 15px;
  border:1px solid var(--divider-color);
  border-radius:12px;
  background:var(--primary-background-color);
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  box-sizing:border-box;
  transition:border-color .18s ease,background .18s ease,box-shadow .18s ease;
}
.urgent-choice:hover{border-color:var(--secondary-text-color)}
.urgent-choice:has(input:checked){
  border-color:var(--primary-color);
  background:color-mix(in srgb,var(--primary-color) 7%,var(--card-background-color,var(--primary-background-color)));
  box-shadow:0 2px 10px rgba(0,0,0,.04);
}
.urgent-choice input{margin:0}
.urgent-choice>b,.urgent-choice strong{font-weight:700}
.settings-version{
  grid-column:1/-1;
  margin-top:18px;
  display:flex;
  justify-content:center;
}
.settings-version-button{
  width:min(100%,420px);
  min-height:54px;
  padding:10px 16px;
  border:1px solid var(--divider-color);
  border-radius:13px;
  background:var(--card-background-color,var(--primary-background-color));
  color:var(--primary-text-color);
  display:flex;
  align-items:center;
  gap:12px;
  cursor:pointer;
  text-align:left;
  box-sizing:border-box;
  transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease,background .15s ease;
}
.settings-version-button:hover{
  border-color:var(--secondary-text-color);
  box-shadow:0 3px 12px rgba(0,0,0,.08);
  transform:translateY(-1px);
}
.settings-version-button:active{transform:translateY(0)}
.settings-version-icon{width:30px;height:30px;display:grid;place-items:center;flex:0 0 30px}
.settings-version-icon svg{width:28px;height:28px;fill:currentColor}
.settings-version-main{min-width:0;flex:1}
.settings-version-title{font-size:13px;font-weight:700;line-height:1.2}
.settings-version-sub{font-size:11px;color:var(--secondary-text-color);margin-top:3px}
.settings-version-badge{
  font-size:11px;
  font-weight:700;
  padding:4px 8px;
  border-radius:999px;
  background:var(--primary-background-color);
  border:1px solid var(--divider-color);
  white-space:nowrap;
}
`;
  return css.replace("</style>",extra+"</style>");
};

p.renderSettings=function(){
  const html=originalRenderSettings.call(this);
  return html+`<div class="settings-version">
    <button type="button" class="settings-version-button" id="open-github-project" title="Открыть проект на GitHub">
      <span class="settings-version-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.02c-3.2.7-3.87-1.35-3.87-1.35-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18A11 11 0 0 1 12 6.1c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.35.78 1.04.78 2.1v3.1c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
      </span>
      <span class="settings-version-main">
        <span class="settings-version-title">3D Print Calculator</span>
        <span class="settings-version-sub">Исходный код и обновления</span>
      </span>
      <span class="settings-version-badge">v1.6.5</span>
    </button>
  </div>`;
};

const originalBindSettings=p.bindSettings;
p.bindSettings=function(){
  originalBindSettings.call(this);
  const btn=this.querySelector("#open-github-project");
  if(btn)btn.onclick=()=>window.open("https://github.com/menfis911/hassio-3d-print-calculator","_blank","noopener,noreferrer");
};

console.log("[3D Print Calculator] UI polish 1.6.5 loaded");
