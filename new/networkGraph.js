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
    .attr('stroke', '#aaa')
    .attr('stroke-width', 2);

  // Create node groups to hold both rectangle and text
  const nodeGroup = svg.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .call(drag(simulation));

  // Add rectangles to node groups
  const nodeRect = nodeGroup.append('rect')
    .attr('width', d => Math.max(80, d.id.length * 8 + 20)) // Dynamic width based on text length
    .attr('height', 40)
    .attr('rx', 5) // Rounded corners
    .attr('ry', 5)
    .attr('fill', d => {
      if (d.group === 'Immune') return '#a6cee3';
      if (d.group === 'Metabolism') return '#b2df8a';
      if (d.group === 'Transport') return '#fb9a99';
      if (d.group === 'Stress') return '#fdbf6f';
      return '#cccccc';
    })
    .attr('stroke', '#333')
    .attr('stroke-width', 1);

  // Add text labels to node groups
  const nodeText = nodeGroup.append('text')
    .text(d => d.id)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', 'Arial, sans-serif')
    .attr('font-size', '12px')
    .attr('fill', '#333')
    .attr('pointer-events', 'none'); // Prevent text from interfering with mouse events

  // Add hover effects
  nodeGroup
    .on('mouseover', function(event, d) {
      d3.select(this).select('rect')
        .attr('stroke-width', 2)
        .attr('stroke', '#000');
    })
    .on('mouseout', function(event, d) {
      d3.select(this).select('rect')
        .attr('stroke-width', 1)
        .attr('stroke', '#333');
    });

  // Add click handler
  nodeGroup.on('click', (event, d) => {
    const e = new CustomEvent('pathwaySelected', { detail: d });
    window.dispatchEvent(e);
    console.log(`Clicked node: ${d.id}`);
  });

  // Add tooltip
  nodeGroup.append('title').text(d => `${d.id} (${d.group || 'Unknown'})`);

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    // Position node groups (rectangles will be positioned relative to group)
    nodeGroup.attr('transform', d => {
      // Center the rectangle on the node position
      const rectWidth = Math.max(80, d.id.length * 8 + 20);
      const rectHeight = 40;
      return `translate(${d.x - rectWidth/2}, ${d.y - rectHeight/2})`;
    });

    // Position text at center of rectangle
    nodeText
      .attr('x', d => Math.max(80, d.id.length * 8 + 20) / 2)
      .attr('y', 20); // Half of rectangle height
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
    
    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }
});
