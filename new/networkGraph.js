d3.json('./pathways.json').then(data => {
  console.log(data);
  // nodes = data
});


// Example nodes & links: for now, make a dummy version
const pathways = [
  { id: 'Acute-phase protein response', group: 'Immune' },
  { id: 'Beta-oxidation of fatty acids', group: 'Metabolism' },
  { id: 'Coagulation pathway', group: 'Immune' }
];

const links = [
  { source: 'Acute-phase protein response', target: 'Coagulation pathway' }
];

const svg = d3.select('#network');
const width = +svg.attr('width');
const height = +svg.attr('height');

const simulation = d3.forceSimulation(pathways)
  .force('link', d3.forceLink(links).id(d => d.id).distance(200))
  .force('charge', d3.forceManyBody().strength(-500))
  .force('center', d3.forceCenter(width / 2, height / 2));

const link = svg.append('g')
  .selectAll('line')
  .data(links)
  .join('line')
  .attr('stroke', '#999');

const node = svg.append('g')
  .selectAll('circle')
  .data(pathways)
  .join('circle')
  .attr('r', 20)
  .attr('fill', d => d.group === 'Immune' ? 'lightblue' : 'lightgreen')
  .call(drag(simulation));

node.append('title').text(d => d.id);

node.on('click', (event, d) => {
  const e = new CustomEvent('pathwaySelected', { detail: d.id });
  window.dispatchEvent(e);
});

simulation.on('tick', () => {
  link
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  node
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
});

function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }
  return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
}
