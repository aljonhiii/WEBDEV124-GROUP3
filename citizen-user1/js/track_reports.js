let currentUser = null;
        let myReports = [];
        let mapInstance = null; 
        let markerInstance = null; 
        
        // Pagination Variables
        let currentPage = 1;
        const itemsPerPage = 5;

        document.addEventListener("DOMContentLoaded", () => {
            initDatabase(); 
            
            const sessionData = localStorage.getItem('brgy_active_session') || sessionStorage.getItem('brgy_active_session');
            if (!sessionData) { window.location.href = '../login/login.html'; return; }
            
            currentUser = JSON.parse(sessionData);
            document.getElementById('profileName').innerText = `${currentUser.firstName} ${currentUser.lastName}`;
            document.getElementById('userInitial').innerText = currentUser.firstName.charAt(0).toUpperCase();

            // 🌟 CALL PROFILE COMPLETION CHECK HERE
            checkProfileCompletion(currentUser);

            loadUserReports();
        });

        // ==========================================
        // PROFILE COMPLETION LOGIC
        // ==========================================
        function checkProfileCompletion(user) {
            const requiredKeys = [
                'phone', 'address', 'weight', 'height', 'bloodType', 'civilStatus', 
                'education', 'employment', 'income', 'householdSize', 'isHeadOfFamily', 
                'dwellingType', 'householdNumber', 'emergencyName', 'emergencyRel', 'emergencyPhone'
            ];
            let filledCount = 0;
            const totalRequired = requiredKeys.length + 1; // +1 for profile picture

            requiredKeys.forEach(key => {
                if (user[key] && String(user[key]).trim() !== "") filledCount++;
            });

            if (user.profilePic && user.profilePic.startsWith('data:image')) filledCount++;

            const percentage = Math.round((filledCount / totalRequired) * 100);
            const sidebarBadge = document.getElementById('sidebarCompletionBadge');
            
            if (sidebarBadge) {
                if (percentage < 100) {
                    sidebarBadge.innerText = `${percentage}%`;
                    sidebarBadge.classList.remove('hidden');
                } else {
                    sidebarBadge.classList.add('hidden');
                }
            }
        }

        // ==========================================
        // FETCH & PAGINATION LOGIC
        // ==========================================
        function loadUserReports() {
            const allReports = getTable('brgy_reports');
            myReports = allReports.filter(report => report.residentID === currentUser.residentID);
            
            // Update Banner Stats
            document.getElementById('bannerTotal').innerText = myReports.length;
            document.getElementById('bannerActive').innerText = myReports.filter(r => r.status !== 'Resolved' && r.status !== 'Settled' && r.status !== 'Failed').length;

            renderTable();
        }

        function renderTable() {
            const tableBody = document.getElementById('reportsTableBody');
            const totalItems = myReports.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

            if (totalItems === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-8 py-16 text-center">
                            <div class="flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl p-8 border border-gray-100 border-dashed max-w-md mx-auto">
                                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <svg class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <p class="text-gray-900 font-bold mb-1">No submissions yet</p>
                                <p class="text-sm text-gray-500 mb-4">You haven't filed any reports or disputes. When you do, they will appear here.</p>
                                <a href="citezen_dashboard.html" class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-md">File a New Report</a>
                            </div>
                        </td>
                    </tr>
                `;
                document.getElementById('paginationInfo').innerText = "Showing 0 entries";
                document.getElementById('prevBtn').disabled = true;
                document.getElementById('nextBtn').disabled = true;
                return;
            }

            // Slice array for pagination
            const startIdx = (currentPage - 1) * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;
            const paginatedItems = myReports.slice(startIdx, endIdx);

            tableBody.innerHTML = ''; 

            paginatedItems.forEach(report => {
                let isDispute = report.reportType === 'Lupon Dispute';
                
                let typeBadge = isDispute 
                    ? `<span class="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider shadow-sm">Formal Dispute</span>` 
                    : `<span class="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider shadow-sm">General Incident</span>`;

                let statusColor = "bg-orange-50 text-orange-600 border-orange-200"; 
                if(report.status === 'Resolved' || report.status === 'Settled') statusColor = "bg-green-50 text-green-700 border-green-200";
                if(report.status === 'Failed') statusColor = "bg-red-50 text-red-600 border-red-200";
                if(report.status === 'In Progress' || report.status === 'Sent to Lupon' || report.status === 'Summon Issued' || report.status === 'Mediation') statusColor = "bg-blue-50 text-blue-700 border-blue-200";

                const statusBadge = `
                    <div class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full ${statusColor.replace('bg-', 'bg-').replace('-50', '-500')}"></span>
                        <span class="px-2 py-0.5 rounded text-[11px] font-bold ${statusColor}">${report.status}</span>
                    </div>`;

                const row = document.createElement('tr');
                row.className = "bg-white group cursor-default";
                row.innerHTML = `
                    <td class="px-8 py-5 whitespace-nowrap font-black text-gray-900">${report.reportID}</td>
                    <td class="px-6 py-5 whitespace-nowrap text-gray-500 text-xs font-medium">${report.timestamp}</td>
                    <td class="px-6 py-5 whitespace-nowrap text-gray-700 font-bold">${report.category}</td>
                    <td class="px-6 py-5 whitespace-nowrap">${typeBadge}</td>
                    <td class="px-6 py-5 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-8 py-5 whitespace-nowrap text-right">
                        <div class="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onclick="openProgressModal('${report.reportID}')" class="bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition">
                                View Details
                            </button>
                            <button onclick="deleteReport('${report.reportID}')" class="bg-white border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2 rounded-xl shadow-sm transition" title="Delete Submission">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Update Pagination UI
            document.getElementById('paginationInfo').innerText = `Showing ${startIdx + 1} to ${Math.min(endIdx, totalItems)} of ${totalItems} entries`;
            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = currentPage === totalPages;
        }

        function changePage(delta) {
            currentPage += delta;
            renderTable();
        }

        // ==========================================
        // DELETE LOGIC
        // ==========================================
        function deleteReport(reportID) {
            if(confirm(`⚠️ Are you sure you want to permanently delete Report ${reportID}?\n\nThis will remove the record from your tracking dashboard.`)) {
                let allReports = getTable('brgy_reports');
                
                // Filter out the deleted report
                allReports = allReports.filter(r => r.reportID !== reportID);
                
                // Save back to DB
                saveTable('brgy_reports', allReports);
                
                // Reset page if needed and reload
                currentPage = 1;
                loadUserReports();
            }
        }

        // ==========================================
        // 🌟 VERTICAL PROGRESS MODAL LOGIC
        // ==========================================
        function openProgressModal(reportID) {
            const report = myReports.find(r => r.reportID === reportID);
            if(!report) return;

            // Animate Modal In
            const modalEl = document.getElementById('progressModal');
            const contentEl = document.getElementById('modalContent');
            modalEl.classList.remove('hidden');
            setTimeout(() => { contentEl.classList.remove('scale-95'); contentEl.classList.add('scale-100'); }, 10);

            document.getElementById('modalSubtitle').innerText = `Ref: ${report.reportID}`;
            document.getElementById('modalDate').innerText = report.timestamp;
            document.getElementById('modalCategory').innerText = report.category;
            document.getElementById('modalDescription').innerText = report.description || "No specific details provided.";
            
            // Timeline Inject
            document.getElementById('modalTimeline').innerHTML = generateVerticalTimeline(report);
            
            // Header Badge
            let sColor = report.status === 'Resolved' || report.status === 'Settled' ? 'bg-green-100 text-green-800' : 
                         report.status === 'Failed' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';
            document.getElementById('modalStatusBadge').innerHTML = `<span class="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${sColor} shadow-sm border border-white/50">${report.status}</span>`;

            // Dynamic Attributes
            let attrHTML = '';
            if(report.location && report.location.trim() !== '') {
                attrHTML += `
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mt-6">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Location Context</span>
                    <span class="font-bold text-gray-900 text-sm">${report.location}</span>
                </div>`;
            }
            if(report.proxyReporter) {
                attrHTML += `
                <div class="mt-6 bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <span class="text-blue-800 text-[10px] font-black uppercase tracking-widest block mb-2 flex items-center gap-1.5"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> Filed via Proxy</span>
                    <span class="font-black text-blue-900 block text-sm">${report.proxyReporter.affectedName} <span class="font-medium text-blue-700 text-xs">(${report.proxyReporter.relationship})</span></span>
                    <span class="text-blue-600 block text-xs mt-1 font-medium">Contact: ${report.proxyReporter.contactNumber || 'N/A'}</span>
                </div>`;
            }
            if(report.respondents && report.respondents.length > 0) {
                attrHTML += `
                <div class="mt-6 bg-gradient-to-br from-red-50 to-white p-5 rounded-2xl border border-red-100 shadow-sm">
                    <span class="text-red-800 text-[10px] font-black uppercase tracking-widest block mb-3">Respondents Named</span>
                    <div class="flex flex-wrap gap-2">
                        ${report.respondents.map(r => `<span class="bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"><svg class="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>${r}</span>`).join('')}
                    </div>
                </div>`;
            }
            document.getElementById('modalAttributesList').innerHTML = attrHTML;

            // Setup the Map
            const mapContainer = document.getElementById('modalMapContainer');
            if (report.coordinates && report.coordinates.lat) {
                mapContainer.classList.remove('hidden');
                mapContainer.classList.add('flex');
                setTimeout(() => {
                    const lat = parseFloat(report.coordinates.lat);
                    const lng = parseFloat(report.coordinates.lng);
                    if (!mapInstance) {
                        mapInstance = L.map('modalMap', { zoomControl: false }).setView([lat, lng], 16);
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapInstance);
                        markerInstance = L.marker([lat, lng]).addTo(mapInstance);
                    } else {
                        mapInstance.setView([lat, lng], 16);
                        markerInstance.setLatLng([lat, lng]);
                        mapInstance.invalidateSize(); 
                    }
                }, 250); 
            } else { mapContainer.classList.add('hidden'); mapContainer.classList.remove('flex'); }

            // Setup Photo
            const photoContainer = document.getElementById('modalPhotoContainer');
            const photoImg = document.getElementById('modalPhoto');
            if (report.photoEvidence && report.photoEvidence.startsWith('data:image')) {
                photoImg.src = report.photoEvidence;
                photoContainer.classList.remove('hidden');
                photoContainer.classList.add('flex');
            } else { photoContainer.classList.add('hidden'); photoContainer.classList.remove('flex'); }
        }

        function closeProgressModal() {
            const contentEl = document.getElementById('modalContent');
            contentEl.classList.remove('scale-100');
            contentEl.classList.add('scale-95');
            setTimeout(() => { document.getElementById('progressModal').classList.add('hidden'); }, 150);
        }

        // 🌟 Vertical Timeline Generator
        function generateVerticalTimeline(report) {
            let isDispute = report.reportType === 'Lupon Dispute';
            const normalSteps = ['Pending Verification', 'In Progress', 'Resolved'];
            const disputeSteps = ['Pending Lupon Review', 'Summon Issued', 'Mediation', 'Settled'];
            
            let steps = isDispute ? disputeSteps : normalSteps;
            let currentStatus = report.status;
            let isFailed = (currentStatus === 'Failed'); 
            
            if (isFailed && isDispute) steps[steps.length - 1] = 'Failed';

            let currentIndex = steps.indexOf(currentStatus);
            if (currentIndex === -1) currentIndex = 0; 

            let html = `<div class="mt-4 space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-100">`;

            steps.forEach((step, index) => {
                let isCompleted = index < currentIndex;
                let isCurrent = index === currentIndex;
                let isLast = index === steps.length - 1;

                let circleColor = "bg-white border-2 border-gray-200";
                let textColor = "text-gray-400";
                let descText = isCompleted ? "Completed step" : "Awaiting action";

                if (isCompleted) {
                    circleColor = "bg-blue-600 border-2 border-blue-600 text-white shadow-md";
                    textColor = "text-gray-900";
                } else if (isCurrent) {
                    if ((isLast && currentStatus === 'Resolved') || (isLast && currentStatus === 'Settled')) {
                        circleColor = "bg-green-500 border-2 border-green-500 text-white shadow-md";
                        textColor = "text-green-700";
                        descText = "Case Closed";
                    } else if (isLast && isFailed) {
                        circleColor = "bg-red-500 border-2 border-red-500 text-white shadow-md";
                        textColor = "text-red-600";
                        descText = "Case Failed/Closed";
                    } else {
                        circleColor = "bg-blue-50 border-4 border-blue-600 shadow-md ring-4 ring-blue-50"; 
                        textColor = "text-blue-700";
                        descText = "Currently processing";
                    }
                }

                let innerIcon = `<div class="w-2.5 h-2.5 rounded-full bg-gray-200"></div>`; // Default hollow
                if (isCompleted) innerIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
                if (isCurrent && isLast && isFailed) innerIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                if (isCurrent && isLast && !isFailed) innerIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
                if (isCurrent && !isLast) innerIcon = `<div class="w-2.5 h-2.5 rounded-full bg-blue-600 pulse-ring"></div>`;

                html += `
                    <div class="relative flex items-start group">
                        ${isCompleted && !isLast ? `<div class="absolute left-[15px] top-[30px] w-0.5 h-full bg-blue-600 z-0"></div>` : ''}
                        
                        <div class="z-10 flex items-center justify-center w-8 h-8 rounded-full ${circleColor} shrink-0 transition-all duration-300">
                            ${innerIcon}
                        </div>
                        <div class="ml-4 flex flex-col pt-1.5">
                            <h4 class="text-sm font-bold ${textColor}">${step}</h4>
                            <p class="text-[11px] font-medium text-gray-500 mt-0.5">${descText}</p>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            return html;
        }

        function logout() {
            localStorage.removeItem('brgy_active_session');
            sessionStorage.removeItem('activeSession');
            window.location.href = '../login/login.html'; 
        }