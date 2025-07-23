fetch('./assets/human-body.svg')
  .then(res => res.text())
  .then(svg => {
    document.getElementById('body').innerHTML = svg;

    document.querySelectorAll('#body svg [id]').forEach(region => {
      region.style.cursor = 'pointer';
      region.addEventListener('click', () => {
        const event = new CustomEvent('bodyRegionSelected', { detail: region.id });
        window.dispatchEvent(event);
        console.log(`Clicked region: ${region.id}`);
      });
    });
  });
