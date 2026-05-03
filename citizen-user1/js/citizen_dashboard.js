 
        let currentUser = null;
        let respondentsList = [];
        let witnessesList = [];
        let base64Photo = null;
        
        // Leaflet Variables
        let issueMap;
        let issueMarker;
        let isMapFullscreen = false;

        document.addEventListener("DOMContentLoaded", () => {
            initDatabase();
            
            const sessionData = localStorage.getItem('brgy_active_session') || sessionStorage.getItem('brgy_active_session');
            if (!sessionData) {
                window.location.href = '../login/login.html'; 
                return;
            }
            
            const residents = getTable('brgy_residents');
            const sessionUser = JSON.parse(sessionData);
            currentUser = residents.find(r => r.residentID === sessionUser.residentID) || sessionUser;
            
            document.getElementById('welcomeMessage').innerText = currentUser.firstName;
            document.getElementById('profileName').innerText = `${currentUser.firstName} ${currentUser.lastName}`;
            document.getElementById('userInitial').innerText = currentUser.firstName.charAt(0).toUpperCase();
            if(document.getElementById('profileID')) document.getElementById('profileID').innerText = currentUser.residentID;

            if(currentUser.profilePic && currentUser.profilePic.startsWith('data:image')) {
                document.getElementById('miniProfilePicContainer').innerHTML = `<img src="${currentUser.profilePic}" class="w-full h-full object-cover">`;
            }

            populateResidentSearch(residents);
            checkProfileCompletion(currentUser);
            loadUserStats(); 
        });

        // ==========================================
        // MAP LOGIC (Clean Layer & Custom Puroks)
        // ==========================================
        
// ✨ MAP INITIALIZATION FUNCTION (YELLOW BORDER + CUSTOM PUROKS)
function initLeafletMap() {
            if (!issueMap) {
                // Set to the exact center of Tumaga
                const defaultLat = 6.9411;
                const defaultLng = 122.0837;

                // Initialize map
                issueMap = L.map('incidentMap').setView([defaultLat, defaultLng], 15);
                
                // 🗺️ CLEAN LABELS LAYER (Shows Barangays and Streets, NO messy icons)
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    maxZoom: 20,
                    attribution: '© OpenStreetMap, © CartoDB'
                }).addTo(issueMap);

                // 🗺️ 1. GENERATE THE PERFECTLY ROUNDED OVAL
                const centerLat = 6.9411;   
                const centerLng = 122.0837; 
                const radiusLat = 0.0145;   // Height of the oval
                const radiusLng = 0.0110;   // Width of the oval

                const tumagaBoundary = [];
                for (let i = 0; i <= 360; i += 5) { 
                    const radian = i * (Math.PI / 180);
                    const lat = centerLat + (radiusLat * Math.sin(radian));
                    const lng = centerLng + (radiusLng * Math.cos(radian));
                    tumagaBoundary.push([lat, lng]);
                }

                // 🟡 2. DRAW THE SOLID YELLOW BORDER
                L.polyline(tumagaBoundary, {
                    color: '#facc15', // Solid Yellow
                    weight: 3
                }).addTo(issueMap);

                // =========================================================
                // 🏘️ 3. ALL 7 PUROK ZONES OF TUMAGA
                // =========================================================
                const purokZones = [
                    {
                        name: "Purok 1",
                        color: "#ef4444", // Tailwind Red
                        coordinates: [
                            [6.9460, 122.0790], [6.9460, 122.0830], 
                            [6.9420, 122.0830], [6.9420, 122.0790]
                        ]
                    },
                    {
                        name: "Purok 2",
                        color: "#3b82f6", // Tailwind Blue
                        coordinates: [
                            [6.9460, 122.0830], [6.9460, 122.0870], 
                            [6.9420, 122.0870], [6.9420, 122.0830]
                        ]
                    },
                    {
                        name: "Purok 3",
                        color: "#10b981", // Tailwind Green
                        coordinates: [
                            [6.9420, 122.0790], [6.9420, 122.0830], 
                            [6.9380, 122.0830], [6.9380, 122.0790]
                        ]
                    },
                    {
                        name: "Purok 4",
                        color: "#f59e0b", // Tailwind Amber
                        coordinates: [
                            [6.9420, 122.0830], [6.9420, 122.0870], 
                            [6.9380, 122.0870], [6.9380, 122.0830]
                        ]
                    },
                    {
                        name: "Purok 5",
                        color: "#8b5cf6", // Tailwind Violet
                        coordinates: [
                            [6.9380, 122.0790], [6.9380, 122.0830], 
                            [6.9340, 122.0830], [6.9340, 122.0790]
                        ]
                    },
                    {
                        name: "Purok 6",
                        color: "#ec4899", // Tailwind Pink
                        coordinates: [
                            [6.9380, 122.0830], [6.9380, 122.0870], 
                            [6.9340, 122.0870], [6.9340, 122.0830]
                        ]
                    },
                    {
                        name: "Purok 7",
                        color: "#06b6d4", // Tailwind Cyan
                        coordinates: [
                            [6.9340, 122.0790], [6.9340, 122.0870], 
                            [6.9310, 122.0870], [6.9310, 122.0790]
                        ]
                    }
                ];

                // Automatically draw all Puroks from the list above
                purokZones.forEach(purok => {
                    const polygon = L.polygon(purok.coordinates, {
                        color: purok.color,
                        weight: 2,
                        fillColor: purok.color,
                        fillOpacity: 0.15 // Light tint inside the zone
                    }).addTo(issueMap);

                    // Add floating text label
                    polygon.bindTooltip(purok.name, {
                        permanent: true, 
                        direction: "center", 
                        className: "purok-label font-bold text-[10px] bg-white/80 border border-slate-300 rounded px-1"
                    });
                });
                // =========================================================

                // Lock the user from panning away from Tumaga
                const strictBounds = L.latLngBounds(tumagaBoundary);
                issueMap.setMaxBounds(strictBounds.pad(0.2)); 
                issueMap.options.minZoom = 14; 

                // Drop draggable marker exactly in the center of Tumaga
                issueMarker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(issueMap);
                
                // Update hidden inputs when the user drags the marker
                issueMarker.on('dragend', function(e) {
                    document.getElementById('incidentLat').value = e.target.getLatLng().lat;
                    document.getElementById('incidentLng').value = e.target.getLatLng().lng;
                });

                // Move the marker when map is clicked
                issueMap.on('click', function(e) {
                    issueMarker.setLatLng(e.latlng);
                    document.getElementById('incidentLat').value = e.latlng.lat;
                    document.getElementById('incidentLng').value = e.latlng.lng;
                });
            }
        }

        // Toggle Map Size
        function toggleMapFullscreen() {
            const wrapper = document.getElementById('mapWrapper');
            const mapDiv = document.getElementById('incidentMap');
            const expandIcon = document.getElementById('expandIcon');
            const collapseIcon = document.getElementById('collapseIcon');
            
            isMapFullscreen = !isMapFullscreen;

            if (isMapFullscreen) {
                // Maximize
                wrapper.classList.remove('h-[250px]', 'relative');
                wrapper.classList.add('map-fullscreen');
                mapDiv.classList.remove('rounded-lg');
                expandIcon.classList.add('hidden');
                collapseIcon.classList.remove('hidden');
            } else {
                // Minimize
                wrapper.classList.add('h-[250px]', 'relative');
                wrapper.classList.remove('map-fullscreen');
                mapDiv.classList.add('rounded-lg');
                expandIcon.classList.remove('hidden');
                collapseIcon.classList.add('hidden');
            }

            // Tell Leaflet to recalculate its dimensions so it doesn't look gray/broken
            setTimeout(() => { if(issueMap) issueMap.invalidateSize(); }, 300);
        }

        // ==========================================
        // UI & WIDGET LOGIC
        // ==========================================

        function toggleOnBehalfFields() {
            const isChecked = document.getElementById('onBehalfToggle').checked;
            const onBehalfFields = document.getElementById('onBehalfFields');
            
            if (isChecked) {
                onBehalfFields.classList.remove('hidden');
                document.getElementById('proxyName').required = true;
                document.getElementById('proxyRelation').required = true;
            } else {
                onBehalfFields.classList.add('hidden');
                document.getElementById('proxyName').required = false;
                document.getElementById('proxyRelation').required = false;
                document.getElementById('proxyName').value = '';
                document.getElementById('proxyRelation').value = '';
                document.getElementById('proxyContact').value = '';
            }
        }

        function populateResidentSearch(residents) {
            const datalist = document.getElementById('residentList');
            datalist.innerHTML = ''; 
            residents.forEach(res => {
                if (res.residentID !== currentUser.residentID) {
                    const fullName = `${res.firstName} ${res.lastName}`;
                    const option = document.createElement('option');
                    option.value = fullName;
                    datalist.appendChild(option);
                }
            });
        }

        function checkProfileCompletion(user) {
            const requiredKeys = ['phone', 'address', 'weight', 'height', 'bloodType', 'civilStatus', 'education', 'employment', 'income', 'householdSize', 'isHeadOfFamily', 'dwellingType', 'householdNumber', 'emergencyName', 'emergencyRel', 'emergencyPhone'];
            let filledCount = user.profilePic && user.profilePic.startsWith('data:image') ? 1 : 0;
            const totalRequired = requiredKeys.length + 1; 

            requiredKeys.forEach(key => { if (user[key] && String(user[key]).trim() !== "") filledCount++; });
            const percentage = Math.round((filledCount / totalRequired) * 100);
            
            const sidebarBadge = document.getElementById('sidebarCompletionBadge');
            if (sidebarBadge) {
                if (percentage < 100) {
                    sidebarBadge.innerText = `${percentage}%`;
                    sidebarBadge.classList.remove('hidden');
                } else sidebarBadge.classList.add('hidden'); 
            }
        }

        function loadUserStats() {
            if (!currentUser) return; 
            const allReports = getTable('brgy_reports');
            const myReports = allReports.filter(report => report.residentID === currentUser.residentID);
            
            document.getElementById('stat-total').innerText = myReports.length;
            document.getElementById('stat-pending').innerText = myReports.filter(r => r.status === 'Pending' || r.status === 'Reviewing').length;
            document.getElementById('stat-resolved').innerText = myReports.filter(r => r.status === 'Resolved' || r.status === 'Settled').length;
        }

        function toggleFormFields() {
            const category = document.getElementById('issueCategory').value;
            const normalFields = document.getElementById('normalFields');
            const disputeFields = document.getElementById('disputeFields');
            const submitBtn = document.getElementById('submitBtn');
            
            const otherCategoryDiv = document.getElementById('otherCategoryDiv');
            const otherCategoryInput = document.getElementById('otherCategoryInput');

            removeImagePreview(); 
            
            normalFields.classList.add('hidden');
            disputeFields.classList.add('hidden');
            submitBtn.classList.remove('hidden');

            if (category === 'General Concern') {
                otherCategoryDiv.classList.remove('hidden');
                otherCategoryInput.required = true;
            } else {
                otherCategoryDiv.classList.add('hidden');
                otherCategoryInput.required = false;
                otherCategoryInput.value = '';
            }

            if (category === 'Lupon Dispute') {
                disputeFields.classList.remove('hidden');
                submitBtn.innerText = "Submit Formal Complaint";
                
                document.getElementById('disputeType').required = true;
                document.getElementById('disputeDescription').required = true;
                document.getElementById('respondentsData').required = true; 
                
                document.getElementById('normalDescription').required = false;
                document.getElementById('normalLocation').required = false;
            } else {
                normalFields.classList.remove('hidden');
                submitBtn.innerText = "Submit Official Report";

                document.getElementById('normalDescription').required = true;
                document.getElementById('normalLocation').required = false; // Made optional since map does the work
                
                document.getElementById('disputeType').required = false;
                document.getElementById('disputeDescription').required = false;
                document.getElementById('respondentsData').required = false;

                // Load map ONLY when general issues section is visible
                setTimeout(() => {
                    initLeafletMap();
                    issueMap.invalidateSize();
                }, 100);
            }
        }

        function toggleDisputeFields() {
            const disputeType = document.getElementById('disputeType').value;
            const otherDisputeDiv = document.getElementById('otherDisputeDiv');
            const otherDisputeInput = document.getElementById('otherDisputeInput');

            if (disputeType === 'Other') {
                otherDisputeDiv.classList.remove('hidden');
                otherDisputeInput.required = true;
            } else {
                otherDisputeDiv.classList.add('hidden');
                otherDisputeInput.required = false;
                otherDisputeInput.value = '';
            }
        }

        function logout() {
            localStorage.removeItem('brgy_active_session');
            sessionStorage.removeItem('activeSession');
            window.location.href = '../login/login.html'; 
        }

        function openModal() { document.getElementById('guidelinesModal').classList.remove('hidden'); }
        function closeModal() { document.getElementById('guidelinesModal').classList.add('hidden'); }

        // ==========================================
        // LIST MANAGER (Respondents & Witnesses)
        // ==========================================

        function addPerson(type) {
            const inputEl = document.getElementById(type === 'respondents' ? 'respondentInput' : 'witnessInput');
            const name = inputEl.value.trim();
            if (!name) return;

            let targetList = type === 'respondents' ? respondentsList : witnessesList;
            if (targetList.includes(name)) {
                alert("This person is already in the list.");
                return;
            }

            targetList.push(name);
            inputEl.value = ''; 
            renderTags(type);
        }

        function removePerson(type, nameToRemove) {
            if (type === 'respondents') {
                respondentsList = respondentsList.filter(name => name !== nameToRemove);
            } else {
                witnessesList = witnessesList.filter(name => name !== nameToRemove);
            }
            renderTags(type);
        }

        function renderTags(type) {
            const container = document.getElementById(type === 'respondents' ? 'respondentsContainer' : 'witnessesContainer');
            const targetList = type === 'respondents' ? respondentsList : witnessesList;
            
            container.innerHTML = '';
            
            targetList.forEach(name => {
                const badgeColor = type === 'respondents' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                const tag = document.createElement('div');
                tag.className = `tag-enter inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${badgeColor}`;
                tag.innerHTML = `
                    ${name}
                    <button type="button" onclick="removePerson('${type}', '${name}')" class="hover:text-black focus:outline-none ml-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                `;
                container.appendChild(document.createElement('div')).appendChild(tag);
            });

            if (type === 'respondents') {
                const hiddenDataInput = document.getElementById('respondentsData');
                hiddenDataInput.value = respondentsList.join(', ');
            }
        }

        // ==========================================
        // IMAGE UPLOAD LOGIC
        // ==========================================
        
        document.getElementById('normalPhoto').addEventListener('change', function(event) {
            const file = event.target.files[0];
            const previewContainer = document.getElementById('imagePreviewContainer');
            const previewImage = document.getElementById('imagePreview');
            const dropZone = document.getElementById('uploadDropZone');

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    base64Photo = e.target.result;
                    previewImage.src = base64Photo;
                    previewContainer.classList.remove('hidden');
                    dropZone.classList.add('hidden'); 
                };
                reader.readAsDataURL(file);
            } else {
                removeImagePreview();
            }
        });

        function removeImagePreview() {
            document.getElementById('normalPhoto').value = ""; 
            document.getElementById('imagePreview').src = "";  
            document.getElementById('imagePreviewContainer').classList.add('hidden'); 
            base64Photo = null;
            
            const dropZone = document.getElementById('uploadDropZone');
            if(dropZone) dropZone.classList.remove('hidden'); 
        }

        // ==========================================
        // FORM SUBMISSION TO DATABASE
        // ==========================================
        
        document.getElementById('issueForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const category = document.getElementById('issueCategory').value;
            let reportPayload = {};
            
            let proxyData = null;
            if (document.getElementById('onBehalfToggle').checked) {
                proxyData = {
                    affectedName: document.getElementById('proxyName').value,
                    relationship: document.getElementById('proxyRelation').value,
                    contactNumber: document.getElementById('proxyContact').value
                };
            }

            if (category === 'Lupon Dispute') {
                if (respondentsList.length === 0) {
                    alert("Please add at least one respondent to file a dispute.");
                    return;
                }

                let finalDisputeType = document.getElementById('disputeType').value;
                if (finalDisputeType === 'Other') {
                    finalDisputeType = document.getElementById('otherDisputeInput').value || 'Other Civil Matter';
                }

                reportPayload = {
                    reportType: 'Lupon Dispute',
                    category: finalDisputeType,
                    description: document.getElementById('disputeDescription').value,
                    location: document.getElementById('disputeLocation').value,
                    respondents: respondentsList, 
                    witnesses: witnessesList,     
                    status: 'Pending Lupon Review',
                    proxyReporter: proxyData 
                };
            } else {
                
                let finalCategory = category;
                if (category === 'General Concern') {
                    finalCategory = document.getElementById('otherCategoryInput').value || 'General Concern';
                }

                reportPayload = {
                    reportType: 'General Incident',
                    category: finalCategory,
                    description: document.getElementById('normalDescription').value,
                    location: document.getElementById('normalLocation').value,
                    coordinates: {
                        lat: document.getElementById('incidentLat').value,
                        lng: document.getElementById('incidentLng').value
                    },
                    photoEvidence: base64Photo, 
                    status: 'Pending Verification',
                    proxyReporter: proxyData 
                };
            }

            const newReportID = fileReport(currentUser.residentID, reportPayload);

            if (newReportID) {
                alert(`Submission Complete.\n\nYour reference number is: ${newReportID}\nPlease retain this number for future tracking.`);
                window.location.href = 'track_reports.html';
            } else {
                alert("Critical Error: Could not save report to database.");
            }
        });