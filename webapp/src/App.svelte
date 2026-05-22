<script>
  import { flip } from 'svelte/animate';
  import TeamCard from './lib/TeamCard.svelte';
  
  const teamLayout = {
    "CCarter": ["FFunke", "CBenson", "LDyar", "MMichik", "BThomas"],
    "CFurbush": ["SBarber", "ATaylor", "KRenner", "JFlowers"],
    "JRoyer": ["CViet", "BMercer", "BBoger", "ERose", "PMcCauley", "TWilson", "SMellott"],
    "JWinland": ["CRouss", "DMalloy", "SdeLaet"],
    "CDuckworth": ["SConaughty", "DWells", "MBethel"],
    "CMills": ["BUlan", "JSpielman", "MMarple", "IBurkett"],
    "ISW": ["ABerry","JScott","AGrant","GVider","JJenkins","SNavarro","TKennedy","JMosley","KLowe","AReynoso","CLow","SGordy","JKing","SJobin","OKaiser"],
    "RBammann": ["AViakley", "CJackson", "JBullett", "LFarnham", "KConnolly", "KMatzinger", "RFlythe", "SMiller"]
  };

  let allJobs = $state([]);
  let stringEntered = $state('');
  let submitted = $state(false);
  let selectedTeam = $state(null);
  let flippedTeams = $state({});
  let showAddMore = $state(false);
  let startDate = $state('');
  let endDate = $state('');

  function getTeamForMember(name) {
    for (const [leader, members] of Object.entries(teamLayout)) {
      if (leader === name || members.includes(name)) {
        return leader;
      }
    }
    return "Unassigned";
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      return new Date(match[3], match[1] - 1, match[2]);
    }
    return null;
  }

  function importJobs(string_entered, append = false) {
    if (string_entered === '') {
      return;
    }
    if (!append) {
      allJobs.length = 0;
    }
    submitted = true;
    showAddMore = false;
    let string_fixed = '';
    if (string_entered.includes("Job#   Account CN#     SiteID  Sched.Date&Time         Due Date        Cust# Last Update       CUD#    Pf      City    State   Status  EQ       ")) {
      string_fixed = string_entered.split("Job# Account CN#     SiteID  Sched.Date&Time         Due Date        Cust# Last Update       CUD#    Pf      City    State   Status  EQ       ")[1];
    } else {
      string_fixed = string_entered;
    }
    const jobEntries = string_fixed.trim().split(/\n(?=\d+\t)/m);
    jobEntries.forEach(jobEntry => {
      const info = jobEntry.split('\t');
      const name = info[8];
      const dateStr = info[4];
      if (name) {
        const parsedDate = parseDate(dateStr);
        allJobs.push({
          name: name,
          date: parsedDate,
          dateStr: dateStr,
          team: getTeamForMember(name)
        });
      }
    });
    stringEntered = '';
  }

  function getFilteredJobs() {
    let filtered = allJobs;
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(job => job.date && job.date >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(job => job.date && job.date <= end);
    }
    return filtered;
  }

  function getPfCount() {
    const filtered = getFilteredJobs();
    const counts = {};
    for (const job of filtered) {
      counts[job.name] = (counts[job.name] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      team: getTeamForMember(name)
    })).sort((a, b) => b.count - a.count);
  }

  function reset() {
    submitted = false;
    stringEntered = '';
    allJobs.length = 0;
    selectedTeam = null;
    flippedTeams = {};
    showAddMore = false;
    startDate = '';
    endDate = '';
  }

  function clearDateFilter() {
    startDate = '';
    endDate = '';
  }

  function getTotalJobs() {
    return getPfCount().filter(pf => pf.team !== "Unassigned").reduce((sum, pf) => sum + pf.count, 0);
  }

  function getTeamMembers(teamLeader) {
    const pfCount = getPfCount();
    const allMembers = [teamLeader, ...(teamLayout[teamLeader] || [])];
    return allMembers.map(memberName => {
      const found = pfCount.find(pf => pf.name === memberName);
      return found || { name: memberName, count: 0, team: teamLeader };
    }).sort((a, b) => b.count - a.count);
  }

  function getTeamTotal(teamLeader) {
    return getTeamMembers(teamLeader).reduce((sum, pf) => sum + pf.count, 0);
  }

  function getActiveTeams() {
    return Object.keys(teamLayout).filter(team => getTeamTotal(team) > 0);
  }

  function getTeamBreakdown() {
    const total = getTotalJobs();
    return Object.keys(teamLayout).map(team => ({
      name: team,
      count: getTeamTotal(team),
      percentage: total > 0 ? ((getTeamTotal(team) / total) * 100).toFixed(1) : 0
    })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  }

  function toggleFlip(team) {
    flippedTeams[team] = !flippedTeams[team];
  }

  const teamColors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

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

  function getTeamSlices() {
    const breakdown = getTeamBreakdown();
    const total = getTotalJobs();
    let currentAngle = 0;
    return breakdown.map((team, index) => {
      const percentage = total > 0 ? team.count / total : 0;
      const angle = percentage * 360;
      const midAngle = currentAngle + angle / 2;
      const labelRadius = 50;
      const labelPos = polarToCartesian(100, 100, labelRadius, midAngle);
      const slice = {
        name: team.name,
        count: team.count,
        percentage: team.percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: teamColors[index % teamColors.length],
        labelX: labelPos.x,
        labelY: labelPos.y
      };
      currentAngle += angle;
      return slice;
    });
  }

  function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getDateRangeText() {
    if (startDate && endDate) {
      return `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`;
    } else if (startDate) {
      return `From ${formatDateForDisplay(startDate)}`;
    } else if (endDate) {
      return `Through ${formatDateForDisplay(endDate)}`;
    }
    return 'All Dates';
  }

  function exportTeamDistribution() {
    const slices = getTeamSlices();
    const total = getTotalJobs();
    
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = 500 * scale;
    canvas.height = 580 * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 500, 580);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Team Distribution:', 250, 30);
    
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`Total: ${total} jobs`, 250, 50);
    
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#2196F3';
    ctx.fillText(getDateRangeText(), 250, 70);
    
    const centerX = 250;
    const centerY = 210;
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
    
    let legendY = 365;
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
    downloadLink.download = 'Team-Distribution.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
</script>

<main>
  {#if submitted && !showAddMore}
    <div class="results">
      <div class="header">
        <h2>Job Distribution</h2>
        <div class="header-buttons">
          <button class="add-btn" onclick={() => showAddMore = true}>Add More Data</button>
          <button class="reset-btn" onclick={reset}>Load New Data</button>
        </div>
      </div>

      <div class="date-filter">
        <label>
          <span>Start Date:</span>
          <input type="date" bind:value={startDate} />
        </label>
        <label>
          <span>End Date:</span>
          <input type="date" bind:value={endDate} />
        </label>
        {#if startDate || endDate}
          <button class="clear-filter-btn" onclick={clearDateFilter}>Clear Dates</button>
        {/if}
      </div>
      
      <div class="summary">
        <span class="total">Total Jobs: <strong>{getTotalJobs()}</strong></span>
        <span class="workers">Workers: <strong>{getPfCount().filter(pf => pf.team !== "Unassigned").length}</strong></span>
        <span class="teams">Teams: <strong>{getActiveTeams().length}</strong></span>
        {#if startDate || endDate}
          <span class="filtered">(Filtered by date)</span>
        {/if}
      </div>

      <div class="team-overview">
        <div class="overview-header">
          <h3>Team Distribution</h3>
          <button class="export-btn" onclick={exportTeamDistribution}>Export Chart</button>
        </div>
        <div class="overview-content">
          <svg viewBox="0 0 200 200" class="overview-pie">
            {#each getTeamSlices() as slice}
              <path
                d={describeArc(100, 100, 80, slice.startAngle, slice.endAngle)}
                fill={slice.color}
              >
                <title>{slice.name}: {slice.count} ({slice.percentage}%)</title>
              </path>
            {/each}
          </svg>
          <div class="overview-legend">
            {#each getTeamSlices() as slice}
              <div class="overview-legend-item">
                <span class="legend-color" style="background: {slice.color}"></span>
                <span class="legend-name">{slice.name}</span>
                <span class="legend-value">{slice.count} ({slice.percentage}%)</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="team-filter">
        <button 
          class="filter-btn" 
          class:active={selectedTeam === null}
          onclick={() => selectedTeam = null}
        >
          All Teams
        </button>
        {#each getActiveTeams() as team}
          <button 
            class="filter-btn"
            class:active={selectedTeam === team}
            onclick={() => selectedTeam = team}
          >
            {team} ({getTeamTotal(team)})
          </button>
        {/each}
      </div>

      <div class="teams-grid">
        {#each selectedTeam ? [selectedTeam] : getActiveTeams() as team (team)}
          <div animate:flip={{ duration: 400, easing: t => t }}>
            <TeamCard
              {team}
              members={getTeamMembers(team)}
              total={getTeamTotal(team)}
              flipped={flippedTeams[team]}
              onFlip={() => toggleFlip(team)}
              {startDate}
              {endDate}
            />
          </div>
        {/each}
      </div>
    </div>
  {:else if showAddMore}
    <div class="input-section">
      <h2>Add More Jobs</h2>
      <p class="add-info">Currently loaded: {allJobs.length} jobs. Paste additional data below.</p>
      <textarea placeholder="Paste additional queue data here..." bind:value={stringEntered}></textarea>
      <div class="button-row">
        <button class="load-btn" onclick={() => importJobs(stringEntered, true)}>Add Jobs</button>
        <button class="cancel-btn" onclick={() => { showAddMore = false; stringEntered = ''; }}>Cancel</button>
      </div>
    </div>
  {:else}
    <div class="input-section">
      <h2>Load Job Queue</h2>
      <textarea placeholder="Paste your queue here..." bind:value={stringEntered}></textarea>
      <button class="load-btn" onclick={() => importJobs(stringEntered)}>Process Jobs</button>
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .input-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 800px;
    margin: 0 auto;
    background: rgba(30, 30, 40, 0.8);
    padding: 2rem;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }
  
  h2 {
    margin: 0 0 1rem 0;
    color: #f4f4f5;
    font-weight: 600;
  }
  
  textarea {
    width: 100%;
    min-height: 300px;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.9rem;
    resize: vertical;
    background: rgba(0, 0, 0, 0.3);
    color: #e4e4e7;
  }
  
  textarea::placeholder {
    color: #71717a;
  }
  
  textarea:focus {
    outline: none;
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  }
  
  .load-btn, .reset-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }
  
  .load-btn:hover, .reset-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
  }
  
  .results {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header h2 {
    margin: 0;
  }
  
  .reset-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .summary {
    display: flex;
    gap: 2rem;
    padding: 1.25rem;
    background: rgba(30, 30, 40, 0.8);
    border-radius: 12px;
    font-size: 1.1rem;
    flex-wrap: wrap;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }
  
  .summary strong {
    color: #22c55e;
  }

  .team-filter {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 0.5rem 1rem;
    background: rgba(30, 30, 40, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    color: #a1a1aa;
  }

  .filter-btn:hover {
    border-color: #22c55e;
    color: #22c55e;
  }

  .filter-btn.active {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .team-overview {
    background: rgba(30, 30, 40, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.5rem;
    backdrop-filter: blur(10px);
  }

  .overview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(34, 197, 94, 0.3);
  }

  .team-overview h3 {
    margin: 0;
    color: #f4f4f5;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .team-overview .export-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .team-overview .export-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  .overview-content {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .overview-pie {
    width: 180px;
    height: 180px;
    flex-shrink: 0;
  }

  .overview-pie path {
    stroke: rgba(15, 15, 17, 0.8);
    stroke-width: 2;
    transition: transform 0.2s;
    transform-origin: center;
  }

  .overview-pie path:hover {
    transform: scale(1.05);
  }

  .overview-legend {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .overview-legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #a1a1aa;
  }

  .overview-legend-item .legend-color {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .overview-legend-item .legend-name {
    flex: 1;
    font-weight: 500;
    color: #e4e4e7;
  }

  .overview-legend-item .legend-value {
    font-weight: 600;
    color: #22c55e;
  }

  .header-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .add-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .add-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  .date-filter {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 1rem;
    background: rgba(30, 30, 40, 0.8);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .date-filter label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #a1a1aa;
  }

  .date-filter input[type="date"] {
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    font-size: 0.9rem;
    background: rgba(0, 0, 0, 0.3);
    color: #e4e4e7;
    color-scheme: dark;
  }

  .date-filter input[type="date"]:focus {
    outline: none;
    border-color: #22c55e;
  }

  .clear-filter-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .clear-filter-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }

  .filtered {
    color: #71717a;
    font-style: italic;
  }

  .add-info {
    color: #a1a1aa;
    margin: 0;
    font-size: 0.95rem;
  }

  .button-row {
    display: flex;
    gap: 0.5rem;
  }

  .cancel-btn {
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    color: #a1a1aa;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #e4e4e7;
  }
</style>
