import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail ,signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection, deleteDoc, updateDoc, onSnapshot, serverTimestamp, writeBatch, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes, deleteObject, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { db, auth, storage } from './firebaseConfig.js'; //With this line you dont need to initialise app as firebaseConfig.js does it already


let pets = window.pets || [];
let petAppointments = window.petAppointments || [];
let supplyItems = window.supplyItems || [];


// 1. Populate message section 
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Call loadPets() to load pets from Firestore
        loadPets();
        fetchAndDisplayUsername();
        loadAppointments();
        loadSupplies();
    } else {
        console.log("No user signed in.");
    }
});

// FIREBASE 1. Function to retrieve and display username
async function fetchAndDisplayUsername() {
    const userUID = window.currentUserUID;
    if (userUID) {
        try {
            // Reference to the user's document
            const userDocRef = doc(db, 'users', userUID);
            
            // Retrieve the document data
            const userDocSnapshot = await getDoc(userDocRef);
            
            // Check if document exists and has username field
            if (userDocSnapshot.exists()) {
                const userData = userDocSnapshot.data();
                const userName = userData.username || "User"; // Default to "User" if username is undefined
                
                // Display the username in the HTML element
                document.getElementById("user-name").textContent = userName + '!';;
            } else {
                console.log("User document not found.");
            }
        } catch (error) {
            console.error("Error fetching username: ", error);
        }
    } else {
        console.log("User UID not found.");
    }
}

//FIREBASE 2. Load Pets from Firestore into array pets
window.loadPets = async function loadPets() {
    const userUID = window.currentUserUID;
    // console.log("loadPets() activated");

    if (userUID) {
        try {
            // Reference to the 'pets' collection under the user's document
            const petsCollectionRef = collection(db, 'users', userUID, 'pets');

            // Get all documents from the pets collection
            const querySnapshot = await getDocs(petsCollectionRef);

            // Clear the pets array before adding new data
            pets = [];

            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.id = doc.id; // Add document ID to the pet data
                    pets.push(docData); // Add the pet data to the pets array
                    // console.log("Loaded pet:", docData);
                });

                // console.log("Pets loaded successfully:", pets);
            } else {
                console.log("No pets found for this user.");
            }

            // Call renderPets() after loading the pets from firestore
            renderPets();
            renderUpcomingBirthdays();

        } catch (error) {
            console.error("Error loading pets: ", error);
        }
    } else {
        console.log("User UID not found.");
    }
};

//FIREBASE 3. Load Appointments from Firestore into array petAppointments
window.loadAppointments = async function loadAppointments() {
    const userUID = window.currentUserUID; // Get the current user's UID

    if (userUID) {
        try {
            // Reference to the 'appointments' collection under the user's document
            const appointmentsCollectionRef = collection(db, 'users', userUID, 'appointments');

            // Get all documents from the appointments collection
            const querySnapshot = await getDocs(appointmentsCollectionRef);

            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.id = doc.id; // Add document ID to the appointment data
                    petAppointments.push(docData); // Add the appointment data to the appointments array
                    // console.log("Loaded appointment:", docData);
                });
            // Sort the petAppointments array by date and time
            petAppointments.sort((a, b) => {
                const dateComparison = new Date(a.date) - new Date(b.date);
                if (dateComparison === 0) {
                    // If dates are the same, compare the times
                    return a.time.localeCompare(b.time);
                }
                return dateComparison;
            });
                renderAppointments() //renderAppointments() needs to be called here in order for appointment table to be displayed once page is loaded
                // console.log("Appointments loaded successfully:", petAppointments);
            } else {
                console.log("No appointments found for this user.");
            }

        } catch (error) {
            console.error("Error loading appointments: ", error);
        }
    } else {
        // console.log("User UID not found.");
    }
};

//FIREBASE 4. Load supply items from Firestore into array supplyItems
window.loadSupplies = async function loadSupplies() {
    const userUID = window.currentUserUID;
    // console.log("loadSupplies() activated");

    if (userUID) {
        try {
            // Reference to the 'supplies' collection under the user's document
            const suppliesCollectionRef = collection(db, 'users', userUID, 'supplies');

            // Get all documents from the supplies collection
            const querySnapshot = await getDocs(suppliesCollectionRef);

            // Clear the supplyItems array before adding new data
            // supplyItems = [];

            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.id = doc.id; // Add document ID to the supply data
                    supplyItems.push(docData); // Add the supply data to the supplyItems array
                    // console.log("Loaded supply item:", docData);
                });
                 // Call renderLowSupplies() after loading the supply items from Firestore
                renderLowSupplies();
                // console.log("Supply items loaded successfully:", supplyItems);
            } else {
                console.log("No supply items found for this user.");
            }

           

        } catch (error) {
            console.error("Error loading supply items: ", error);
        }
    } else {
        console.log("User UID not found.");
    }
};

// 2. Populate pet overview section
function renderPets() {
    const petsContainer = document.getElementById('pets-overview');
    pets.sort((a, b) => new Date(b.birthday) - new Date(a.birthday)); // Sort by birthday
    const activePets = pets.filter(pet => pet.status === 'Active');

    // If no appointments in the next two weeks
    if (activePets.length === 0) {
        petsContainer.innerHTML = '<p>No active pets found!</p>';
        return;
    }

    
    // Clear existing content
    petsContainer.innerHTML = '';
    
    // Iterate over pets array and generate HTML for each pet
    activePets.forEach(pet => {
        const petCard = `
            <div class="col-sm-6 col-md-4 col-lg-3 mb-4">
                <div class="pet-card card no-border" style="box-shadow: 0px 0px 0px rgba(0, 0, 0, 0.0);">
                    <img src="${pet.image}" alt="${pet.name}" class="card-img-top pet-image img-fluid">
                    <div class="card-body" style="padding-top:5px;">
                        <p class="card-title pet-name">${pet.name}</p>
                    </div>
                </div>
            </div>
        `;
        petsContainer.innerHTML += petCard;
    });
}

// 3. Populate Upcoming Appointments section
// Format date in the format "MMM DD, YYYY"
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
}

// Function to format time to AM/PM
function formatTime(timeString) {
    const [hour, minute] = timeString.split(':');
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Function to get the 10 nearest upcoming appointments
function getUpcomingAppointments() {
    const today = new Date();
    // Sort appointments by date and time
    const sortedAppointments = petAppointments.slice().sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });

    // Filter appointments to only include those in the future
    const upcomingAppointments = sortedAppointments.filter(appointment => {
        const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
        return appointmentDate >= today;
    });

    // Filter appointment to those with isHidden="False"
    const upcomingActiveAppointments = upcomingAppointments.filter(appointment => appointment.isHidden === "False"); 

    // Get the 10 nearest appointments
    return upcomingActiveAppointments.slice(0, 10);
}

// Function to check if an appointment is within 24 hours
// function isWithin24Hours(appointmentDate) {
//     const now = new Date();
//     const oneDayInMillis = 24 * 60 * 60 * 1000;
//     return (appointmentDate - now) <= oneDayInMillis && appointmentDate > now;
// }

window.isWithin24Hours = async function isWithin24Hours(appointmentDate) {
    const now = new Date();
    const oneDayInMillis = 24 * 60 * 60 * 1000;
    return (appointmentDate - now) <= oneDayInMillis && appointmentDate > now;
}

// FIREBASE Function to toggle appointment completion status and update appointment status in Firestore
// Async function to toggle appointment completion status
window.toggleCompletion = async function toggleCompletion(apptID) {
    // Get the selected appointment based on the provided index
    const index = petAppointments.findIndex(appointment => appointment.id === apptID);
    const appointment = petAppointments[index];
    const userUID = window.currentUserUID; // Ensure that we have the user's UID from the global variable
    // Toggle the completion status
    appointment.isComplete = appointment.isComplete === "Incomplete" ? "Complete" : "Incomplete";

    // Update the global array to reflect the changes
    petAppointments[index] = appointment;

    // Re-render the table to reflect changes
    renderAppointments();

    // Update the Firestore document for this appointment
    if (userUID) {
        try {
            // Reference to the specific document in the updated path
            const appointmentDocRef = doc(db, 'users', userUID, 'appointments', appointment.id);

            // Update the document's isComplete field
            await updateDoc(appointmentDocRef, { isComplete: appointment.isComplete });
            // console.log(`Appointment ${appointment.id} completion status updated to ${appointment.isComplete}.`);
        } catch (error) {
            console.error(`Error updating appointment ${appointment.id} in Firestore:`, error);
        }
    } else {
        console.error('User UID or appointment ID is missing. Cannot update Firestore.');
    }
}

// The commented out function below is the buggy version of toggleCompleted. Under certain conditions, clicking the green
// tick button would cause the complete status of the wrong appointment to be updated. I remedied this by making the toggleCompletion()
// function take in the appointment ID as an argument rather than its index in the petAppointments array.

// window.toggleCompletion = async function toggleCompletion(index) {
//     // Get the selected appointment based on the provided index
//     const appointment = petAppointments[index];
//     const userUID = window.currentUserUID; // Ensure that we have the user's UID from the global variable
//     // Toggle the completion status
//     appointment.isComplete = appointment.isComplete === "Incomplete" ? "Complete" : "Incomplete";

//     // Update the global array to reflect the changes
//     petAppointments[index] = appointment;

//     // Re-render the table to reflect changes
//     renderAppointments();

//     // Update the Firestore document for this appointment
//     if (userUID) {
//         try {
//             // Reference to the specific document in the updated path
//             const appointmentDocRef = doc(db, 'users', userUID, 'appointments', appointment.id);

//             // Update the document's isComplete field
//             await updateDoc(appointmentDocRef, { isComplete: appointment.isComplete });
//             // console.log(`Appointment ${appointment.id} completion status updated to ${appointment.isComplete}.`);
//         } catch (error) {
//             console.error(`Error updating appointment ${appointment.id} in Firestore:`, error);
//         }
//     } else {
//         console.error('User UID or appointment ID is missing. Cannot update Firestore.');
//     }
// }


// Function to render the appointments in a table
function renderAppointments() {
    const upcomingAppointments = getUpcomingAppointments();
    const apptsContainer = document.getElementById('upcoming-appts');
    const highlightBox = document.getElementById('24hours-appt-box');
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Check if there are any appointments within the next 24 hours
    const has24HourAppointments = upcomingAppointments.some(appointment => {
        const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
        return appointmentDateTime >= now && appointmentDateTime <= twentyFourHoursFromNow;
    });

    // Update the highlight box message
    if (has24HourAppointments) {
        highlightBox.innerHTML = '<p>Appointments occurring within the next 24 hours are highlighted in red for your attention!</p>';
        highlightBox.classList.add('upcoming-appts-box');
    } else {
        highlightBox.innerHTML = ''; // Clear the message if no 24-hour appointments
        highlightBox.classList.remove('upcoming-appts-box');
    }

    // If no appointments in the next two weeks, show a message
    if (upcomingAppointments.length === 0) {
        apptsContainer.innerHTML = '<p>No upcoming appointments!</p>';
        return;
    }

    // Create the table structure with CSS classes for styling
    let tableHTML = `
        <table class="custom-table">
            <thead>
                <tr>
                    <th>Appointment Category</th>
                    <th>Pet</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    upcomingAppointments.forEach((appointment) => {
        const strikeThroughClass = appointment.isComplete === "Complete" ? "strikethrough" : "";
        const completeButtonColor = appointment.isComplete === "Complete" ? "#378636" : "#6C7277";
        const completeIcon = appointment.isComplete === "Complete" ? "fa-solid fa-square-check" : "fa-regular fa-square";
        const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
        const isWithin24Hours = appointmentDateTime >= now && appointmentDateTime <= twentyFourHoursFromNow;
        const rowBackgroundColor = isWithin24Hours ? "background-color: #f8e2de;" : "";
    
        tableHTML += `
            <tr style="${rowBackgroundColor}">
                <td class="${strikeThroughClass}">${appointment.appointmentType}</td>
                <td class="${strikeThroughClass}">${appointment.pet}</td>
                <td class="${strikeThroughClass}">${formatDate(appointment.date)}</td>
                <td class="${strikeThroughClass}">${formatTime(appointment.time)}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewAppointment('${appointment.id}')">View Information</button>
                    <button class="btn" onclick="toggleCompletion('${appointment.id}')" style="color: ${completeButtonColor};">
                        <i class="${completeIcon}"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';

    // Insert the table into the container
    apptsContainer.innerHTML = tableHTML;

    // Render the reminder message
    renderReminderMessage();
}

// Function to render the reminder message for past incomplete appointments
function renderReminderMessage() {
    const now = new Date();
    const reminderContainer = document.getElementById('reminder-box');
    
    // Get past incomplete appointments
    const pastIncompleteAppointments = petAppointments.filter(appointment => {
        const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
        return appointmentDateTime < now && appointment.isComplete === "Incomplete";
    });

    // If there are past incomplete appointments, display the reminder box
    if (pastIncompleteAppointments.length > 0) {
        reminderContainer.innerHTML = `
            <div class="reminder-message-box">
                <h3 class="reminder-header">Reminder to Reschedule</h3>
                <p class="reminder-text">
                    You have ${pastIncompleteAppointments.length} incomplete appointment(s) that are past their scheduled time. 
                    <br>Please review and reschedule them as soon as possible.
                </p>
                <button class="calendar-view-btn" onclick="openAppointmentsPage()" style="font-size:12px;">
                     <i class="fas fa-external-link-alt"></i> View All Appointments
                </button>
            </div>
        `;
    } else {
        reminderContainer.innerHTML = ''; // Clear the reminder box if no reminders are needed
    }
}

// Function to open the appointments page
// function openAppointmentsPage() {
window.openAppointmentsPage = function () {
    window.location.href = 'healthcare.html';
}


// Function to handle modal population and display
window.viewAppointment = function (appointmentId) {
    const appointment = getUpcomingAppointments().find(appt => appt.id === appointmentId);
    if (!appointment) return; // Handle case where appointment is not found

    const modalContent = `
        <p><strong>Appointment Type:</strong> ${appointment.appointmentType}</p>
        <p><strong>Pet:</strong> ${appointment.pet}</p>
        <p><strong>Date:</strong> ${formatDate(appointment.date)}</p>
        <p><strong>Time:</strong> ${formatTime(appointment.time)}</p>
        <p><strong>Address:</strong> ${appointment.address}</p>
        <p><strong>Details:</strong> ${appointment.details}</p>
    `;

    document.getElementById('modal-content').innerHTML = modalContent;
    new bootstrap.Modal(document.getElementById('appointmentModal')).show();
}


// Function to close the modal using Bootstrap's modal function
window.closeModal = function(modalId) {
    // Use Bootstrap's hide function
    const modalElement = document.getElementById(modalId);
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    if (modalInstance) {
        modalInstance.hide();
    }
};


// 4. Populate upcoming birthdays
function renderUpcomingBirthdays() {
    const upcomingBirthdaysContainer = document.getElementById('upcoming-birthdays');
    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);

    // Helper function to calculate the pet's age on the next birthday
    function calculateNextAge(birthday) {
        const birthDate = new Date(birthday);
        const age = today.getFullYear() - birthDate.getFullYear();
        const isBirthdayPassedThisYear = (new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) < today);
        return isBirthdayPassedThisYear ? age + 1 : age;
    }

    // Helper function to check if a birthday is within the next two weeks
    function isBirthdayWithinTwoWeeks(birthday) {
        const birthDateThisYear = new Date(today.getFullYear(), new Date(birthday).getMonth(), new Date(birthday).getDate());
        return birthDateThisYear >= today && birthDateThisYear <= twoWeeksFromNow;
    }

    // Filter pets based on birthdays in the next two weeks
    const upcomingBirthdays = pets.filter(pet => isBirthdayWithinTwoWeeks(pet.birthday));
    const upcomingActiveBirthdays = upcomingBirthdays.filter(pet => pet.status === 'Active');

    // Sort birthdays by month and day, ignoring year
    upcomingActiveBirthdays.sort((a, b) => {
        const dateA = new Date(today.getFullYear(), new Date(a.birthday).getMonth(), new Date(a.birthday).getDate());
        const dateB = new Date(today.getFullYear(), new Date(b.birthday).getMonth(), new Date(b.birthday).getDate());
        return dateA - dateB;
    });


    // If no upcoming birthdays, show a message
    if (upcomingActiveBirthdays.length === 0) {
        upcomingBirthdaysContainer.innerHTML = '<p>No upcoming birthdays in the next two weeks!</p>';
        return;
    }

    // Otherwise, display a table with pet birthdays
    let birthdayTableHTML = `
        <div class="table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Pet Name</th>
                        <th>Description</th>
                        <th>Birthday</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Iterate over the filtered pets to populate the table rows
    upcomingActiveBirthdays.forEach(pet => {
        const nextAge = calculateNextAge(pet.birthday);
        const description = `${pet.name}'s ${nextAge}th birthday`;
        birthdayTableHTML += `
            <tr>
                <td>${pet.name}</td>
                <td>${description}</td>
                <td>${new Date(pet.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
        `;
    });

    birthdayTableHTML += `
                </tbody>
            </table>
        </div>
    `;

    // Insert the generated table into the container
    upcomingBirthdaysContainer.innerHTML = birthdayTableHTML;
}


//5. Populate low supplies section
function renderLowSupplies() {
    const lowSuppliesContainer = document.getElementById('low-supplies');

    // Filter the supplyItems array to get items with quantity < minQuantity
    const lowStockItems = supplyItems.filter(item => item.quantity < item.minQuantity);


    // If no low stock items, display a message
    if (lowStockItems.length === 0) {
        lowSuppliesContainer.innerHTML = '<p>No pet supplies with low stock!</p>';
        return;
    }

    // Otherwise, display a table with the low stock items
    let lowSuppliesTableHTML = `
        <div class="table-wrapper">
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Available Quantity</th>
                        <th>Required Quantity</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Iterate over the filtered items and create table rows
    lowStockItems.forEach(item => {
        lowSuppliesTableHTML += `
            <tr>
                <td>${item.item}</td>
                <td>${item.quantity} ${item.units.toLowerCase()}</td>
                <td>${item.minQuantity} ${item.units.toLowerCase()}</td>
            </tr>
        `;
    });

    lowSuppliesTableHTML += `
                </tbody>
            </table>
        </div>
    `;

    // Insert the table into the container
    lowSuppliesContainer.innerHTML = lowSuppliesTableHTML;
}



// Call the function when the page loads
window.onload = function() {
    renderPets();
    renderAppointments();
    renderUpcomingBirthdays();
    renderLowSupplies();  // Add this line to ensure low supplies are rendered
};



