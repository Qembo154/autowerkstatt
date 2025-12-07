// Data
let profiles = [];
let checklistCategories = [
    {
        id: '1',
        name: '🛢️ Öl',
        items: [
            { id: '1-1', name: 'Öl', price: 30 },
            { id: '1-2', name: 'Öl mit Filter', price: 50 },
            { id: '1-3', name: 'Ölfilter', price: 15 }
        ]
    },
    {
        id: '2',
        name: '🔧 Filter',
        items: [
            { id: '2-1', name: 'Luftfilter', price: 20 },
            { id: '2-2', name: 'Innenraumfilter', price: 25 }
        ]
    },
    {
        id: '3',
        name: '🛑 Bremsen',
        items: [
            { id: '3-1', name: 'Bremsbeläge', price: 80 },
            { id: '3-2', name: 'Bremsscheiben', price: 120 }
        ]
    },
    {
        id: '4',
        name: '🚗 Reifen',
        items: [
            { id: '4-1', name: 'Reifenwechsel', price: 50 },
            { id: '4-2', name: 'Reifen auswuchten', price: 40 }
        ]
    },
    {
        id: '5',
        name: '⚙️ Sonstiges',
        items: [
            { id: '5-1', name: 'Inspektion', price: 150 }
        ]
    }
];

let collapsedDates = new Set();
let openCategories = new Set(); // Nur OFFENE Kategorien werden gespeichert
let openSettingsCategories = new Set(); // Für Einstellungen
let currentProfileId = null;
let searchTerm = '';

// Load/Save
function loadData() {
    const saved = localStorage.getItem('profiles');
    const savedCat = localStorage.getItem('checklistCategories');
    
    if (saved) profiles = JSON.parse(saved);
    if (savedCat) checklistCategories = JSON.parse(savedCat);
}

function saveData() {
    localStorage.setItem('profiles', JSON.stringify(profiles));
    localStorage.setItem('checklistCategories', JSON.stringify(checklistCategories));
}

// Search
function filterProfiles() {
    searchTerm = document.getElementById('searchInput').value.toLowerCase();
    document.getElementById('clearSearch').style.display = searchTerm ? 'block' : 'none';
    renderProfiles();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    searchTerm = '';
    document.getElementById('clearSearch').style.display = 'none';
    renderProfiles();
}

function matchesSearch(profile) {
    if (!searchTerm) return true;
    return profile.name.toLowerCase().includes(searchTerm) || 
           profile.licensePlate.toLowerCase().includes(searchTerm);
}

// Group profiles
function groupProfilesByDate() {
    const grouped = {};
    profiles.filter(matchesSearch).forEach(profile => {
        const dateKey = new Date(profile.date).toISOString().split('T')[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(profile);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDateHeader(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const yesterdayOnly = yesterday.toISOString().split('T')[0];
    
    if (dateOnly === todayOnly) return 'Heute';
    if (dateOnly === yesterdayOnly) return 'Gestern';
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Calculate total
function calculateTotal(profile) {
    let total = 0;
    Object.entries(profile.selectedServices).forEach(([serviceId, isSelected]) => {
        if (isSelected) {
            // Check if it's a custom service
            if (serviceId.startsWith('custom-')) {
                if (profile.customServices) {
                    const customService = profile.customServices.find(cs => cs.id === serviceId);
                    if (customService) {
                        total += customService.price;
                        return;
                    }
                }
            }
            // Otherwise look in regular categories
            const item = findItemById(serviceId);
            if (item) total += item.price;
        }
    });
    return total;
}

function findItemById(itemId) {
    for (const category of checklistCategories) {
        const item = category.items.find(i => i.id === itemId);
        if (item) return item;
    }
    return null;
}

// Render profiles
function renderProfiles() {
    const container = document.getElementById('profileList');
    const grouped = groupProfilesByDate();
    
    if (grouped.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>${searchTerm ? 'Keine Ergebnisse' : 'Keine Aufträge vorhanden'}</h3>
                <p>${searchTerm ? 'Keine Profile gefunden' : 'Tippen Sie auf ➕ um zu starten'}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    grouped.forEach(([dateKey, dateProfiles]) => {
        const isCollapsed = collapsedDates.has(dateKey);
        html += `
            <div class="date-group">
                <div class="date-header" onclick="toggleDateGroup('${dateKey}')">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="chevron ${isCollapsed ? 'collapsed' : ''}">▼</span>
                        <strong>${formatDateHeader(dateKey)}</strong>
                    </div>
                    <span style="font-size: 12px; color: #666;">${dateProfiles.length} Auftrag${dateProfiles.length === 1 ? '' : 'äge'}</span>
                </div>
                <div class="collapsed-content ${isCollapsed ? 'hidden' : ''}">
        `;
        
        dateProfiles.forEach(profile => {
            const total = calculateTotal(profile);
            const statusClass = profile.isCompleted ? 'status-green' : 'status-red';
            const statusText = profile.isCompleted ? 'Fertig' : 'Nicht fertig';
            
            html += `
                <div class="profile-item" data-profile-id="${profile.id}">
                    <div class="profile-content" onclick="openProfileDetail('${profile.id}')">
                        <div>
                            <div class="profile-name">${profile.name}</div>
                            ${profile.licensePlate ? `<div class="profile-license">${profile.licensePlate}</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div class="profile-price">${total.toFixed(2)}€</div>
                            <div class="profile-status" onclick="event.stopPropagation(); quickToggleStatus('${profile.id}')" style="cursor: pointer;">
                                <span class="status-dot ${statusClass}"></span>
                                <span class="${statusClass}">${statusText}</span>
                            </div>
                        </div>
                    </div>
                    <div class="swipe-actions">
                        <button class="swipe-btn swipe-edit" onclick="quickEditProfile('${profile.id}')">✏️ Bearbeiten</button>
                        <button class="swipe-btn swipe-delete" onclick="confirmDeleteProfile('${profile.id}')">🗑️ Löschen</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
    
    // Add swipe listeners to all profile items
    setTimeout(addProfileSwipeListeners, 100);
}

function toggleDateGroup(dateKey) {
    if (collapsedDates.has(dateKey)) {
        collapsedDates.delete(dateKey);
    } else {
        collapsedDates.add(dateKey);
    }
    renderProfiles();
}

// Modals
function openAddProfile() {
    document.getElementById('profileName').value = '';
    document.getElementById('profileLicense').value = '';
    document.getElementById('profileNotes').value = '';
    document.getElementById('addProfileModal').classList.add('active');
}

function openSettings() {
    renderSettingsList();
    document.getElementById('settingsModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeModalOnOutsideClick(event, modalId) {
    if (event.target.id === modalId) {
        closeModal(modalId);
    }
}

// Save profile
function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const license = document.getElementById('profileLicense').value.trim().toUpperCase();
    const notes = document.getElementById('profileNotes').value.trim();
    
    if (!name) {
        alert('Bitte einen Namen eingeben');
        return;
    }
    
    const selectedServices = {};
    checklistCategories.forEach(category => {
        category.items.forEach(item => {
            selectedServices[item.id] = false;
        });
    });
    
    profiles.push({
        id: Date.now().toString(),
        name, licensePlate: license, notes,
        date: new Date().toISOString(),
        selectedServices,
        isCompleted: false
    });
    
    saveData();
    renderProfiles();
    closeModal('addProfileModal');
}

// Profile detail
function openProfileDetail(profileId) {
    currentProfileId = profileId;
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    document.getElementById('detailProfileName').textContent = profile.name;
    document.getElementById('detailDate').textContent = new Date(profile.date).toLocaleDateString('de-DE');
    
    if (profile.licensePlate) {
        document.getElementById('detailLicenseRow').style.display = 'flex';
        document.getElementById('detailLicense').textContent = profile.licensePlate;
    } else {
        document.getElementById('detailLicenseRow').style.display = 'none';
    }
    
    if (profile.notes) {
        document.getElementById('detailNotesSection').style.display = 'block';
        document.getElementById('detailNotes').textContent = profile.notes;
    } else {
        document.getElementById('detailNotesSection').style.display = 'none';
    }
    
    const statusDot = document.getElementById('detailStatusDot');
    const statusText = document.getElementById('detailStatus');
    const customServiceInput = document.getElementById('customServiceInput');
    
    if (profile.isCompleted) {
        statusDot.className = 'status-dot status-green';
        statusText.textContent = 'Fertig';
        statusText.style.color = '#4caf50';
        // Hide custom service input when completed
        if (customServiceInput) {
            customServiceInput.style.display = 'none';
        }
    } else {
        statusDot.className = 'status-dot status-red';
        statusText.textContent = 'Noch nicht fertig';
        statusText.style.color = '#f44336';
        // Show custom service input when not completed
        if (customServiceInput) {
            customServiceInput.style.display = 'block';
        }
    }
    
    renderDetailChecklist(profile);
    updateDetailTotal(profile);
    document.getElementById('profileDetailModal').classList.add('active');
}

// WICHTIG: Kategorien standardmäßig ZUGEKLAPPT
function renderDetailChecklist(profile) {
    const container = document.getElementById('detailChecklist');
    let html = '';
    
    // If profile is completed, show READ-ONLY summary
    if (profile.isCompleted) {
        html += '<div class="completed-summary">';
        html += '<div class="summary-header">✅ Erledigte Arbeiten:</div>';
        
        let hasAnyServices = false;
        
        // Show custom services first if any
        if (profile.customServices && profile.customServices.length > 0) {
            const selectedCustom = profile.customServices.filter(cs => profile.selectedServices[cs.id]);
            if (selectedCustom.length > 0) {
                hasAnyServices = true;
                html += `
                    <div class="completed-category">
                        <div class="completed-category-header" style="background: #fff3cd; color: #856404;">
                            <span>💡 Individuelle Services</span>
                        </div>
                        <div class="completed-category-items">
                `;
                selectedCustom.forEach(cs => {
                    html += `
                        <div class="completed-item">
                            <span class="completed-checkmark">✓</span>
                            <span class="completed-item-name">${cs.name}</span>
                            <span class="completed-item-price">${cs.price.toFixed(2)}€</span>
                        </div>
                    `;
                });
                html += '</div></div>';
            }
        }
        
        checklistCategories.forEach(category => {
            const selectedInCategory = category.items.filter(item => profile.selectedServices[item.id]);
            
            if (selectedInCategory.length > 0) {
                hasAnyServices = true;
                const isOpen = openCategories.has(category.id);
                
                html += `
                    <div class="completed-category">
                        <div class="completed-category-header" onclick="toggleCategory('${category.id}')">
                            <span>${category.name}</span>
                            <span class="category-arrow ${isOpen ? 'open' : ''}">▶</span>
                        </div>
                        <div class="completed-category-items ${isOpen ? '' : 'collapsed'}">
                `;
                
                selectedInCategory.forEach(item => {
                    html += `
                        <div class="completed-item">
                            <span class="completed-checkmark">✓</span>
                            <span class="completed-item-name">${item.name}</span>
                            <span class="completed-item-price">${item.price.toFixed(2)}€</span>
                        </div>
                    `;
                });
                
                html += '</div></div>';
            }
        });
        
        if (!hasAnyServices) {
            html += '<div class="no-services">Keine Dienstleistungen ausgewählt</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
        return;
    }
    
    // EDITABLE checklist for not completed profiles
    
    // Show custom services first if any
    if (profile.customServices && profile.customServices.length > 0) {
        html += `
            <div class="checklist-category" style="border: 2px solid #ffc107; background: #fffbf0;">
                <div class="category-header" style="background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%); color: #000;">
                    <span>💡 Individuelle Services</span>
                </div>
                <div class="category-items">
        `;
        
        profile.customServices.forEach((cs, index) => {
            const isChecked = profile.selectedServices[cs.id] || false;
            html += `
                <div class="checklist-item">
                    <label style="flex: 1;">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} 
                               onchange="toggleService('${cs.id}')">
                        <span>${cs.name}</span>
                    </label>
                    <span class="item-price">${cs.price.toFixed(2)}€</span>
                    <button class="icon-btn" onclick="removeCustomService(${index})" style="font-size: 18px; color: #f44336;" title="Löschen">🗑️</button>
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    checklistCategories.forEach(category => {
        const isOpen = openCategories.has(category.id);
        
        html += `
            <div class="checklist-category">
                <div class="category-header" onclick="toggleCategory('${category.id}')">
                    <span>${category.name}</span>
                    <span class="category-arrow ${isOpen ? 'open' : ''}">▶</span>
                </div>
                <div class="category-items ${isOpen ? '' : 'collapsed'}">
        `;
        
        category.items.forEach(item => {
            const isChecked = profile.selectedServices[item.id] || false;
            html += `
                <div class="checklist-item">
                    <label>
                        <input type="checkbox" ${isChecked ? 'checked' : ''} 
                               onchange="toggleService('${item.id}')">
                        <span>${item.name}</span>
                    </label>
                    <span class="item-price">${item.price.toFixed(2)}€</span>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

function addCustomService() {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    const nameInput = document.getElementById('customServiceName');
    const priceInput = document.getElementById('customServicePrice');
    
    const name = nameInput.value.trim();
    const priceStr = priceInput.value.trim();
    
    if (!name) {
        alert('Bitte Name eingeben!');
        return;
    }
    
    if (!priceStr) {
        alert('Bitte Preis eingeben!');
        return;
    }
    
    const price = parseFloat(priceStr.replace(',', '.'));
    if (isNaN(price) || price < 0) {
        alert('Ungültiger Preis!');
        return;
    }
    
    // Initialize customServices array if not exists
    if (!profile.customServices) {
        profile.customServices = [];
    }
    
    // Create custom service
    const customService = {
        id: `custom-${Date.now()}`,
        name: name,
        price: price
    };
    
    profile.customServices.push(customService);
    
    // Automatically select it
    profile.selectedServices[customService.id] = true;
    
    // Clear inputs
    nameInput.value = '';
    priceInput.value = '';
    
    saveData();
    renderDetailChecklist(profile);
    updateDetailTotal(profile);
    renderProfiles();
    
    alert(`✅ "${name}" hinzugefügt!`);
}

function removeCustomService(index) {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile || !profile.customServices) return;
    
    const cs = profile.customServices[index];
    if (confirm(`"${cs.name}" löschen?`)) {
        // Remove from selectedServices
        delete profile.selectedServices[cs.id];
        
        // Remove from customServices array
        profile.customServices.splice(index, 1);
        
        saveData();
        renderDetailChecklist(profile);
        updateDetailTotal(profile);
        renderProfiles();
    }
}

function toggleCategory(categoryId) {
    if (openCategories.has(categoryId)) {
        openCategories.delete(categoryId);
    } else {
        openCategories.add(categoryId);
    }
    const profile = profiles.find(p => p.id === currentProfileId);
    if (profile) renderDetailChecklist(profile);
}

function toggleService(serviceId) {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    profile.selectedServices[serviceId] = !profile.selectedServices[serviceId];
    saveData();
    updateDetailTotal(profile);
    renderProfiles();
}

function updateDetailTotal(profile) {
    const total = calculateTotal(profile);
    document.getElementById('detailTotal').textContent = `${total.toFixed(2)}€`;
}

// Status
function toggleStatus() {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    const message = profile.isCompleted ? 'Status zurücksetzen?' : 'Auftrag fertig?';
    if (confirm(message)) {
        profile.isCompleted = !profile.isCompleted;
        saveData();
        renderProfiles();
        openProfileDetail(currentProfileId);
    }
}

// Quick toggle status from list view
function quickToggleStatus(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    const message = profile.isCompleted ? 
        `"${profile.name}" - Status zurücksetzen?` : 
        `"${profile.name}" - Auftrag fertig?`;
    
    if (confirm(message)) {
        profile.isCompleted = !profile.isCompleted;
        saveData();
        renderProfiles();
    }
}

// Notes
function editNotes() {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    const newNotes = prompt('Notizen bearbeiten:', profile.notes || '');
    if (newNotes !== null) {
        profile.notes = newNotes.trim();
        saveData();
        openProfileDetail(currentProfileId);
    }
}

function editProfileName() {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    const newName = prompt('Name bearbeiten:', profile.name);
    if (newName !== null && newName.trim() !== '') {
        profile.name = newName.trim();
        saveData();
        renderProfiles();
        openProfileDetail(currentProfileId);
    }
}

function editLicensePlate() {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    const newPlate = prompt('Kennzeichen bearbeiten:', profile.licensePlate || '');
    if (newPlate !== null) {
        profile.licensePlate = newPlate.trim();
        saveData();
        renderProfiles();
        openProfileDetail(currentProfileId);
    }
}

// Quick Edit Profile (from swipe action)
function quickEditProfile(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    // Edit name
    const newName = prompt(`Name bearbeiten:\n\n(Profil: ${profile.name})`, profile.name);
    if (newName !== null && newName.trim() !== '') {
        profile.name = newName.trim();
        
        // Edit license plate
        const newPlate = prompt(`Kennzeichen bearbeiten:\n\n(Profil: ${profile.name})`, profile.licensePlate || '');
        if (newPlate !== null) {
            profile.licensePlate = newPlate.trim();
        }
        
        saveData();
        renderProfiles();
        alert(`✅ ${profile.name} aktualisiert!`);
        
        // Close swipe action
        if (currentSwipedProfile) {
            const content = currentSwipedProfile.querySelector('.profile-content');
            if (content) {
                content.style.transform = 'translateX(0)';
            }
            currentSwipedProfile.classList.remove('swiped');
            currentSwipedProfile = null;
        }
    }
}

// Delete
function confirmDeleteProfile(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    if (confirm(`${profile.name} wirklich löschen?`)) {
        deleteProfile(profileId);
    }
}

function deleteCurrentProfile() {
    if (!currentProfileId) return;
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    if (confirm(`${profile.name} wirklich löschen?`)) {
        deleteProfile(currentProfileId);
        closeModal('profileDetailModal');
    }
}

function deleteProfile(profileId) {
    profiles = profiles.filter(p => p.id !== profileId);
    saveData();
    renderProfiles();
}

// Settings - KATEGORIEN AUCH ZUGEKLAPPT
function renderSettingsList() {
    const container = document.getElementById('settingsList');
    let html = '';
    
    checklistCategories.forEach((category, catIndex) => {
        const isOpen = openSettingsCategories.has(category.id);
        
        html += `
            <div class="settings-category"
                 data-category-id="${category.id}"
                 data-category-index="${catIndex}">
                <div class="settings-category-header" onclick="toggleSettingsCategory('${category.id}')">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="drag-handle">☰</span>
                        <span>${category.name}</span>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="icon-btn" onclick="event.stopPropagation(); quickAddService('${category.id}')" style="color: white; font-size: 26px;" title="Dienstleistung hinzufügen">➕</button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteCategory('${category.id}')">🗑️</button>
                        <span class="category-arrow ${isOpen ? 'open' : ''}">▶</span>
                    </div>
                </div>
                <div class="settings-category-content ${isOpen ? '' : 'collapsed'}">
        `;
        
        category.items.forEach((item, index) => {
            html += `
                <div class="settings-item"
                     data-category-id="${category.id}"
                     data-index="${index}">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <span class="drag-handle" style="margin-left: 10px;">☰</span>
                        <div>
                            <div style="font-weight: 600;">${item.name}</div>
                            <div style="color: #666; font-size: 14px;">${item.price.toFixed(2)}€</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="icon-btn" onclick="event.stopPropagation(); editService('${category.id}', '${item.id}')" style="font-size: 20px;">✏️</button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteService('${category.id}', '${item.id}')" style="font-size: 20px; color: #f44336;">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
    
    // Initialize SortableJS for mobile & desktop
    setTimeout(initSortableJS, 100);
}

function toggleSettingsCategory(categoryId) {
    if (openSettingsCategories.has(categoryId)) {
        openSettingsCategories.delete(categoryId);
    } else {
        openSettingsCategories.add(categoryId);
    }
    renderSettingsList();
}

// Quick add service directly to a category
function quickAddService(categoryId) {
    const category = checklistCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    const name = prompt(`Neue Dienstleistung zu "${category.name}" hinzufügen:\n\nName:`);
    if (!name || name.trim() === '') return;
    
    const priceStr = prompt('Preis (€):');
    if (!priceStr) return;
    
    const price = parseFloat(priceStr.replace(',', '.'));
    if (isNaN(price)) {
        alert('Ungültiger Preis!');
        return;
    }
    
    const newItem = {
        id: `${categoryId}-${Date.now()}`,
        name: name.trim(),
        price: price
    };
    
    category.items.push(newItem);
    saveData();
    
    // Ensure category is open to show the new item
    openSettingsCategories.add(categoryId);
    renderSettingsList();
    
    // Show success message
    alert(`✅ "${name}" wurde zu "${category.name}" hinzugefügt!`);
}

// Add category
function showAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'block';
    document.getElementById('categoryName').value = '';
}

function cancelAddCategory() {
    document.getElementById('addCategoryForm').style.display = 'none';
}

function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) {
        alert('Bitte einen Namen eingeben');
        return;
    }
    
    checklistCategories.push({
        id: Date.now().toString(),
        name: name,
        items: []
    });
    
    saveData();
    renderSettingsList();
    cancelAddCategory();
}

function deleteCategory(categoryId) {
    const category = checklistCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    if (!confirm(`Kategorie "${category.name}" wirklich löschen?`)) return;
    
    checklistCategories = checklistCategories.filter(c => c.id !== categoryId);
    saveData();
    renderSettingsList();
}

// Add service
function showAddServiceForm() {
    const select = document.getElementById('serviceCategory');
    select.innerHTML = '';
    
    checklistCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
    
    document.getElementById('addServiceForm').style.display = 'block';
    document.getElementById('serviceName').value = '';
    document.getElementById('servicePrice').value = '';
}

function cancelAddService() {
    document.getElementById('addServiceForm').style.display = 'none';
}

function addService() {
    const categoryId = document.getElementById('serviceCategory').value;
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    
    if (!name || isNaN(price)) {
        alert('Bitte Name und Preis eingeben');
        return;
    }
    
    const category = checklistCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    category.items.push({
        id: `${categoryId}-${Date.now()}`,
        name: name,
        price: price
    });
    
    saveData();
    renderSettingsList();
    cancelAddService();
}

function editService(categoryId, itemId) {
    const category = checklistCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    const item = category.items.find(i => i.id === itemId);
    if (!item) return;
    
    // First prompt: Name
    const newName = prompt(`Name bearbeiten:\n\n(Aktuell: ${item.name})`, item.name);
    if (newName === null) return; // User cancelled
    
    // Second prompt: Price
    const newPriceStr = prompt(`Preis bearbeiten (€):\n\n(Aktuell: ${item.price}€)`, item.price);
    if (newPriceStr === null) {
        // User cancelled price, but we still save the name if it changed
        if (newName.trim() !== '' && newName.trim() !== item.name) {
            item.name = newName.trim();
            saveData();
            renderSettingsList();
            alert(`✅ Name aktualisiert: "${item.name}"`);
        }
        return;
    }
    
    // Parse and validate price
    const price = parseFloat(newPriceStr.toString().replace(',', '.'));
    if (isNaN(price) || price < 0) {
        alert('❌ Ungültiger Preis! Bitte nur Zahlen eingeben.');
        return;
    }
    
    // Save both changes
    let changed = false;
    if (newName.trim() !== '' && newName.trim() !== item.name) {
        item.name = newName.trim();
        changed = true;
    }
    if (price !== item.price) {
        item.price = price;
        changed = true;
    }
    
    if (changed) {
        saveData();
        renderSettingsList();
        alert(`✅ Aktualisiert!\n\nName: ${item.name}\nPreis: ${item.price.toFixed(2)}€`);
    }
}

function deleteService(categoryId, itemId) {
    const category = checklistCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    const item = category.items.find(i => i.id === itemId);
    if (!item) return;
    
    if (!confirm(`"${item.name}" wirklich löschen?`)) return;
    
    category.items = category.items.filter(i => i.id !== itemId);
    saveData();
    renderSettingsList();
}

// Update App - Clear Cache & Reload
async function updateApp() {
    if (!confirm('App aktualisieren?\n\nCache wird gelöscht und Seite neu geladen.')) {
        return;
    }
    
    try {
        // Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }
        
        // Unregister service worker
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => registration.unregister())
            );
        }
        
        // Show success message
        alert('✅ Cache gelöscht!\n\nSeite wird neu geladen...');
        
        // Reload page
        window.location.reload(true);
    } catch (error) {
        console.error('Update error:', error);
        alert('Fehler beim Update. Bitte manuell aktualisieren:\n\nStrg + Umschalt + R');
    }
}

// Export Data
function exportData() {
    try {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            profiles: profiles,
            checklistCategories: checklistCategories
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        
        const date = new Date().toISOString().split('T')[0];
        link.download = `autowerkstatt-backup-${date}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`✅ Daten exportiert!\n\nDatei: autowerkstatt-backup-${date}.json\n\n📱 Diese Datei sichern!`);
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Fehler beim Exportieren!');
    }
}

// Import Data
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('⚠️ Daten importieren?\n\nAlle aktuellen Daten werden überschrieben!')) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate data
            if (!data.profiles || !data.checklistCategories) {
                throw new Error('Ungültige Datei!');
            }
            
            // Import data
            profiles = data.profiles;
            checklistCategories = data.checklistCategories;
            
            // Save to localStorage
            saveData();
            
            // Update UI
            renderProfiles();
            
            const profileCount = profiles.length;
            alert(`✅ Import erfolgreich!\n\n${profileCount} Profile importiert!`);
            
            // Close settings modal
            closeModal('settingsModal');
            
        } catch (error) {
            console.error('Import error:', error);
            alert('❌ Fehler beim Importieren!\n\nUngültige Datei.');
        }
        
        // Reset file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Init
loadData();
renderProfiles();

// RESCUE MODE - Check for old data on first load
checkForRescueData();

function checkForRescueData() {
    // Check if there's data but user hasn't seen the rescue banner yet
    const rescueShown = localStorage.getItem('rescueBannerShown');
    
    if (!rescueShown && profiles.length > 0) {
        // Show rescue banner
        const banner = document.getElementById('rescueBanner');
        if (banner) {
            banner.style.display = 'block';
        }
    }
}

function rescueExport() {
    // Same as exportData but marks rescue as done
    try {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            profiles: profiles,
            checklistCategories: checklistCategories
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        
        const date = new Date().toISOString().split('T')[0];
        link.download = `autowerkstatt-RESCUE-${date}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Mark rescue as done
        localStorage.setItem('rescueBannerShown', 'true');
        
        // Hide banner
        const banner = document.getElementById('rescueBanner');
        if (banner) {
            banner.style.display = 'none';
        }
        
        const profileCount = profiles.length;
        alert(`✅ DATEN GERETTET!\n\n${profileCount} Aufträge exportiert!\n\nDatei: autowerkstatt-RESCUE-${date}.json\n\n💾 Diese Datei SICHERN!\n\nDann in neuer App importieren!`);
        
    } catch (error) {
        console.error('Rescue export error:', error);
        alert('❌ Fehler beim Export!');
    }
}

// Profile Swipe functionality
let swipeStartX = 0;
let swipeStartY = 0;
let currentSwipedProfile = null;

function addProfileSwipeListeners() {
    const profileItems = document.querySelectorAll('.profile-item');
    
    profileItems.forEach(item => {
        item.addEventListener('touchstart', handleProfileTouchStart, {passive: true});
        item.addEventListener('touchmove', handleProfileTouchMove, {passive: false});
        item.addEventListener('touchend', handleProfileTouchEnd, {passive: true});
    });
}

function handleProfileTouchStart(event) {
    // Close any currently swiped profile first
    if (currentSwipedProfile && currentSwipedProfile !== event.currentTarget) {
        currentSwipedProfile.classList.remove('swiped');
    }
    
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
}

function handleProfileTouchMove(event) {
    const deltaX = event.touches[0].clientX - swipeStartX;
    const deltaY = event.touches[0].clientY - swipeStartY;
    
    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        event.preventDefault();
        
        const item = event.currentTarget;
        const content = item.querySelector('.profile-content');
        if (!content) return;
        
        // Only allow swipe left (negative deltaX)
        if (deltaX < 0) {
            const translateX = Math.max(deltaX, -160);
            content.style.transform = `translateX(${translateX}px)`;
        } else if (item.classList.contains('swiped')) {
            // Allow swipe right to close if already swiped
            const translateX = Math.min(deltaX - 160, 0);
            content.style.transform = `translateX(${translateX}px)`;
        }
    }
}

function handleProfileTouchEnd(event) {
    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const item = event.currentTarget;
    const content = item.querySelector('.profile-content');
    if (!content) return;
    
    // Determine if swipe was significant enough
    if (deltaX < -60) {
        // Swipe left - show actions
        content.style.transform = 'translateX(-160px)';
        item.classList.add('swiped');
        currentSwipedProfile = item;
    } else if (deltaX > 60 && item.classList.contains('swiped')) {
        // Swipe right - close actions
        content.style.transform = 'translateX(0)';
        item.classList.remove('swiped');
        currentSwipedProfile = null;
    } else {
        // Not enough swipe, return to current state
        if (item.classList.contains('swiped')) {
            content.style.transform = 'translateX(-160px)';
        } else {
            content.style.transform = 'translateX(0)';
        }
    }
}

// Close swiped profile when clicking outside
document.addEventListener('click', function(event) {
    if (currentSwipedProfile && !event.target.closest('.profile-item')) {
        const content = currentSwipedProfile.querySelector('.profile-content');
        if (content) {
            content.style.transform = 'translateX(0)';
        }
        currentSwipedProfile.classList.remove('swiped');
        currentSwipedProfile = null;
    }
});


// Drag and Drop handlers

// Touch support for mobile - USING SORTABLEJS (PROFESSIONAL!)
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSortableJS, 500);
});

let sortableInstances = [];

function initSortableJS() {
    // Clear old instances
    sortableInstances.forEach(instance => {
        try {
            instance.destroy();
        } catch (e) {
            // Ignore errors from already destroyed instances
        }
    });
    sortableInstances = [];
    
    // Items within each category
    const categoryContainers = document.querySelectorAll('.settings-category-content');
    categoryContainers.forEach(container => {
        const categoryEl = container.closest('.settings-category');
        const categoryId = categoryEl?.getAttribute('data-category-id');
        if (!categoryId) return;
        
        const sortable = Sortable.create(container, {
            animation: 250,
            easing: "cubic-bezier(1, 0, 0, 1)",
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            
            // Mobile-optimized settings
            delay: 300, // 300ms for better iOS recognition
            delayOnTouchOnly: true,
            touchStartThreshold: 5, // More forgiving on iOS
            forceFallback: false,
            
            onStart: function(evt) {
                // Haptic feedback on iOS
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            },
            
            onEnd: function(evt) {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;
                
                if (oldIndex === newIndex) return;
                
                const category = checklistCategories.find(c => c.id === categoryId);
                if (!category) return;
                
                // Reorder items
                const [movedItem] = category.items.splice(oldIndex, 1);
                category.items.splice(newIndex, 0, movedItem);
                
                saveData();
                renderSettingsList();
            }
        });
        
        sortableInstances.push(sortable);
    });
    
    // Categories themselves
    const categoriesList = document.getElementById('settingsList');
    if (categoriesList) {
        const sortable = Sortable.create(categoriesList, {
            animation: 250,
            easing: "cubic-bezier(1, 0, 0, 1)",
            handle: '.settings-category-header .drag-handle',
            ghostClass: 'sortable-ghost-category',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            
            // Mobile-optimized settings
            delay: 300,
            delayOnTouchOnly: true,
            touchStartThreshold: 5,
            forceFallback: false,
            
            onStart: function(evt) {
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            },
            
            onEnd: function(evt) {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;
                
                if (oldIndex === newIndex) return;
                
                // Reorder categories
                const [movedCategory] = checklistCategories.splice(oldIndex, 1);
                checklistCategories.splice(newIndex, 0, movedCategory);
                
                saveData();
                renderSettingsList();
            }
        });
        
        sortableInstances.push(sortable);
    }
}
