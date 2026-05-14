const fs = require('fs');

try {
  let content = fs.readFileSync('pages/dashboard.html', 'utf8');

  // Find where to insert adminControlsBlock
  const formEndIndex = content.indexOf('</form>');
  if (formEndIndex !== -1) {
    const divEndIndex1 = content.indexOf('</div>', formEndIndex);
    const divEndIndex2 = content.indexOf('</div>', divEndIndex1 + 6);
    
    if (divEndIndex2 !== -1 && !content.includes('adminControlsBlock')) {
      const insertionIndex = divEndIndex1 + 6; // Insert after the first </div> after </form>
      const insertion = `
              <!-- Admin Controls (Hidden by Default) -->
              <div id="adminControlsBlock" style="display: none; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                <h3 style="font-size: 1.1rem; margin-bottom: 1rem; color: #F59E0B;">👑 Admin Site Editor</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Enable this mode to point-and-click edit any text or image on the public website pages.</p>
                <button type="button" id="toggleAdminModeBtn" class="btn btn-outline" style="border-color: #F59E0B; color: #F59E0B; width: 100%;">
                  Activate Admin Edit Mode
                </button>
              </div>`;
              
      content = content.slice(0, insertionIndex) + insertion + content.slice(insertionIndex);
    }
  }

  // Find where to insert admin toggle logic
  const targetScript = 'if (!isAdmin && user) {';
  const scriptIndex = content.indexOf(targetScript);
  
  if (scriptIndex !== -1 && !content.includes('adminBlock.style.display')) {
    // Find the end of that if statement
    const endOfIf = content.indexOf('}', scriptIndex) + 1;
    
    const scriptInsertion = `

          // Admin Edit Mode Toggle Setup
          if (isAdmin) {
            const adminBlock = document.getElementById('adminControlsBlock');
            const adminBtn = document.getElementById('toggleAdminModeBtn');
            if (adminBlock && adminBtn) {
              adminBlock.style.display = 'block';
              const isActive = localStorage.getItem('jobbeacon_admin_mode') === 'true';
              adminBtn.textContent = isActive ? 'Deactivate Admin Edit Mode' : 'Activate Admin Edit Mode';
              adminBtn.style.background = isActive ? '#F59E0B' : 'transparent';
              adminBtn.style.color = isActive ? '#fff' : '#F59E0B';
              
              adminBtn.addEventListener('click', () => {
                const nowActive = localStorage.getItem('jobbeacon_admin_mode') !== 'true';
                localStorage.setItem('jobbeacon_admin_mode', nowActive ? 'true' : 'false');
                adminBtn.textContent = nowActive ? 'Deactivate Admin Edit Mode' : 'Activate Admin Edit Mode';
                adminBtn.style.background = nowActive ? '#F59E0B' : 'transparent';
                adminBtn.style.color = nowActive ? '#fff' : '#F59E0B';
                UI.showToast(nowActive ? 'Admin Edit Mode ACTIVATED. Navigate to the site to see Edit buttons.' : 'Admin Edit Mode DEACTIVATED.', 'success');
              });
            }
          }`;
          
    content = content.slice(0, endOfIf) + scriptInsertion + content.slice(endOfIf);
  }

  fs.writeFileSync('pages/dashboard.html', content);
  console.log("dashboard.html updated successfully");
} catch (e) {
  console.error(e);
}
