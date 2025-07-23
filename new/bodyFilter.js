// Load your SVG into the #body div
fetch('./assets/human-body.svg')
  .then(res => res.text())
  .then(svg => {
    document.getElementById('body').innerHTML = svg;

    // Make regions clickable
    document.querySelectorAll('#body svg [id]').forEach(region => {
      region.style.cursor = 'pointer';
      region.addEventListener('click', () => {
        const event = new CustomEvent('bodyRegionSelected', { detail: region.id });
        window.dispatchEvent(event);
      });
    });
  });
