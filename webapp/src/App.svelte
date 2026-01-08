<script>
  import { flip } from 'svelte/animate';
  import TeamCard from './lib/TeamCard.svelte';
  
  const teamLayout = {
    "CCarter": ["FFunke", "CBenson", "LDyar", "MMichik", "BThomas"],
    "CFurbush": ["SBarber", "AThomas", "KRenner", "JFlowers"],
    "JRoyer": ["CViet", "BMercer", "BBoger", "ERose", "PMcCauley", "TWilson"],
    "JWinland": ["CRouss", "DMalloy", "Sde Laet"],
    "CDuckworth": ["SConaughty", "DWells", "MBethel"],
    "CMills": ["BUlan", "JSpielman", "SMellott", "LFarnham", "MMarple", "JMosley", "IBurkett"]
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
      const [year, month, day] = startDate.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      filtered = filtered.filter(job => job.date && job.date >= start);
    }
    if (endDate) {
      const [year, month, day] = endDate.split('-').map(Number);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);
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
    return getPfCount().reduce((sum, pf) => sum + pf.count, 0);
  }

  function getTeamMembers(teamLeader) {
    const pfCount = getPfCount();
    if (teamLeader === "Unassigned") {
      return pfCount.filter(pf => pf.team === "Unassigned").sort((a, b) => b.count - a.count);
    }
    const allMembers = [teamLeader, ...(teamLayout[teamLeader] || [])];
    return allMembers.map(memberName => {
      const found = pfCount.find(pf => pf.name === memberName);
      return found || { name: memberName, count: 0, team: teamLeader };
    }).sort((a, b) => b.count - a.count);
  }

  function getTeamTotal(teamLeader) {
    return getTeamMembers(teamLeader).reduce((sum, pf) => sum + pf.count, 0);
  }

  function getActiveTeams(includeUnassigned = true) {
    const pfCount = getPfCount();
    const teams = new Set(pfCount.map(pf => pf.team));
    const teamsArray = Array.from(teams);
    if (!includeUnassigned) {
      return teamsArray.filter(t => t !== "Unassigned");
    }
    return teamsArray;
  }

  function toggleFlip(team) {
    flippedTeams[team] = !flippedTeams[team];
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
        <span class="workers">Workers: <strong>{getPfCount().length}</strong></span>
        <span class="teams">Teams: <strong>{getActiveTeams().length}</strong></span>
        {#if startDate || endDate}
          <span class="filtered">(Filtered from {allJobs.length} total)</span>
        {/if}
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
        {#each selectedTeam ? [selectedTeam] : getActiveTeams(false) as team (team)}
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
  }
  
  h2 {
    margin: 0 0 1rem 0;
    color: #333;
  }
  
  textarea {
    width: 100%;
    min-height: 300px;
    padding: 1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-family: monospace;
    font-size: 0.9rem;
    resize: vertical;
  }
  
  textarea:focus {
    outline: none;
    border-color: #4CAF50;
  }
  
  .load-btn, .reset-btn {
    padding: 0.75rem 1.5rem;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .load-btn:hover, .reset-btn:hover {
    background: #45a049;
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
  
  .reset-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .summary {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    font-size: 1.1rem;
    flex-wrap: wrap;
  }
  
  .summary strong {
    color: #4CAF50;
  }

  .team-filter {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 0.5rem 1rem;
    background: #fff;
    border: 2px solid #ddd;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
  }

  .filter-btn:hover {
    border-color: #4CAF50;
  }

  .filter-btn.active {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }

  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .header-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .add-btn {
    padding: 0.5rem 1rem;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .add-btn:hover {
    background: #1976D2;
  }

  .date-filter {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 1rem;
    background: #e3f2fd;
    border-radius: 8px;
  }

  .date-filter label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .date-filter input[type="date"] {
    padding: 0.4rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .clear-filter-btn {
    padding: 0.4rem 0.8rem;
    background: #ff5722;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .clear-filter-btn:hover {
    background: #e64a19;
  }

  .filtered {
    color: #666;
    font-style: italic;
  }

  .add-info {
    color: #666;
    margin: 0;
    font-size: 0.95rem;
  }

  .button-row {
    display: flex;
    gap: 0.5rem;
  }

  .cancel-btn {
    padding: 0.75rem 1.5rem;
    background: #9e9e9e;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .cancel-btn:hover {
    background: #757575;
  }
</style>
