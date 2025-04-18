import { auth, db, showNotification } from './firebase.js';
import { ref, get, set, update, onValue, child } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
// ======================
// Helper Functions
// ======================

const capitalizeFirstLetter = (string) => {
  return string ? string.charAt(0).toUpperCase() + string.slice(1) : '';
};

const getBudgetLabel = (value) => {
  const budgets = {
    'economy': 'Economy ($500 - $1,500)',
    'mid-range': 'Mid-range ($1,500 - $3,500)',
    'luxury': 'Luxury ($3,500 - $7,500)',
    'premium': 'Premium ($7,500+)',
    '$0-$1000': 'Economy ($0-$1000)',
    '$1000-$3000': 'Mid-range ($1000-$3000)',
    '$3000-$5000': 'Luxury ($3000-$5000)',
    '$5000-$10000': 'Premium ($5000+)'
  };
  return budgets[value] || value;
};

const getClimateLabel = (value) => {
  const climates = {
    'tropical': 'Tropical',
    'mediterranean': 'Mediterranean',
    'temperate': 'Temperate',
    'desert': 'Desert',
    'alpine': 'Alpine',
    'spring': 'Spring',
    'winter': 'Winter',
    'autumn': 'Autumn'
  };
  return climates[value] || value;
};

const updateElement = (elementId, value, transformer = null) => {
  const element = document.getElementById(elementId);
  if (element) {
    const displayValue = value || 'Not specified';
    element.textContent = transformer ? transformer(displayValue) : displayValue;
  }
};

const updateTags = (containerId, items, transformer = capitalizeFirstLetter) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = items?.length
    ? items.map(item => `<span class="tag">${transformer(item)}</span>`).join('')
    : '<span class="empty-tag">Not specified</span>';
};

// ======================
// Load Profile Data
// ======================
console.log("Current user:", auth.currentUser);

const loadProfileData = async (userId) => {
  try {
    const profileRef = ref(db, `users/${userId}/profile`);
    const snapshot = await get(profileRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      updateElement('profileName', data.name);
      updateElement('welcomeName', data.name);
      updateElement('profileEmail', data.email);
      updateElement('profileTravelStyle', data.travelStyle, capitalizeFirstLetter);
      updateElement('profileBudget', data.budget, getBudgetLabel);
      updateElement('profileClimate', data.climate, getClimateLabel);
      updateElement('profileDuration', data.duration);

      updateTags('profileInterests', data.interests || []);
      updateTags('profileActivities', data.activities || []);

      const referralCode = `ADV${userId.substring(0, 5).toUpperCase()}`;
      updateElement('referralCode', referralCode);
      updateElement('creditsEarned', data.credits || 0);

      document.querySelectorAll('.edit-btn').forEach(btn => btn.disabled = false);
    } else {
      // Create default profile
      const defaultProfile = {
        name: auth.currentUser.displayName || 'Traveler',
        email: auth.currentUser.email,
        travelStyle: 'explorer',
        budget: 'mid-range',
        climate: 'temperate',
        duration: '1 week',
        interests: [],
        activities: [],
        credits: 0,
        specialRequests: ''
      };

      await set(profileRef, defaultProfile);
      showNotification('success', 'Profile Created', 'Your new profile has been initialized');
      await loadProfileData(userId);
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    showNotification('error', 'Loading Error', 'Failed to load profile data');
  }
};

// ======================
// Edit Profile
// ======================

const updateProfile = async (field, value) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const profileRef = ref(db, `users/${user.uid}/profile`);
    await update(profileRef, { [field]: value });

    showNotification('success', 'Updated', 'Profile updated successfully');
    await loadProfileData(user.uid);
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('error', 'Update Failed', 'Could not update profile');
  }
};

const openEditDialog = (field, currentValue) => {
  const dialog = document.createElement('div');
  dialog.className = 'edit-dialog-overlay';

  let inputContent = '';
  const title = `Edit ${capitalizeFirstLetter(field)}`;

  switch (field) {
    case 'travelStyle':
      inputContent = `
        <select id="editField" class="edit-input">
          <option value="explorer">Explorer</option>
          <option value="relaxer">Relaxer</option>
          <option value="adventurer">Adventurer</option>
          <option value="friends">Friends</option>
          <option value="cultural">Cultural</option>
        </select>`;
      break;

    case 'budget':
      inputContent = `
        <select id="editField" class="edit-input">
          <option value="economy">Economy ($0 - $1000)</option>
          <option value="mid-range">Mid-range ($1000 - $3000)</option>
          <option value="luxury">Luxury ($3000 - $5000)</option>
          <option value="premium">Premium ($5000+)</option>
        </select>`;
      break;

    case 'interests':
    case 'activities':
      const options = field === 'interests'
        ? ['Hiking', 'Beaches', 'Cities', 'History', 'Food', 'Art', 'Nature']
        : ['Swimming', 'Sightseeing', 'Museums', 'Shopping', 'Tours', 'Photography', 'Scuba'];
      const currentValues = Array.isArray(currentValue) ? currentValue : [];

      inputContent = `
        <div class="checkbox-group">
          ${options.map(opt => `
            <label><input type="checkbox" value="${opt.toLowerCase()}" ${currentValues.includes(opt.toLowerCase()) ? 'checked' : ''}> ${opt}</label>
          `).join('')}
        </div>`;
      break;

    default:
      inputContent = `<input type="text" id="editField" value="${currentValue || ''}" class="edit-input" />`;
  }

  dialog.innerHTML = `
    <div class="edit-dialog">
      <h3>${title}</h3>
      ${inputContent}
      <div class="dialog-actions">
        <button class="cancel-btn button">Cancel</button>
        <button class="save-btn button primary">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector('.cancel-btn').addEventListener('click', () => dialog.remove());
  dialog.querySelector('.save-btn').addEventListener('click', async () => {
    let newValue;

    if (field === 'interests' || field === 'activities') {
      const checkboxes = dialog.querySelectorAll('input[type="checkbox"]:checked');
      newValue = Array.from(checkboxes).map(cb => cb.value);
    } else {
      const input = dialog.querySelector('#editField');
      newValue = input.value.trim();
    }

    if (!newValue || (Array.isArray(newValue) && newValue.length === 0)) {
      showNotification('warning', 'Empty Value', 'Please enter a value');
      return;
    }

    await updateProfile(field, newValue);
    dialog.remove();
  });
};

// ======================
// Event Listeners
// ======================

const setupProfileEventListeners = () => {
  document.querySelectorAll('[id^="edit"]').forEach(btn => {
    const field = btn.id.replace('edit', '').replace('Btn', '');
    const map = {
      Name: 'name',
      TravelStyle: 'travelStyle',
      Budget: 'budget',
      Climate: 'climate',
      Duration: 'duration',
      Interests: 'interests',
      Activities: 'activities'
    };
    const key = map[field];
    if (!key) return;

    let currentValue;
    if (key === 'interests' || key === 'activities') {
      currentValue = Array.from(document.querySelectorAll(`#profile${field} .tag`)).map(tag => tag.textContent.toLowerCase());
    } else {
      currentValue = document.getElementById(`profile${field}`)?.textContent.trim();
    }

    btn.addEventListener('click', () => openEditDialog(key, currentValue));
  });
};

const setupEventListeners = () => {
  document.getElementById('logoutLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      showNotification('success', 'Logged Out', 'You have been signed out');
      window.location.href = 'login.html';
    } catch (error) {
      showNotification('error', 'Logout Failed', 'Could not sign out');
    }
  });

  document.getElementById('copyReferral')?.addEventListener('click', async () => {
    try {
      const code = document.getElementById('referralCode')?.textContent;
      await navigator.clipboard.writeText(code);
      showNotification('success', 'Copied', 'Referral code copied to clipboard');
    } catch (error) {
      showNotification('error', 'Copy Failed', 'Failed to copy referral code');
    }
  });
};

// ======================
// Initialize
// ======================

// window.addEventListener('DOMContentLoaded', () => {
//   const user = auth.currentUser;
//   if (user) {
//     loadProfileData(user.uid);
//     setupEventListeners();
//     setupProfileEventListeners();
//   } else {
//     showNotification('error', 'Not Logged In', 'Please log in to access your profile');
//   }
// });
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User is logged in:", user);
    loadProfileData(user.uid);
    setupEventListeners();
    setupProfileEventListeners();
  } else {
    console.log("❌ No user is logged in.");
    showNotification('error', 'Not Logged In', 'Please log in to access your profile');
  }
});
