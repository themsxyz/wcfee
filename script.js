const webAppUrl = "https://script.google.com/macros/s/AKfycbz_FW9Xes7qkMYEEYyUGsAJkUDf9vIbdvXfDIgBLiqsvwZDkZhfmL_U9MQ966FSzmvQ/exec"; 

function showLoader() { document.getElementById('loader').style.display = 'flex'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

const feeSections = ["tuition","admission","readmission","exam","computer","late","sports","tc","misc"];
const feeLabels = ["Tuition Fee","Admission Fee","Re-Admission Fee","Exam Fee","Computer Fee","Late Fee","Sports Fee","T.C Fee","Miscellaneous"];
const feeIcons = ["fa-graduation-cap","fa-door-open","fa-rotate-left","fa-pen-ruler","fa-laptop-code","fa-clock","fa-futbol","fa-file-signature","fa-coins"];
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthSelect = document.getElementById("month");
months.forEach(m => monthSelect.innerHTML += `<option>${m}</option>`);

// Build professional fee form rows (no placeholders)
const feeInputsDiv = document.getElementById("feeInputs");
feeInputsDiv.innerHTML = "";
feeLabels.forEach((label, idx) => {
  const sectionKey = feeSections[idx];
  const icon = feeIcons[idx];
  const row = document.createElement('div');
  row.className = 'fee-row';
  row.innerHTML = `
    <div class="fee-label">
      <i class="fas ${icon}"></i> ${label}
    </div>
    <div class="fee-input-wrapper">
      <input type="number" id="${sectionKey}" value="" step="1">
      <span class="currency-symbol">৳</span>
    </div>
  `;
  feeInputsDiv.appendChild(row);
});

// Class dropdown options
const classOptions = ["Play", "Nursary", "Kg", "1", "2", "3", "4", "5"];

// Account fields with updated class as dropdown and no placeholder text
const accountFieldsMeta = [
  { id: "studentName", label: "ছাত্রের নাম", type: "text", icon: "fas fa-user-graduate", validation: "name", noPlaceholder: true },
  { id: "father", label: "পিতার নাম", type: "text", icon: "fas fa-user-tie", validation: "uppercase", noPlaceholder: true },
  { id: "mother", label: "মাতার নাম", type: "text", icon: "fas fa-female", validation: "uppercase", noPlaceholder: true },
  { id: "studentIdNew", label: "ছাত্র আইডি", type: "text", icon: "fas fa-id-card", placeholder: "ST-001", maxLength: 6, validation: "studentId" },
  { id: "roll", label: "রোল নম্বর", type: "number", icon: "fas fa-hashtag", placeholder: "১ থেকে ৯৯৯", maxLength: 3, validation: "roll" },
  { id: "cls", label: "শ্রেণী", type: "select", icon: "fas fa-graduation-cap", options: classOptions, validation: "none" },
  { id: "section", label: "শাখা", type: "select", icon: "fas fa-clock", options: ["day", "morning"], optionLabels: ["ডে", "মর্নিং"] },
  { id: "mobile", label: "মোবাইল নম্বর", type: "tel", icon: "fas fa-phone-alt", placeholder: "০১XXXXXXXXX", maxLength: 11, validation: "mobile" }
];

function buildAccountForm() {
  const container = document.getElementById("accountInputs");
  container.innerHTML = "";
  accountFieldsMeta.forEach(field => {
    const group = document.createElement("div");
    group.className = "field-group";

    const label = document.createElement("label");
    label.htmlFor = field.id;
    label.innerHTML = `<i class="${field.icon}" style="font-size:0.8rem;"></i> ${field.label}`;
    
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "input-icon-wrapper";
    
    const iconSpan = document.createElement("i");
    iconSpan.className = field.icon;
    iconWrapper.appendChild(iconSpan);
    
    let inputField;
    if (field.type === "select") {
      inputField = document.createElement("select");
      inputField.id = field.id;
      if (field.options) {
        field.options.forEach((opt, idx) => {
          const option = document.createElement("option");
          option.value = opt;
          if (field.optionLabels && field.optionLabels[idx]) {
            option.textContent = field.optionLabels[idx];
          } else {
            option.textContent = opt === 'day' ? 'ডে' : (opt === 'morning' ? 'মর্নিং' : opt);
          }
          inputField.appendChild(option);
        });
      }
    } else {
      inputField = document.createElement("input");
      inputField.type = field.type;
      inputField.id = field.id;
      // Only add placeholder if explicitly defined and noPlaceholder is false
      if (field.placeholder && !field.noPlaceholder) {
        inputField.placeholder = field.placeholder;
      }
      if (field.maxLength) inputField.maxLength = field.maxLength;
      if (field.type === "number") inputField.setAttribute("min", "1");
    }
    iconWrapper.appendChild(inputField);
    group.appendChild(label);
    group.appendChild(iconWrapper);
    
    const hintSpan = document.createElement("div");
    hintSpan.className = "input-hint";
    if (field.validation === "name") hintSpan.innerHTML = "<i class='fas fa-info-circle'></i> প্রথম অক্ষর বড় হাতের হবে";
    else if (field.validation === "uppercase") hintSpan.innerHTML = "<i class='fas fa-arrow-up'></i> শুধুমাত্র বড় হাতের অক্ষর";
    else if (field.validation === "roll") hintSpan.innerHTML = "<i class='fas fa-sort-numeric-up'></i> সর্বোচ্চ ৩ ডিজিট";
    else if (field.validation === "studentId") hintSpan.innerHTML = "<i class='fas fa-key'></i> সর্বোচ্চ ৬ অক্ষর (ST-XXX)";
    else if (field.validation === "mobile") hintSpan.innerHTML = "<i class='fas fa-mobile-alt'></i> ১১ ডিজিট দিন (+88 স্বয়ংক্রিয়)";
    else if (field.id === "cls") hintSpan.innerHTML = "<i class='fas fa-school'></i> শ্রেণি নির্বাচন করুন";
    if (hintSpan.innerHTML) group.appendChild(hintSpan);
    
    container.appendChild(group);
  });
  attachAccountFormatters();
}

function attachAccountFormatters() {
  const nameField = document.getElementById('studentName');
  const fatherField = document.getElementById('father');
  const motherField = document.getElementById('mother');
  const rollField = document.getElementById('roll');
  const studentIdField = document.getElementById('studentIdNew');
  const mobileField = document.getElementById('mobile');
  if (nameField) {
    nameField.addEventListener('input', function(e) {
      let val = e.target.value.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      e.target.value = val;
    });
  }
  if (fatherField) {
    fatherField.addEventListener('input', e => e.target.value = e.target.value.toUpperCase());
  }
  if (motherField) {
    motherField.addEventListener('input', e => e.target.value = e.target.value.toUpperCase());
  }
  if (rollField) {
    rollField.addEventListener('input', function(e) {
      let val = e.target.value.replace(/[^0-9]/g, '').slice(0,3);
      e.target.value = val;
    });
  }
  if (studentIdField) {
    studentIdField.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase().slice(0,6);
    });
  }
  if (mobileField) {
    mobileField.addEventListener('input', function(e) {
      let val = e.target.value.replace(/[^0-9]/g, '').slice(0,11);
      e.target.value = val;
    });
  }
}

function validateForm() {
  const errors = [];
  const name = document.getElementById('studentName')?.value || "";
  if (name && !/^[A-Z\u0980-\u09FF]/.test(name)) errors.push('নামের প্রথম অক্ষর বড় হাতের হতে হবে');
  const father = document.getElementById('father')?.value || "";
  const mother = document.getElementById('mother')?.value || "";
  if (father && father !== father.toUpperCase()) errors.push('পিতার নাম শুধুমাত্র বড় হাতের অক্ষর');
  if (mother && mother !== mother.toUpperCase()) errors.push('মাতার নাম শুধুমাত্র বড় হাতের অক্ষর');
  const roll = document.getElementById('roll')?.value || "";
  if (roll && (roll.length > 3 || !/^\d+$/.test(roll))) errors.push('রোল সর্বোচ্চ ৩ ডিজিট সংখ্যা হতে হবে');
  const studentId = document.getElementById('studentIdNew')?.value || "";
  if (studentId && studentId.length > 6) errors.push('আইডি সর্বোচ্চ ৬ অক্ষর');
  const mobile = document.getElementById('mobile')?.value || "";
  if (mobile && !/^\d{11}$/.test(mobile)) errors.push('মোবাইল ১১ ডিজিট হতে হবে (উদা: 017XXXXXXXX)');
  const errorDiv = document.getElementById('validationErrors');
  if (errors.length) { 
    errorDiv.innerHTML = errors.map(e => `<i class="fas fa-exclamation-circle"></i> ${e}`).join('<br>'); 
    return false; 
  }
  errorDiv.innerHTML = '';
  return true;
}

function searchStudent() {
  const id = document.getElementById("searchId").value.trim();
  if (!id) { alert("ছাত্র আইডি লিখুন"); return; }
  showLoader();
  fetch(webAppUrl)
    .then(res => res.json())
    .then(data => {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        const storedId = (data[i][3] || "").toString().trim();
        if (storedId === id) { found = true; break; }
      }
      if (found) {
        document.getElementById("feeFormDiv").style.display = "block";
        document.getElementById("createFormDiv").style.display = "none";
      } else {
        document.getElementById("createFormDiv").style.display = "block";
        document.getElementById("feeFormDiv").style.display = "none";
      }
    })
    .catch(err => alert("ডেটা আনতে সমস্যা: " + err))
    .finally(() => hideLoader());
}

function createAccount() {
  if (!validateForm()) return;
  const data = { action: "create" };
  accountFieldsMeta.forEach(f => {
    let value = document.getElementById(f.id)?.value.trim() || "";
    if (f.id === 'mobile' && value) value = '+88' + value;
    data[f.id] = value;
  });
  showLoader();
  fetch(webAppUrl, {
    method: "POST",
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(resp => {
      if (resp.result === "created") {
        alert("🎉 অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!");
        document.getElementById("searchId").value = data.studentIdNew;
        searchStudent();
      } else { alert("ত্রুটি! আবার চেষ্টা করুন।"); }
    })
    .catch(err => alert("ত্রুটি: " + err))
    .finally(() => hideLoader());
}

function submitFee() {
  const fees = {};
  feeSections.forEach(f => {
    const val = document.getElementById(f)?.value;
    fees[f] = val === '' ? 0 : Number(val);
  });
  const studentId = document.getElementById("searchId").value.trim();
  const month = document.getElementById("month").value;
  if (!studentId) { alert("ছাত্র আইডি পাওয়া যায়নি"); return; }
  const data = { action: "fee", studentId, month, fees };
  showLoader();
  fetch(webAppUrl, {
    method: "POST",
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(resp => {
      if (resp.result === "success") alert("✅ ফি জমা হয়েছে!");
      else alert("ত্রুটি! ফি জমা হয়নি।");
    })
    .catch(err => alert("ত্রুটি: " + err))
    .finally(() => hideLoader());
}

async function printReceipt() {
  const studentId = document.getElementById("searchId").value.trim();
  const month = document.getElementById("month").value;
  if (!studentId || !month) { alert("ছাত্র আইডি ও মাস নির্বাচন করুন"); return; }
  const fees = {};
  feeSections.forEach(f => { const val = document.getElementById(f)?.value; fees[f] = val === '' ? 0 : Number(val); });
  showLoader();
  try {
    const detailsUrl = webAppUrl + "?action=getStudentDetails&studentId=" + encodeURIComponent(studentId);
    const detailsRes = await fetch(detailsUrl);
    const student = await detailsRes.json();
    if (student.error) throw new Error(student.error);
    const receiptRes = await fetch(webAppUrl, { method: "POST", body: JSON.stringify({ action: "generateReceipt", studentId, month }) });
    const receiptData = await receiptRes.json();
    if (!receiptData.receiptNumber) throw new Error("রশিদ নম্বর পাওয়া যায়নি");
    const receiptNo = receiptData.receiptNumber;
    const currentDateTime = new Date().toLocaleString('bn-BD');
    function buildStudentRows() { return [['নাম', student.name || '—'], ['শ্রেণী', student.class || '—'], ['রোল', student.roll || '—'], ['শাখা', student.section || '—'], ['আইডি', student.id || '—'], ['মোবাইল', student.mobile || '—']]; }
    function buildFeeItems() { const items = []; let total = 0; feeSections.forEach((key, idx) => { const amt = fees[key]; if(amt>0 || key==='tuition'){ items.push([feeLabels[idx], amt + ' Tk']); total += amt; } }); return { items, total }; }
    const createReceiptColumn = (copyName) => {
      const studentRows = buildStudentRows(); const { items, total } = buildFeeItems();
      return { stack: [ { text: 'WESTERN SCHOOL AND COLLEGE', style: 'schoolHeader', alignment: 'center' }, { text: 'Didar Market-Chawkbazar, Chittagong', alignment: 'center', fontSize: 8, margin: [0,0,0,4] }, { text: 'STUDENT FEE RECEIPT', style: 'receiptTitle', alignment: 'center', margin: [0,0,0,6] }, { text: copyName, style: 'copyTitle', alignment: 'center', margin: [0,0,0,8] }, { text: `Receipt No: ${receiptNo}`, alignment: 'center', margin: [0,0,0,2] }, { text: `Month: ${month}`, alignment: 'center', margin: [0,0,0,2] }, { text: `Fee taking date & time: ${currentDateTime}`, alignment: 'center', margin: [0,0,0,2] }, { table: { widths: ['auto','*'], body: studentRows }, layout: 'noBorders', margin:[0,0,0,12] }, { table: { widths: ['*', 'auto'], body: [[{ text: 'Description', style: 'tableHeader' }, { text: 'Amount', style: 'tableHeader' }], ...items, [{ text: 'Total', style: 'totalLabel' }, { text: total + ' Tk', style: 'totalAmount' }]] }, layout: 'lightHorizontalLines', margin:[0,0,0,12] }, { text: 'Payment Method: Cash / Bank', margin:[0,0,0,10] }, { columns: [ { width:'50%', stack:[ { text:'_____________________', alignment:'left' }, { text:"Accountant's Sign", alignment:'left', margin:[0,2,0,0] } ] }, { width:'50%', stack:[ { text:'_____________________', alignment:'right' }, { text:"Guardian's Sign", alignment:'right', margin:[0,2,0,0] } ] } ] } ] };
    };
    const docDefinition = { pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [20,20,20,20], content: [ { columns: [createReceiptColumn('School Copy'), createReceiptColumn('Bank Copy'), createReceiptColumn('Guardian Copy')], columnGap: 8 } ], styles: { schoolHeader:{ fontSize:12, bold:true }, receiptTitle:{ fontSize:11, bold:true, decoration:'underline' }, copyTitle:{ fontSize:11, bold:true, italics:true }, tableHeader:{ bold:true, fillColor:'#f2f2f2' }, totalLabel:{ bold:true }, totalAmount:{ bold:true } }, defaultStyle: { fontSize:9 } };
    pdfMake.createPdf(docDefinition).download(`Receipt_${receiptNo}.pdf`);
  } catch(err) { alert("রশিদ তৈরি করতে সমস্যা: " + err.message); } finally { hideLoader(); }
}

document.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    const active = document.activeElement;
    if (active.id === 'searchId') { e.preventDefault(); searchStudent(); }
    else if (document.getElementById('createFormDiv').style.display === 'block' && active.closest('#accountInputs')) { e.preventDefault(); createAccount(); }
    else if (document.getElementById('feeFormDiv').style.display === 'block' && (feeSections.some(f => active.id === f) || active.id === 'month')) { e.preventDefault(); submitFee(); }
  }
});

// dark mode & hamburger
const darkToggle = document.getElementById('darkModeToggle');
const setTheme = (isDark) => {
  if (isDark) { document.body.classList.add('dark'); darkToggle.innerHTML = '<i class="fas fa-sun"></i>'; localStorage.setItem('theme', 'dark'); }
  else { document.body.classList.remove('dark'); darkToggle.innerHTML = '<i class="fas fa-moon"></i>'; localStorage.setItem('theme', 'light'); }
};
if (localStorage.getItem('theme') === 'dark') setTheme(true);
darkToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));

const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');
hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); navMenu.classList.toggle('show'); });
document.addEventListener('click', (e) => { if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) navMenu.classList.remove('show'); });

// initialize account form
buildAccountForm();
