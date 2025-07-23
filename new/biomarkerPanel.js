// Example biomarker table, real one should come from your data file
const biomarkerTable = {
  'Acute-phase protein response': [
    'Serum amyloid A-4 protein',
    'Haptoglobin',
    'Fibronectin'
  ],
  'Beta-oxidation of fatty acids': [
    'Carnitine',
    'Acylcarnitines'
  ],
  'Coagulation pathway': [
    'von Willebrand Factor',
    'Prothrombin'
  ]
};

// Listen for pathwaySelected → update panel
window.addEventListener('pathwaySelected', e => {
  const biomarkers = biomarkerTable[e.detail] || [];
  const list = document.getElementById('biomarker-list');
  list.innerHTML = '';
  biomarkers.forEach(b => {
    const li = document.createElement('li');
    li.textContent = b;
    list.appendChild(li);
  });
});

