 let currentUser = null;
        let mapInstance = null;
        let markerInstance = null;

        // 1. Safe Initialization
        document.addEventListener("DOMContentLoaded", () => {
            initDatabase(); 
            const sessionData = localStorage.getItem('brgy_active_session') || sessionStorage.getItem('brgy_active_session');
            if (!sessionData) { window.location.href = '../login/login.html'; return; }
            
            currentUser = JSON.parse(sessionData);
            document.getElementById('profileName').innerText = `${currentUser.firstName} ${currentUser.lastName}`;
            document.getElementById('userInitial').innerText = currentUser.firstName.charAt(0).toUpperCase();

            checkProfileCompletion(currentUser);
            loadCommunityFeed();
        });

        // ==========================================
        // PROFILE COMPLETION CHECKER
        // ==========================================
        function checkProfileCompletion(user) {
            const requiredKeys = ['phone', 'address', 'weight', 'height', 'bloodType', 'civilStatus', 'education', 'employment', 'income', 'householdSize', 'isHeadOfFamily', 'dwellingType', 'householdNumber', 'emergencyName', 'emergencyRel', 'emergencyPhone'];
            let filledCount = user.profilePic && user.profilePic.startsWith('data:image') ? 1 : 0;
            requiredKeys.forEach(key => { if (user[key] && String(user[key]).trim() !== "") filledCount++; });
            const p = Math.round((filledCount / (requiredKeys.length + 1)) * 100);
            const sb = document.getElementById('sidebarCompletionBadge');
            if(sb) { if (p < 100) { sb.innerText = `${p}%`; sb.classList.remove('hidden'); } else sb.classList.add('hidden'); }
        }

        function logout() {
            localStorage.removeItem('brgy_active_session');
            sessionStorage.removeItem('activeSession');
            window.location.href = '../login/login.html'; 
        }

        // ==========================================
        // LOAD PUBLIC FEED
        // ==========================================
        function loadCommunityFeed() {
            const container = document.getElementById('feedContainer');
            
            let allReports = [];
            try { allReports = getTable('brgy_reports'); } catch(e) {}
            if (!allReports || allReports.length === 0) { allReports = JSON.parse(localStorage.getItem('barangayReports')) || []; }
            
            // 🔥 STRICT FILTER: Exclude anything that is a Lupon Dispute or marked isDispute=true
            const publicReports = allReports.filter(report => report.reportType !== 'Lupon Dispute' && report.isDispute !== true);
            
            publicReports.reverse(); // Newest first

            document.getElementById('totalFeedCount').innerText = publicReports.length;

            if (publicReports.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-white border border-gray-200 rounded-3xl p-16 text-center shadow-sm my-8 flex flex-col items-center">
                        <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                        </div>
                        <h3 class="text-xl font-black text-gray-900">No Community Issues Reported</h3>
                        <p class="text-sm text-gray-500 mt-2">The public board is currently clear of general reports.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = ''; 

            publicReports.forEach(report => {
                const category = report.category || report.disputeType || "General Issue";
                
                // Icon Logic based on category
                let iconSVG = '';
                if (category.includes('Garbage')) {
                    iconSVG = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>`;
                } else if (category.includes('Road')) {
                    iconSVG = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`;
                } else if (category.includes('Flooding')) {
                    iconSVG = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>`;
                } else {
                    iconSVG = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>`;
                }

                // Status Badge Logic
                let s = report.status || "Pending Review";
                let statusColor = "text-orange-700 bg-orange-50 border-orange-200"; 
                let statusDot = "bg-orange-500";
                if (s === 'In Progress' || s.includes('Dispatched')) {
                    statusColor = "text-blue-700 bg-blue-50 border-blue-200";
                    statusDot = "bg-blue-500 animate-pulse";
                } else if (s === 'Resolved') {
                    statusColor = "text-green-800 bg-green-50 border-green-200";
                    statusDot = "bg-green-500";
                }

                // Text Truncation for Card
                let previewText = report.description || "No description provided.";
                if(previewText.length > 100) { previewText = previewText.substring(0, 100) + '...'; }

                // Check for Image Evidence
                let imgData = report.photoEvidence || report.image;
                let imageHTML = '';
                if (imgData && imgData.startsWith('data:image')) {
                    imageHTML = `<img src="${imgData}" alt="Report Image" class="w-full h-40 object-cover rounded-xl mb-4 border border-gray-200 shrink-0">`;
                } else {
                    imageHTML = `
                        <div class="w-full h-40 bg-gray-50 rounded-xl mb-4 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 shrink-0">
                            <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span class="text-[10px] font-bold tracking-widest uppercase">No Image Uploaded</span>
                        </div>
                    `;
                }

                const refId = report.reportID || report.reportId || "Unknown-ID";

                // Build Card
                const card = document.createElement('article');
                card.className = "bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden group hover:-translate-y-1 relative";
                card.innerHTML = `
                    <div class="absolute top-0 left-0 w-full h-1 ${s === 'Resolved' ? 'bg-green-500' : (s === 'In Progress' ? 'bg-blue-500' : 'bg-orange-500')}"></div>
                    <div class="p-6 flex-1 flex flex-col pt-7">
                        
                        <div class="flex justify-between items-start mb-5 gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-700 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSVG}</svg>
                                </div>
                                <div>
                                    <h3 class="text-base font-black text-gray-900 leading-tight tracking-tight">${category}</h3>
                                    <p class="text-[10px] text-gray-500 font-bold tracking-wider mt-0.5 uppercase">${report.timestamp || report.dateSubmitted}</p>
                                </div>
                            </div>
                        </div>

                        ${imageHTML}
                        
                        <div class="mb-6 flex-1">
                            <p class="text-sm text-gray-600 leading-relaxed font-medium">${previewText}</p>
                        </div>
                        
                        <div class="border-t border-gray-100 pt-5 mt-auto flex items-center justify-between">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border ${statusColor} shrink-0">
                                <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                                ${s}
                            </span>
                            <button onclick="openReportModal('${refId}')" class="text-xs font-bold text-blue-600 group-hover:text-blue-800 transition flex items-center gap-1 shrink-0 bg-blue-50/50 group-hover:bg-blue-50 px-3 py-2 rounded-xl border border-transparent group-hover:border-blue-100">
                                View Details
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // ==========================================
        // MODAL WITH MAP LOGIC
        // ==========================================
        function openReportModal(reportId) {
            let allReports = [];
            try { allReports = getTable('brgy_reports'); } catch(e) {}
            if (!allReports || allReports.length === 0) { allReports = JSON.parse(localStorage.getItem('barangayReports')) || []; }
            
            const report = allReports.find(r => r.reportID === reportId || r.reportId === reportId);
            if (!report) return;

            const category = report.category || report.disputeType || "General Issue";
            const refId = report.reportID || report.reportId || "Unknown-ID";
            const s = report.status || "Pending Review";

            // Inject Text Data
            document.getElementById('modalReportTitle').innerText = `${category} Report`;
            document.getElementById('modalReportId').innerText = refId;
            document.getElementById('modalReportDate').innerText = report.timestamp || report.dateSubmitted || 'Recent';
            document.getElementById('modalReportDescription').innerText = report.description || 'No details provided.';
            document.getElementById('modalReportLocation').innerText = report.location || 'Location unverified';

            // Handle Status Badge
            const statusBadge = document.getElementById('modalReportStatus');
            statusBadge.innerText = s;
            statusBadge.className = "px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase border shadow-sm";
            if (s === 'In Progress' || s.includes('Dispatched')) {
                statusBadge.classList.add('text-blue-700', 'bg-blue-50', 'border-blue-200');
            } else if (s === 'Resolved') {
                statusBadge.classList.add('text-green-800', 'bg-green-50', 'border-green-200');
            } else {
                statusBadge.classList.add('text-orange-700', 'bg-orange-50', 'border-orange-200');
            }

            // Handle Image Evidence
            const imageContainer = document.getElementById('modalImageContainer');
            let imgData = report.photoEvidence || report.image;
            if (imgData && imgData.startsWith('data:image')) {
                imageContainer.innerHTML = `<img src="${imgData}" alt="Report Image" class="w-full h-64 object-cover rounded-xl mb-0 shadow-inner border border-gray-100">`;
            } else {
                imageContainer.innerHTML = `
                    <div class="w-full h-40 bg-slate-50 rounded-xl mb-0 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span class="text-[10px] font-bold tracking-widest uppercase">No Image Evidence Provided</span>
                    </div>
                `;
            }

            // Animate Modal Open
            const modalEl = document.getElementById('reportModal');
            const contentWrapper = document.getElementById('modalScaleWrapper');
            modalEl.classList.remove('hidden');
            setTimeout(() => { contentWrapper.classList.remove('scale-95'); contentWrapper.classList.add('scale-100'); }, 10);

            // 🔥 LOAD LEAFLET MAP (Must trigger after modal is visible to prevent rendering bugs)
            setTimeout(() => {
                if (report.coordinates && report.coordinates.lat) {
                    const lat = parseFloat(report.coordinates.lat);
                    const lng = parseFloat(report.coordinates.lng);
                    
                    // Only initialize the map once
                    if (!mapInstance) {
                        mapInstance = L.map('reportMap').setView([lat, lng], 16);
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                            attribution: '© OpenStreetMap'
                        }).addTo(mapInstance);
                        markerInstance = L.marker([lat, lng]).addTo(mapInstance);
                    } else {
                        // If map already exists, just move the view and marker
                        mapInstance.setView([lat, lng], 16);
                        markerInstance.setLatLng([lat, lng]);
                        // Fix for Leaflet inside hidden divs
                        mapInstance.invalidateSize(); 
                    }
                } else {
                    // Fallback if no GPS coordinates exist
                    document.getElementById('reportMap').innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50">No GPS Data Available</div>`;
                }
            }, 200);
        }

        function closeReportModal() {
            const contentWrapper = document.getElementById('modalScaleWrapper');
            contentWrapper.classList.remove('scale-100');
            contentWrapper.classList.add('scale-95');
            setTimeout(() => { document.getElementById('reportModal').classList.add('hidden'); }, 150);
        }