let currentUser = null;
        let myDisputes = [];
        let tablePage = 1;
        const itemsPerPage = 5;

        function checkProfileCompletion(user) {
    // List of fields to check
    const requiredKeys = ['phone', 'address', 'weight', 'height', 'bloodType', 'civilStatus', 'education', 'employment', 'income', 'householdSize', 'isHeadOfFamily', 'dwellingType', 'householdNumber', 'emergencyName', 'emergencyRel', 'emergencyPhone'];
    
    let filledCount = user.profilePic && user.profilePic.startsWith('data:image') ? 1 : 0;
    
    requiredKeys.forEach(key => { 
        if (user[key] && String(user[key]).trim() !== "") filledCount++; 
    });
    
    // Calculate percentage
    const percentage = Math.round((filledCount / (requiredKeys.length + 1)) * 100);
    
    // Trigger the UI update
    updateBadges(percentage);
}
        window.onload = function() {
            initDatabase();
            const sessionData = localStorage.getItem('brgy_active_session') || sessionStorage.getItem('brgy_active_session');
            if (!sessionData) { window.location.href = '../login/login.html'; return; }
            
            currentUser = JSON.parse(sessionData);
            document.getElementById('profileName').innerText = `${currentUser.firstName} ${currentUser.lastName}`;
            document.getElementById('userInitial').innerText = currentUser.firstName.charAt(0).toUpperCase();
            checkProfileCompletion(currentUser);
            loadUserDisputes();
        };

        function logout() {
            localStorage.removeItem('brgy_active_session');
            sessionStorage.removeItem('activeSession');
            window.location.href = '../login/login.html'; 
        }

        // ==========================================
        // FETCH & RENDER TABLE 
        // ==========================================
        function loadUserDisputes() {
            const tableBody = document.getElementById('disputesTableBody');
            
            let allReports = [];
            try { allReports = getTable('brgy_reports'); } catch(e) {}
            if (!allReports || allReports.length === 0) { allReports = JSON.parse(localStorage.getItem('barangayReports')) || []; }
            
            myDisputes = allReports.filter(report => {
                const matchesUser = (report.residentID === currentUser.residentID) || (report.complainantEmail === currentUser.email);
                const isDisputeCase = (report.reportType === 'Lupon Dispute') || (report.isDispute === true);
                return matchesUser && isDisputeCase;
            });
            
            myDisputes.reverse(); 
            document.getElementById('bannerTotal').innerText = myDisputes.length;

            if (myDisputes.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="px-8 py-16 text-center text-slate-400">No active cases found.</td></tr>`;
                return;
            }

            const startIdx = (tablePage - 1) * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;
            const paginatedItems = myDisputes.slice(startIdx, endIdx);

            tableBody.innerHTML = ''; 

            paginatedItems.forEach(report => {
                let respondentText = "N/A";
                if(report.respondents && Array.isArray(report.respondents) && report.respondents.length > 0) {
                    respondentText = report.respondents.length > 1 ? `${report.respondents[0]} <span class="text-slate-400 text-xs font-medium">+${report.respondents.length - 1} more</span>` : report.respondents[0];
                } else if (report.respondentName) { respondentText = report.respondentName; }

                let currentStatus = report.status || "Pending Lupon Review";
                let statusColor = "text-orange-700 bg-orange-50 border-orange-200";
                if(currentStatus === 'Settled') statusColor = "text-green-800 bg-green-50 border-green-200";
                else if(currentStatus === 'Failed') statusColor = "text-red-700 bg-red-50 border-red-200";
                else if(currentStatus !== 'Pending Lupon Review' && currentStatus !== 'Pending Verification') statusColor = "text-blue-700 bg-blue-50 border-blue-200";

                const statusBadge = `<span class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${statusColor} tracking-wider uppercase shadow-sm">${currentStatus}</span>`;
                const refId = report.reportID || report.reportId || "Unknown-ID";

                const row = document.createElement('tr');
                row.className = "bg-white group cursor-default";
                row.innerHTML = `
                    <td class="px-8 py-5 whitespace-nowrap font-black text-slate-900">${refId}</td>
                    <td class="px-6 py-5 whitespace-nowrap text-slate-500 text-xs font-medium">${report.timestamp || report.dateSubmitted || 'Recent'}</td>
                    <td class="px-6 py-5 whitespace-nowrap text-slate-700 font-bold">${respondentText}</td>
                    <td class="px-6 py-5 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-8 py-5 whitespace-nowrap text-right">
                        <button onclick="openFileModal('${refId}')" class="bg-white border border-slate-200 text-amber-700 hover:bg-amber-50 hover:border-amber-200 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition transform hover:-translate-y-0.5">
                            Open Case File
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            document.getElementById('paginationInfo').innerText = `Showing ${startIdx + 1} to ${Math.min(endIdx, myDisputes.length)} of ${myDisputes.length} entries`;
            document.getElementById('prevBtn').disabled = tablePage === 1;
            document.getElementById('nextBtn').disabled = tablePage === Math.ceil(myDisputes.length / itemsPerPage);
        }

        function changePage(delta) { tablePage += delta; renderTable(); }

        // ==========================================
        // 🌟 DOSSIER MODAL LOGIC (READ-ONLY)
        // ==========================================
        function openFileModal(reportId) {
            const report = myDisputes.find(r => r.reportID === reportId || r.reportId === reportId);
            if (!report) return;

            // 1. Info
            document.getElementById('modalCaseId').innerText = `Ref: ${report.reportID || report.reportId}`;
            document.getElementById('modalComplainant').innerText = report.residentName || report.complainantName;
            document.getElementById('modalInitialDesc').innerText = report.description || "No description provided.";
            
            if(report.respondents && Array.isArray(report.respondents) && report.respondents.length > 0) {
                document.getElementById('modalRespondent').innerHTML = report.respondents.map(r => `<div>• ${r}</div>`).join('');
            } else if (report.respondentName) { document.getElementById('modalRespondent').innerText = report.respondentName; } 
            else { document.getElementById('modalRespondent').innerText = "None listed"; }
            
            // 2. Dropdown Status with Checkmarks
            const statusSelect = document.getElementById('updateStatusSelect');
            const options = Array.from(statusSelect.options);
            const stages = ["Pending Lupon Review", "Summon Issued", "First Mediation", "Pangkat Hearing 1", "Pangkat Hearing 2", "Pangkat Hearing 3", "Settled"];
            
            let currentIndex = stages.indexOf(report.status);
            if (report.status === 'Failed') currentIndex = stages.length; 
            if (currentIndex === -1) currentIndex = 0; 

            options.forEach((opt, index) => {
                let cleanText = opt.text.replace('✓ ', ''); 
                if (index <= currentIndex && opt.value !== 'Pending Lupon Review') {
                    opt.text = '✓ ' + cleanText;
                } else {
                    opt.text = cleanText;
                }
            });
            statusSelect.value = report.status || 'Pending Lupon Review';

            // 3. Hearing Date
            if (report.hearingDate) {
                const d = new Date(report.hearingDate);
                document.getElementById('hearingDate').value = d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
            } else { document.getElementById('hearingDate').value = "TBA (To Be Announced)"; }

            // 4. UNLOCK TABS BASED ON PROGRESS
            const s = report.status || '';
            let unlockedLevel = 0; 
            
            if(s === 'Summon Issued' || s === 'First Mediation') unlockedLevel = 1;
            if(s === 'Pangkat Hearing 1' || s === 'Pangkat Hearing 2') unlockedLevel = 2; 
            if(s === 'Pangkat Hearing 3') unlockedLevel = 3; 
            if(s === 'Settled' || s === 'Failed') unlockedLevel = 4;

            // Failsafe Unlocks based on data presence
            if (report.discussionNotes) unlockedLevel = Math.max(unlockedLevel, 1);
            if (report.hearing2Notes) unlockedLevel = Math.max(unlockedLevel, 2);
            if (report.hearing3Notes) unlockedLevel = Math.max(unlockedLevel, 3);
            if (report.decisionNotes) unlockedLevel = Math.max(unlockedLevel, 4);

            const tabsContainer = document.getElementById('modalTabsContainer');
            const steps = [
                { id: 0, name: "Case Intake" },
                { id: 1, name: "1st Hearing" },
                { id: 2, name: "2nd Hearing" },
                { id: 3, name: "3rd Hearing" },
                { id: 4, name: "Final Resolution" }
            ];

            tabsContainer.innerHTML = steps.map(step => {
                const isUnlocked = step.id <= unlockedLevel;
                const isCurrentActive = step.id === 0; 
                
                let baseClasses = "relative flex items-center w-full text-left p-3 rounded-xl transition-all duration-200 z-10";
                let iconHtml = "", textClasses = "";

                if (!isUnlocked) {
                    baseClasses += " opacity-50 cursor-not-allowed";
                    textClasses = "text-slate-400 font-medium";
                    iconHtml = `<div class="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mr-3 shrink-0"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div>`;
                } else {
                    baseClasses += isCurrentActive ? " bg-amber-50 border border-amber-200 shadow-sm tab-btn-active" : " hover:bg-slate-50 border border-transparent tab-btn";
                    textClasses = isCurrentActive ? "text-amber-800 font-black" : "text-slate-700 font-bold";
                    iconHtml = `<div class="w-7 h-7 rounded-full bg-white border border-amber-500 text-amber-600 shadow-sm flex items-center justify-center mr-3 shrink-0"><span class="text-xs font-black">${step.id + 1}</span></div>`;
                }

                return `
                    <button onclick="switchTab(${step.id})" id="btn-tab-${step.id}" class="${baseClasses}" ${!isUnlocked ? 'disabled' : ''}>
                        ${iconHtml}
                        <span class="text-xs tracking-wide ${textClasses}">${step.name}</span>
                    </button>
                `;
            }).join('');


            // 5. LOAD ALL 10 TEXT BOXES (INTO P TAGS)
            const setVal = (id, val, fallback) => {
                document.getElementById(id).innerText = val && val.trim() !== "" ? val : fallback;
            };

            setVal('modalHearing1Notes', report.discussionNotes, "Waiting for transcripts...");
            setVal('modalHearing1Witnesses', report.witnessStatements, "No witnesses recorded.");
            setVal('modalHearing1Decision', report.hearing1Decision, "Meeting ongoing or awaiting Lupon decision.");

            setVal('modalHearing2Notes', report.hearing2Notes, "Waiting for transcripts...");
            setVal('modalHearing2Witnesses', report.witnessStatements2, "No witnesses recorded.");
            setVal('modalHearing2Decision', report.hearing2Decision, "Meeting ongoing or awaiting Lupon decision.");

            setVal('modalHearing3Notes', report.hearing3Notes, "Waiting for transcripts...");
            setVal('modalHearing3Witnesses', report.witnessStatements3, "No witnesses recorded.");
            setVal('modalHearing3Decision', report.hearing3Decision, "Meeting ongoing or awaiting Lupon decision.");

            setVal('modalDecisionNotes', report.decisionNotes, "Case is still pending final resolution.");

            switchTab(0);

            // Animate Modal In
            const modalEl = document.getElementById('fileModal');
            const contentEl = document.getElementById('modalContent');
            modalEl.classList.remove('hidden');
            setTimeout(() => { contentEl.classList.remove('scale-95'); contentEl.classList.add('scale-100'); }, 10);
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');

            document.querySelectorAll('[id^="btn-tab-"]').forEach(btn => {
                if(!btn.disabled) {
                    btn.classList.remove('bg-amber-50', 'border-amber-200', 'shadow-sm');
                    btn.classList.add('border-transparent', 'hover:bg-slate-50');
                    btn.querySelector('span:nth-child(2)').classList.replace('text-amber-800', 'text-slate-700');
                    btn.querySelector('span:nth-child(2)').classList.replace('font-black', 'font-bold');
                    let iconDiv = btn.querySelector('div');
                    iconDiv.classList.remove('border-amber-500', 'text-amber-600', 'shadow-sm');
                    iconDiv.classList.add('border-slate-300', 'text-slate-400');
                }
            });

            let activeBtn = document.getElementById(`btn-tab-${tabId}`);
            if(activeBtn && !activeBtn.disabled) {
                activeBtn.classList.add('bg-amber-50', 'border-amber-200', 'shadow-sm');
                activeBtn.classList.remove('border-transparent', 'hover:bg-slate-50');
                activeBtn.querySelector('span:nth-child(2)').classList.replace('text-slate-700', 'text-amber-800');
                activeBtn.querySelector('span:nth-child(2)').classList.replace('font-bold', 'font-black');
                let iconDiv = activeBtn.querySelector('div');
                iconDiv.classList.add('border-amber-500', 'text-amber-600', 'shadow-sm');
                iconDiv.classList.remove('border-slate-300', 'text-slate-400');
            }
        }


function updateBadges(percentage) {
    const sidebarBadge = document.getElementById('sidebarCompletionBadge');
    const mainBanner = document.getElementById('completionBanner');
    const pBar = document.getElementById('completionBar');
    const pText = document.getElementById('completionText');

    // Update Progress Bar (only if it exists on this page)
    if(pBar) pBar.style.width = `${percentage}%`;
    if(pText) pText.innerText = `${percentage}%`;

    if (percentage < 100) {
        if(sidebarBadge) {
            sidebarBadge.innerText = `${percentage}%`;
            sidebarBadge.classList.remove('hidden');
        }
        if(mainBanner) mainBanner.classList.remove('hidden');
    } else {
        if(sidebarBadge) sidebarBadge.classList.add('hidden');
        if(mainBanner) mainBanner.classList.add('hidden');
    }
}

        // CLOSE MODAL FIX
        function closeFileModal() {
            const contentEl = document.getElementById('modalContent');
            contentEl.classList.remove('scale-100');
            contentEl.classList.add('scale-95');
            setTimeout(() => { document.getElementById('fileModal').classList.add('hidden'); }, 150);
        }