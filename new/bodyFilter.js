// Load the SVG file and set up event listeners for body regions

  fetch('./assets/human-body.svg')
  .then(res => res.text())
  .then(svg => {
    const bodyContainer = document.getElementById('body');
    bodyContainer.innerHTML = svg;
    
    // Center the content horizontally
    bodyContainer.style.display = 'flex';
    bodyContainer.style.justifyContent = 'center';

    document.querySelectorAll('#body svg [id]').forEach(region => {
      region.style.cursor = 'pointer';
      region.addEventListener('click', () => {
        const event = new CustomEvent('bodyRegionSelected', { detail: region.id });
        window.dispatchEvent(event);
        console.log(`Clicked region: ${region.id}`);
      });
    });
  });