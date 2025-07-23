window.addEventListener('pathwaySelected', e => {
  const pathway = e.detail;
  const biomarkers = pathway.biomarkers || [];
  const list = document.getElementById('biomarker-list');
  list.innerHTML = '';
  biomarkers.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    list.appendChild(li);
  });
});
