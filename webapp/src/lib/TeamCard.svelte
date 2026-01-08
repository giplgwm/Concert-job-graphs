<script>
  import { flip } from 'svelte/animate';
  import { fly, fade, scale } from 'svelte/transition';

  let { team, members, total, flipped = false, slices = [], onFlip } = $props();

  function describeArc(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  }

  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  function exportPieChart(event) {
    event.stopPropagation();
    
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 500, 550);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Team ${team} Jobs:`, 250, 35);
    
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`Total: ${total} jobs`, 250, 55);
    
    const centerX = 250;
    const centerY = 200;
    const radius = 120;
    
    slices.forEach((slice) => {
      const startRad = (slice.startAngle - 90) * Math.PI / 180;
      const endRad = (slice.endAngle - 90) * Math.PI / 180;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startRad, endRad);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      const midAngle = (slice.startAngle + slice.endAngle) / 2;
      const labelRad = (midAngle - 90) * Math.PI / 180;
      const labelX = centerX + Math.cos(labelRad) * (radius * 0.6);
      const labelY = centerY + Math.sin(labelRad) * (radius * 0.6);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slice.name, labelX, labelY - 7);
      ctx.fillText(slice.count.toString(), labelX, labelY + 7);
    });
    
    let legendY = 350;
    ctx.textAlign = 'left';
    slices.forEach((slice) => {
      ctx.fillStyle = slice.color;
      ctx.fillRect(80, legendY - 8, 16, 16);
      
      ctx.fillStyle = '#333';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(slice.name, 105, legendY);
      
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(`${slice.count} (${slice.percentage}%)`, 350, legendY);
      
      legendY += 24;
    });
    
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `Team-${team}-jobs.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  function handleClick() {
    onFlip?.();
  }
</script>

<div class="team-card" onclick={handleClick}>
  <div class="team-header">
    <h3>{team}</h3>
    <span class="team-total">{total} jobs</span>
  </div>
  
  <div class="card-content">
    {#if !flipped}
      <div class="card-face" in:fly={{ x: -100, duration: 300, delay: 150 }} out:fly={{ x: 100, duration: 300 }}>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="rank">#</th>
                <th class="name">Name</th>
                <th class="count">Jobs</th>
                <th class="percentage">%</th>
              </tr>
            </thead>
            <tbody>
              {#each members as pf, index (pf.name)}
                <tr animate:flip={{ duration: 250 }}>
                  <td class="rank">{index + 1}</td>
                  <td class="name">{pf.name}</td>
                  <td class="count">{pf.count}</td>
                  <td class="percentage">{total > 0 ? ((pf.count / total) * 100).toFixed(1) : 0}%</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="flip-hint">Click to see pie chart</div>
      </div>
    {:else}
      <div class="card-face" in:fly={{ x: 100, duration: 300, delay: 150 }} out:fly={{ x: -100, duration: 300 }}>
        <div class="pie-container">
          <svg viewBox="0 0 200 200" class="pie-chart" id="pie-{team.replace(/\s+/g, '-')}">
            {#each slices as slice, i}
              <path
                d={describeArc(100, 100, 80, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                in:scale={{ duration: 400, delay: i * 50, start: 0 }}
              >
                <title>{slice.name}: {slice.count} ({slice.percentage}%)</title>
              </path>
            {/each}
            {#each slices as slice, i}
              <text 
                x={slice.labelX} 
                y={slice.labelY} 
                class="pie-label"
                text-anchor="middle"
                dominant-baseline="middle"
                in:fade={{ duration: 300, delay: 200 + i * 50 }}
              >
                <tspan x={slice.labelX} dy="-0.4em">{slice.name}</tspan>
                <tspan x={slice.labelX} dy="1.1em">{slice.count}</tspan>
              </text>
            {/each}
          </svg>
        </div>
        <div class="legend">
          {#each slices as slice, i}
            <div 
              class="legend-item"
              in:fade={{ duration: 200, delay: 200 + i * 30 }}
            >
              <span class="legend-color" style="background: {slice.color}"></span>
              <span class="legend-name">{slice.name}</span>
              <span class="legend-value">{slice.count}</span>
            </div>
          {/each}
        </div>
        <div class="pie-actions">
          <button class="export-btn" onclick={exportPieChart}>Export Chart</button>
        </div>
        <div class="flip-hint">Click to see table</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .team-card {
    border: 1px solid #ddd;
    border-radius: 12px;
    background: white;
    padding: 1rem;
    cursor: pointer;
    min-height: 380px;
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .team-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }

  .card-content {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .card-face {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .team-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #4CAF50;
  }

  .team-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.1rem;
  }

  .team-total {
    background: #4CAF50;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .table-container {
    flex: 1;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 8px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  thead {
    background: #4CAF50;
    color: white;
    position: sticky;
    top: 0;
  }
  
  th {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.85rem;
  }
  
  tbody tr {
    border-bottom: 1px solid #eee;
  }
  
  tbody tr:hover {
    background: #f9f9f9;
  }
  
  tbody tr:last-child {
    border-bottom: none;
  }
  
  td {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
  
  .rank {
    width: 40px;
    text-align: center;
    color: #888;
    font-weight: 500;
  }
  
  .name {
    font-weight: 500;
  }
  
  .count {
    width: 60px;
    text-align: center;
    font-weight: 600;
    color: #4CAF50;
  }
  
  .percentage {
    width: 60px;
    text-align: center;
    color: #666;
  }

  .flip-hint {
    text-align: center;
    color: #999;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    font-style: italic;
  }

  .pie-actions {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .export-btn {
    padding: 0.4rem 0.8rem;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .export-btn:hover {
    background: #1976D2;
  }

  .pie-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 0 0 auto;
  }

  .pie-chart {
    width: 180px;
    height: 180px;
  }

  .pie-chart path {
    stroke: white;
    stroke-width: 2;
    transition: transform 0.2s;
    transform-origin: center;
  }

  .pie-chart path:hover {
    transform: scale(1.05);
  }

  .pie-label {
    font-size: 8px;
    font-weight: 600;
    fill: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    pointer-events: none;
  }

  .legend {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .legend-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .legend-value {
    font-weight: 600;
    color: #4CAF50;
  }
</style>
