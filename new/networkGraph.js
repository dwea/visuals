const svg = d3.select('#network');
const width = +svg.attr('width');
const height = +svg.attr('height');

d3.json('./pathways.json').then(data => {
  const nodes = data.pathways;
  const links = data.connections.map(d => ({
    source: d.source,
    target: d.target,
    type: d.type,
    strength: d.strength,
    description: d.description
  }));

  // Create color scales for different connection types
  const linkColorScale = d3.scaleOrdinal()
    .domain(['metabolic_flow', 'functional', 'shared_biomarkers', 'precursor'])
    .range(['#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

  // Create simulation with clustering forces
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(d => 150 - (d.strength * 50)) // Stronger connections = shorter distance
      .strength(d => d.strength * 0.5))
    .force('charge', d3.forceManyBody()
      .strength(-800)
      .distanceMax(400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide()
      .radius(d => Math.max(80, d.id.length * 4 + 40))
      .strength(0.7))
    // Group clustering force - pulls nodes of same group together
    .force('group', function(alpha) {
      const groups = d3.group(nodes, d => d.group);
      const groupCenters = new Map();
      
      // Calculate group centers
      groups.forEach((groupNodes, groupName) => {
        let cx = 0, cy = 0;
        groupNodes.forEach(node => {
          cx += node.x || 0;
          cy += node.y || 0;
        });
        groupCenters.set(groupName, {
          x: cx / groupNodes.length,
          y: cy / groupNodes.length
        });
      });
      
      // Apply clustering force
      nodes.forEach(node => {
        const center = groupCenters.get(node.group);
        if (center && center.x && center.y) {
          const dx = center.x - (node.x || 0);
          const dy = center.y - (node.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            const force = alpha * 0.1;
            node.vx = (node.vx || 0) + dx * force * 0.1;
            node.vy = (node.vy || 0) + dy * force * 0.1;
          }
        }
      });
    });

  // Create links with different styles based on type
  const link = svg.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', d => linkColorScale(d.type))
    .attr('stroke-width', d => Math.max(1, d.strength * 4))
    .attr('stroke-opacity', 0.7)
    .attr('stroke-dasharray', d => {
      if (d.type === 'shared_biomarkers') return '5,5';
      if (d.type === 'precursor') return '3,3';
      return null;
    });

  // Add link labels for connection types
  const linkLabels = svg.append('g')
    .attr('class', 'link-labels')
    .selectAll('text')
    .data(links)
    .join('text')
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .attr('text-anchor', 'middle')
    .attr('pointer-events', 'none')
    .style('opacity', 0)
    .text(d => d.type.replace('_', ' '));

  // Create node groups to hold both rectangle and text
  const nodeGroup = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .call(drag(simulation));

  // Add rectangles to node groups with enhanced styling
  const nodeRect = nodeGroup.append('rect')
    .attr('width', d => Math.max(100, d.id.length * 8 + 30))
    .attr('height', 45)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', d => {
      const groupColors = {
        'Immune': '#4e79a7',
        'Metabolism': '#59a14f', 
        'Transport': '#edc949',
        'Stress': '#e15759'
      };
      return groupColors[d.group] || '#cccccc';
    })
    .attr('stroke', d => {
      const groupColors = {
        'Immune': '#2c5882',
        'Metabolism': '#3d7a3d',
        'Transport': '#b8a23a',
        'Stress': '#b23e3f'
      };
      return groupColors[d.group] || '#999999';
    })
    .attr('stroke-width', 2)
    .attr('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');

  // Add text labels to node groups
  const nodeText = nodeGroup.append('text')
    .text(d => d.id)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', 'Arial, sans-serif')
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white')
    .attr('pointer-events', 'none');

  // Add group badges
  const groupBadge = nodeGroup.append('circle')
    .attr('r', 8)
    .attr('fill', d => {
      const badgeColors = {
        'Immune': '#ff6b6b',
        'Metabolism': '#4ecdc4',
        'Transport': '#45b7d1',
        'Stress': '#f9ca24'
      };
      return badgeColors[d.group] || '#cccccc';
    })
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  // Add group letters to badges
  const badgeText = nodeGroup.append('text')
    .text(d => d.group.charAt(0))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', 'Arial, sans-serif')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white')
    .attr('pointer-events', 'none');

  // Enhanced hover effects
  nodeGroup
    .on('mouseover', function(event, d) {
      // Highlight the node
      d3.select(this).select('rect')
        .attr('stroke-width', 4)
        .transition().duration(200)
        .attr('transform', 'scale(1.05)');
      
      // Highlight connected links
      link
        .transition().duration(200)
        .attr('stroke-opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1)
        .attr('stroke-width', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 
          Math.max(2, l.strength * 6) : Math.max(1, l.strength * 4));
      
      // Show link labels for connected edges
      linkLabels
        .transition().duration(200)
        .style('opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0);
      
      // Highlight connected nodes
      nodeGroup
        .transition().duration(200)
        .style('opacity', n => {
          if (n.id === d.id) return 1;
          const connected = links.some(l => 
            (l.source.id === d.id && l.target.id === n.id) ||
            (l.target.id === d.id && l.source.id === n.id));
          return connected ? 1 : 0.3;
        });
    })
    .on('mouseout', function(event, d) {
      // Reset node appearance
      d3.select(this).select('rect')
        .attr('stroke-width', 2)
        .transition().duration(200)
        .attr('transform', 'scale(1)');
      
      // Reset all elements
      link
        .transition().duration(200)
        .attr('stroke-opacity', 0.7)
        .attr('stroke-width', l => Math.max(1, l.strength * 4));
      
      linkLabels
        .transition().duration(200)
        .style('opacity', 0);
      
      nodeGroup
        .transition().duration(200)
        .style('opacity', 1);
    });

  // Add click handler
  nodeGroup.on('click', (event, d) => {
    const e = new CustomEvent('pathwaySelected', { detail: d });
    window.dispatchEvent(e);
    console.log(`Clicked node: ${d.id}`);
  });

  // Enhanced tooltip with connection information
  nodeGroup.append('title').text(d => {
    const connections = links.filter(l => l.source.id === d.id || l.target.id === d.id);
    const connectedPathways = connections.map(l => 
      l.source.id === d.id ? l.target.id : l.source.id);
    return `${d.id}\nGroup: ${d.group}\nBiomarkers: ${d.biomarkers.length}\nConnections: ${connectedPathways.join(', ')}`;
  });

  // Add tooltips to links
  link.append('title').text(d => 
    `${d.source.id} ↔ ${d.target.id}\nType: ${d.type}\nStrength: ${d.strength}\n${d.description}`);

  // Animation loop
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    // Position link labels at midpoint
    linkLabels
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    // Position node groups
    nodeGroup.attr('transform', d => {
      const rectWidth = Math.max(100, d.id.length * 8 + 30);
      const rectHeight = 45;
      return `translate(${d.x - rectWidth/2}, ${d.y - rectHeight/2})`;
    });

    // Position text at center of rectangle
    nodeText
      .attr('x', d => Math.max(100, d.id.length * 8 + 30) / 2)
      .attr('y', 22.5);

    // Position group badge in top-right corner
    groupBadge
      .attr('cx', d => Math.max(100, d.id.length * 8 + 30) - 12)
      .attr('cy', 12);

    badgeText
      .attr('x', d => Math.max(100, d.id.length * 8 + 30) - 12)
      .attr('y', 12);
  });

  // Add legend for connection types
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(20, 20)`);

  const legendData = [
    { type: 'metabolic_flow', label: 'Metabolic Flow', color: '#ff7f0e' },
    { type: 'functional', label: 'Functional', color: '#2ca02c' },
    { type: 'shared_biomarkers', label: 'Shared Biomarkers', color: '#d62728', dash: '5,5' },
    { type: 'precursor', label: 'Precursor', color: '#9467bd', dash: '3,3' }
  ];

  const legendItems = legend.selectAll('.legend-item')
    .data(legendData)
    .join('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${i * 20})`);

  legendItems.append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 3)
    .attr('stroke-dasharray', d => d.dash || null);

  legendItems.append('text')
    .attr('x', 25)
    .attr('y', 0)
    .attr('dy', '0.35em')
    .attr('font-family', 'Arial, sans-serif')
    .attr('font-size', '12px')
    .attr('fill', '#333')
    .text(d => d.label);

  // Drag functionality
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