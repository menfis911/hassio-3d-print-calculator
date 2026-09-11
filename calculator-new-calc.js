const CalculatorNewCalc=customElements.get("three-d-print-calculator");
if(!CalculatorNewCalc)throw new Error("3D calculator main component was not registered");
const newCalcProto=CalculatorNewCalc.prototype;
const previousNewCalcBind=newCalcProto.bindCalculator;

newCalcProto.bindCalculator=function(){
  previousNewCalcBind.call(this);
  const fresh=this.querySelector("#new-calc");
  if(!fresh)return;
  fresh.onclick=()=>{
    const current=this.data.calculator||{};
    const next=this.clone(this.defaults.calculator);
    next.materialId=current.materialId||next.materialId;
    next.printerId=current.printerId||next.printerId;
    next.weight=0;
    next.hours=0;
    next.minutes=0;
    next.quantity=1;
    next.packaging=0;
    next.postProcessing=0;
    next.labor=0;
    next.packagingQty=0;
    next.postProcessingQty=1;
    next.postProcessingQtyManual=false;
    next.customerType="retail";
    next.urgent=false;
    next.customerId="";
    next.customerName="";
    this.data.calculator=next;
    this.orderItems=[];
    this.activeTab="calculator";
    this.saveData();
    this.render();
    this.toast("✓ Новый расчёт");
  };
};

console.log("[3D Print Calculator] new calculation defaults loaded");
