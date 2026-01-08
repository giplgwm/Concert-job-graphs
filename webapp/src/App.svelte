<script>
  const pfs = $state([]);
  const pfCount = $state([]);
  let stringEntered = $state('');
  let submitted = $state(false);
  
  function countOccurrences(strings, targetList) {
    const counts = {};
    // Count each string
    for (const str of strings) {
      counts[str] = (counts[str] || 0) + 1;
    }
    // Convert to array of objects and push to target list
    Object.entries(counts).forEach(([name, count]) => {
      targetList.push({ name: name, count: count });
    });
    
    // Sort by count descending
    targetList.sort((a, b) => b.count - a.count);
  }
  
  function importJobs(string_entered) {
    console.log(string_entered)
    console.log(typeof string_entered)
    if (string_entered === '') {
      return;
    }
    // Clear previous results
    pfCount.length = 0;
    submitted = true;
    let string_fixed = '';
    if (string_entered.includes("Job#	Account	CN#	SiteID	Sched.Date&Time	Due Date	Cust# Last Update	CUD#	Pf 	City	State	Status	EQ	")) {
      string_fixed = string_entered.split("Job#	Account	CN#	SiteID	Sched.Date&Time	Due Date	Cust# Last Update	CUD#	Pf 	City	State	Status	EQ	")[1];
    } else {
      string_fixed = string_entered;
    }
    console.log(string_fixed);
    const tempPfs = []; // Use a temporary array
    const jobEntries = string_fixed.trim().split(/\n(?=\d+\t)/m);
    jobEntries.forEach(jobEntry => {
      const info = jobEntry.split('\t');
      const name = info[8];
      if (name) {
        tempPfs.push(name);
      }
    });
    countOccurrences(tempPfs, pfCount); // Pass the reactive pfCount state
  }
  
  function reset() {
    submitted = false;
    stringEntered = '';
    pfCount.length = 0;
  }
  
  function getTotalJobs() {
    return pfCount.reduce((sum, pf) => sum + pf.count, 0);
  }
</script>

<main>
  {#if submitted}
    <div class="results">
      <div class="header">
        <h2>Job Distribution</h2>
        <button class="reset-btn" onclick={reset}>Load New Data</button>
      </div>
      
      <div class="summary">
        <span class="total">Total Jobs: <strong>{getTotalJobs()}</strong></span>
        <span class="workers">Workers: <strong>{pfCount.length}</strong></span>
      </div>
      
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
            {#each pfCount as pf, index}
              <tr>
                <td class="rank">{index + 1}</td>
                <td class="name">{pf.name}</td>
                <td class="count">{pf.count}</td>
                <td class="percentage">{((pf.count / getTotalJobs()) * 100).toFixed(1)}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
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
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .input-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
  }
  
  .summary strong {
    color: #4CAF50;
  }
  
  .table-container {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  thead {
    background: #4CAF50;
    color: white;
  }
  
  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
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
    padding: 0.875rem 1rem;
  }
  
  .rank {
    width: 60px;
    text-align: center;
    color: #888;
    font-weight: 500;
  }
  
  .name {
    font-weight: 500;
  }
  
  .count {
    width: 100px;
    text-align: center;
    font-weight: 600;
    color: #4CAF50;
  }
  
  .percentage {
    width: 100px;
    text-align: center;
    color: #666;
  }
</style>