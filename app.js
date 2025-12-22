// app.js

// === GLOBAL VARIABLES ===
let lineChart, stackedChart;
let debts = [];

// === DOM ELEMENTS ===
const form = document.getElementById('calculatorForm');
const resultsDiv = document.getElementById('multiResults');
const budgetBtn = document.getElementById('calcBudget');
const budgetResult = document.getElementById('budgetResult');
const darkModeToggle = document.getElementById('darkModeToggle');

const whatIfPayment = document.getElementById('whatIfPayment');
const whatIfPaymentVal = document.getElementById('whatIfPaymentVal');
const whatIfAPR = document.getElementById('whatIfAPR');
const whatIfAPRVal = document.getElementById('whatIfAPRVal');
const whatIfOutput = document.getElementById('whatIfOutput');

const progressCanvas = document.getElementById('progressRing');
const progressCtx = progressCanvas.getContext('2d');
let progressPercent = 0;

// Load localStorage
if(localStorage.getItem('debts')) debts = JSON.parse(localStorage.getItem('debts'));

// === DARK MODE TOGGLE ===
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// === SINGLE DEBT CALCULATOR ===
form.addEventListener('submit', e => {
    e.preventDefault();
    const balance = parseFloat(document.getElementById('balance').value);
    const apr = parseFloat(document.getElementById('apr').value)/100;
    const minPayment = parseFloat(document.getElementById('minPayment').value);
    const payoffDate = new Date(document.getElementById('payoffDate').value);
    const today = new Date();

    const months = Math.max(1, Math.ceil((payoffDate.getFullYear()-today.getFullYear())*12 + (payoffDate.getMonth()-today.getMonth())));
    const monthlyRate = apr/12;
    const monthlyPayment = (monthlyRate*balance)/(1 - Math.pow(1+monthlyRate, -months));
    const extraPayment = monthlyPayment - minPayment;

    let remaining = balance;
    let totalInterest = 0;
    const balanceData = [], principalData = [], interestData = [];

    for(let i=0;i<months;i++){
        const interest = remaining*monthlyRate;
        const principal = monthlyPayment-interest;
        totalInterest += interest;
        remaining -= principal;
        balanceData.push(remaining>0?remaining:0);
        principalData.push(principal);
        interestData.push(interest);
    }

    renderCharts(balanceData, principalData, interestData);
    updateProgress(balance, balanceData[balanceData.length-1]);
});

// === BUDGET PAYOFF CALCULATOR ===
budgetBtn.addEventListener('click', () => {
    const balance = parseFloat(document.getElementById('balance').value);
    const apr = parseFloat(document.getElementById('apr').value)/100;
    let monthlyPay = parseFloat(document.getElementById('budgetPayment').value);
    if(monthlyPay <= balance*apr/12){ alert("Payment too low!"); return; }
    let remaining = balance, months=0;
    while(remaining>0){ remaining = remaining*(1+apr/12)-monthlyPay; months++; }
    const today = new Date();
    const payoffDate = new Date(today.getFullYear(), today.getMonth()+months, today.getDate());
    budgetResult.textContent = `You will be debt-free by: ${payoffDate.toDateString()}`;
});

// === MULTI DEBT MANAGEMENT ===
function renderDebtInputs(){
    const debtList = document.getElementById('debt-list');
    debtList.innerHTML = '';
    debts.forEach((d, i)=>{
        const div = document.createElement('div');
        div.className = 'debt-item';
        div.innerHTML = `
            <input type="text" placeholder="Debt Name" value="${d.name}" data-index="${i}" class="debtName">
            <input type="number" placeholder="Balance" value="${d.balance}" class="debtBalance">
            <input type="number" placeholder="APR (%)" value="${d.apr}" class="debtAPR">
            <input type="number" placeholder="Min Payment" value="${d.minPayment}" class="debtMinPayment">
            <button class="removeDebt" data-index="${i}">Remove</button>
        `;
        debtList.appendChild(div);
    });

    // Remove debt
    document.querySelectorAll('.removeDebt').forEach(btn=>{
        btn.addEventListener('click', e=>{
            const idx = parseInt(e.target.dataset.index);
            debts.splice(idx,1);
            saveDebts();
            renderDebtInputs();
        });
    });

    // Update debts on input
    document.querySelectorAll('.debt-item input').forEach(input=>{
        input.addEventListener('input', e=>{
            const idx = parseInt(input.parentElement.querySelector('.debtName').dataset.index);
            const d = debts[idx];
            if(input.classList.contains('debtName')) d.name = input.value;
            if(input.classList.contains('debtBalance')) d.balance = parseFloat(input.value);
            if(input.classList.contains('debtAPR')) d.apr = parseFloat(input.value);
            if(input.classList.contains('debtMinPayment')) d.minPayment = parseFloat(input.value);
            saveDebts();
        });
    });
}
function saveDebts(){
    localStorage.setItem('debts', JSON.stringify(debts));
}
document.getElementById('addDebt').addEventListener('click', ()=>{
    debts.push({name:'', balance:0, apr:0, minPayment:0});
    saveDebts();
    renderDebtInputs();
});
document.getElementById('runMultiDebt').addEventListener('click', ()=>{
    const method = document.querySelector('input[name="method"]:checked').value;
    let sortedDebts = [...debts];
    if(method==='snowball') sortedDebts.sort((a,b)=>a.balance-b.balance);
    else sortedDebts.sort((a,b)=>b.apr-a.apr);

    let totalMonths = 0, summary = '';
    sortedDebts.forEach(d=>{
        const monthlyRate = d.apr/12/100;
        const minPay = d.minPayment;
        let remaining = d.balance, months=0;
        while(remaining>0){
            remaining = remaining*(1+monthlyRate)-minPay;
            months++;
        }
        totalMonths += months;
        summary += `${d.name || 'Debt'} cleared in ${months} months.<br>`;
    });
    summary += `<strong>Total payoff time: ${totalMonths} months</strong>`;
    resultsDiv.innerHTML = summary;
});

// Initialize multi debt inputs
renderDebtInputs();

// === WHAT IF SLIDERS ===
whatIfPaymentVal.textContent = `$${whatIfPayment.value}`;
whatIfAPRVal.textContent = `${whatIfAPR.value}%`;

whatIfPayment.addEventListener('input', ()=>{
    whatIfPaymentVal.textContent = `$${whatIfPayment.value}`;
});
whatIfAPR.addEventListener('input', ()=>{
    whatIfAPRVal.textContent = `${whatIfAPR.value}%`;
});

document.getElementById('runWhatIf').addEventListener('click', ()=>{
    const balance = parseFloat(document.getElementById('balance').value) || 1000;
    const apr = parseFloat(whatIfAPR.value)/100;
    const pay = parseFloat(whatIfPayment.value);
    if(pay <= balance*apr/12){ whatIfOutput.textContent="Payment too low!"; return; }
    let remaining = balance, months=0, totalInterest=0;
    while(remaining>0){
        const interest = remaining*apr/12;
        totalInterest += interest;
        remaining = remaining+interest-pay;
        months++;
    }
    whatIfOutput.textContent = `Payoff in ${months} months, total interest: $${totalInterest.toFixed(2)}`;
});

// === CHARTS ===
function renderCharts(balanceData, principalData, interestData){
    const labels = balanceData.map((_,i)=>`Month ${i+1}`);

    // Line Chart
    if(lineChart) lineChart.destroy();
    const ctxLine = document.getElementById('payoffChart').getContext('2d');
    lineChart = new Chart(ctxLine, {
        type:'line',
        data:{labels, datasets:[{label:'Remaining Balance', data:balanceData, borderColor:'#00bfff', fill:true, backgroundColor:'rgba(0,191,255,0.2)', tension:0.3}]},
        options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });

    // Stacked Bar Chart
    if(stackedChart) stackedChart.destroy();
    const ctxStack = document.getElementById('stackedChart').getContext('2d');
    stackedChart = new Chart(ctxStack,{
        type:'bar',
        data:{labels, datasets:[
            {label:'Principal', data:principalData, backgroundColor:'#0073e6'},
            {label:'Interest', data:interestData, backgroundColor:'#00bfff'}
        ]},
        options:{responsive:true, plugins:{legend:{position:'top'}}, scales:{x:{stacked:true}, y:{stacked:true, beginAtZero:true}}}
    });
}

// === PROGRESS RING ===
function updateProgress(totalBalance, remaining){
    progressPercent = Math.min(100, ((totalBalance-remaining)/totalBalance)*100);
    const ctx = progressCtx;
    const center = progressCanvas.width/2;
    const radius = center-15;

    ctx.clearRect(0,0,progressCanvas.width, progressCanvas.height);

    // Background Circle
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI*2);
    ctx.strokeStyle = '#1a1f2f';
    ctx.lineWidth = 15;
    ctx.stroke();

    // Progress Arc
    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI/2, (-Math.PI/2) + (Math.PI*2)*(progressPercent/100));
    ctx.strokeStyle = '#00bfff';
    ctx.lineWidth = 15;
    ctx.stroke();

    // Text
    ctx.font = '20px Roboto';
    ctx.fillStyle = '#00bfff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progressPercent.toFixed(1)}% Paid`, center, center);
}

// === EXPORTS ===
document.getElementById('downloadPDF').addEventListener('click', ()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Credit Card Payoff Plan", 20, 20);
    doc.save('PayoffPlan.pdf');
});

document.getElementById('downloadCSV').addEventListener('click', ()=>{
    let csv = "Debt,Balance,APR,MinPayment\n";
    debts.forEach(d=>{ csv+=`${d.name},${d.balance},${d.apr},${d.minPayment}\n`; });
    const blob = new Blob([csv], {type:'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'debts.csv';
    link.click();
});

// Shareable link
document.getElementById('sharePlan').addEventListener('click', ()=>{
    const params = debts.map(d=>`name=${encodeURIComponent(d.name)}&bal=${d.balance}&apr=${d.apr}&min=${d.minPayment}`).join('&');
    const url = `${window.location.href.split('?')[0]}?${params}`;
    prompt("Copy your shareable link:", url);
});

// === SMART TIP ===
const smartTips = [
    "Pay extra on highest APR debt to save the most interest.",
    "Even $20 more per month can drastically reduce interest.",
    "Snowball method helps with motivation by clearing smaller debts first.",
    "Negotiate APR with your credit card company for faster payoff."
];
function updateSmartTip(){
    const tip = smartTips[Math.floor(Math.random()*smartTips.length)];
    document.getElementById('smartTip').textContent = tip;
}
setInterval(updateSmartTip, 10000);
updateSmartTip();
