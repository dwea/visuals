const svg = d3.select('#network');
const width = +svg.attr('width');
const height = +svg.attr('height');

d3.json('./pathways.json').then(data => {
  const nodes = data;

  // Dummy links for demo — add real ones later if you have them
  const links = nodes.slice(1).map((n, i) => ({
    source: nodes[0].id,
    target: n.id
  }));

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(200))
    .force('charge', d3.forceManyBody().strength(-500))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#aaa');

  const node = svg.append('g')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', 20)
    .attr('fill', d => {
      if (d.group === 'Immune') return '#a6cee3';
      if (d.group === 'Metabolism') return '#b2df8a';
      if (d.group === 'Transport') return '#fb9a99';
      if (d.group === 'Stress') return '#fdbf6f';
      return '#cccccc';
    })
    .call(drag(simulation));

  node.append('title').text(d => d.id);

  node.on('click', (event, d) => {
    const e = new CustomEvent('pathwaySelected', { detail: d });
    window.dispatchEvent(e);
    console.log(`Clicked node: ${d.id}`);
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
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
  }
});
