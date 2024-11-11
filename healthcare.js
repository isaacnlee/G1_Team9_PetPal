import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail ,signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, addDoc, collection, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes, deleteObject, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { db, auth, storage } from './firebaseConfig.js'; //With this line you dont need to initialise app as firebaseConfig.js does it already

// Create an array to store submitted supply items
let petAppointments = window.petAppointments || [];
let pets = window.pets || [];
// let petWeightData = window.petWeightData || [];

let petWeightData = []; // Declare the array globally

//FIREBASE This function is needed to call loadPets()
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadPets();
        loadAppointments();
        loadPetWeightData();
    } else {
        console.log("No user signed in.");
    }
});

// FIREBASE Loading Pets from Firestore into pets array
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

        } catch (error) {
            console.error("Error loading pets: ", error);
        }
    } else {
        console.log("User UID not found.");
    }
};

// FIREBASE Loading appointments from Firestore into petAppointments array
window.loadAppointments = async function loadAppointments() {
    const userUID = window.currentUserUID; // Get the current user's UID

    if (userUID) {
        try {
            // Reference to the 'appointments' collection under the user's document
            const appointmentsCollectionRef = collection(db, 'users', userUID, 'appointments');

            // Get all documents from the appointments collection
            const querySnapshot = await getDocs(appointmentsCollectionRef);

            // Clear the pet Appointments array before adding new data
            petAppointments = [];
            
            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.id = doc.id; // Add document ID to the appointment data
                    petAppointments.push(docData); // Add the appointment data to the appointments array
                    // console.log("Loaded appointment:", docData);
                });
                renderTable() //renderTable() needs to be called here in order for appointment table to be displayed once page is loaded
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


// Function to load petWeight data for a specific user
window.loadPetWeightData = async function loadPetWeightData() {
    const userUID = window.currentUserUID; // Get the current user's UID
    if (userUID) {
        try {
            const petWeightRef = collection(db, 'users', userUID, 'petWeightData');
            const querySnapshot = await getDocs(petWeightRef);
    
            petWeightData = [];
            
            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.id = doc.id; // Add document ID to the appointment data
                    petWeightData.push(docData); // Add the appointment data to the appointments array
                    console.log("Loaded pet weights:", docData);
                });
                
                // // Apply date filter to include the new entry
                // applyDateFilter();
            
                // // Update the weight section (show chart or message)
                // updateWeightSection();
                console.log("Pet weights loaded successfully:", petWeightData);
                // renderChart(petWeightData) 
            } else {
                console.log("No appointments found for this user.");
            }
            initializeWeightChart();

        } catch (error) {
            console.error("Error loading appointments: ", error);
        }

    } else {
        // console.log("User UID not found.");
    }
    
}

// (1) Helper Functions
// Function to update the serial numbers in the table
function updateSerialNumbers() {
    const tableRows = document.querySelectorAll('.custom-table tbody tr');
    tableRows.forEach((row, index) => {
        row.querySelector('td:first-child').textContent = index + 1;
    });
}

// Function to find an appointment by apptID
window.findAppointmentIndexById = async function(apptID) {
    return petAppointments.findIndex(appointment => appointment.apptID === apptID);
}

// Function to format time
function formatTimeToAmPm(time) {
    const [hour, minute] = time.split(':');
    let ampm = 'AM';
    let formattedHour = parseInt(hour);

    if (formattedHour >= 12) {
        ampm = 'PM';
        if (formattedHour > 12) {
            formattedHour -= 12;
        }
    } else if (formattedHour === 0) {
        formattedHour = 12; // Handle midnight as 12 AM
    }

    // Ensure the hour is always 2 digits
    const formattedHourString = formattedHour.toString().padStart(2, '0');

    return `${formattedHourString}:${minute} ${ampm}`;
}

// Function to populate the Pet dropdown with names from the pets array
function populatePetDropdown(dropdownId, selectedPet) {
    const petDropdown = document.getElementById(dropdownId);
    petDropdown.innerHTML = ''; // Clear previous options

    // Add a placeholder option
    const option = document.createElement('option');
    option.value = '';
    option.disabled = true;
    option.selected = true;
    option.hidden = true;
    option.textContent = 'Select a pet';
    petDropdown.appendChild(option);

    //Filter pet array to get Active pets only
    const activePets = pets.filter(pet => pet.status === 'Active');

    // Loop through the pets array and populate dropdown options
    activePets.forEach((pet) => {
        const option = document.createElement('option');
        option.value = pet.name; // Set the value to pet's name
        option.textContent = pet.name; // Display the pet's name in the dropdown
        
        // If the pet matches the selected pet, set it as selected
        if (pet.name === selectedPet) {
            option.selected = true;
        }

        petDropdown.appendChild(option);
    });
}

// Function to format birthday to dd mmm yyyy
function formatBirthday(birthday) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(birthday).toLocaleDateString('en-US', options);
}

// (2) Toggle Appointment View
// Function to add event listeners for toggling details view (in table)
function addDetailsToggleEventListeners() {
    const toggleButtons = document.querySelectorAll('.details-toggle-btn');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const apptID = parseInt(this.getAttribute('data-apptid'));
            const fullDetailsElement = this.closest('td').querySelector('.details-full');
            
            if (fullDetailsElement.style.display === 'none') {
                // Expand to show full details
                fullDetailsElement.style.display = 'inline';
                this.style.display = 'none'; // Hide the `+` button
            } else {
                // Collapse to hide full details
                fullDetailsElement.style.display = 'none';
                this.closest('td').querySelector('.details-toggle-btn').style.display = 'inline'; // Show the `+` button
            }
        });
    });
}

// (3) Appointment List View: Function to render the appointment items in the table
function renderTable() {
    const tableBody = document.querySelector('.custom-table tbody');
    const messageContainer = document.getElementById('message-container');
    const currentDateTime = new Date();

    // Clear previous table rows
    tableBody.innerHTML = '';

    // Filter out appointments based on isHidden property
    const activeAppointments = petAppointments.filter(appointment => appointment.isHidden === "False");

    // Sort the petAppointments array by date and time
    activeAppointments.sort((a, b) => {
        const dateComparison = new Date(a.date) - new Date(b.date);
        if (dateComparison === 0) {
            // If dates are the same, compare the times
            return a.time.localeCompare(b.time);
        }
        return dateComparison;
    });

    if (activeAppointments.length === 0) {
        document.querySelector('.table-container').style.display = 'none';
        messageContainer.style.display = 'inline';
        messageContainer.textContent = "No appointments found. \nClick the button below to add new appointments!";
    } else {
        document.querySelector('.table-container').style.display = 'block';
        messageContainer.style.display = 'none';

        // Iterate through petAppointments and create rows
        activeAppointments.forEach((item, index) => {
            const newRow = document.createElement('tr');
            const appointmentDateTime = new Date(`${item.date}T${item.time}`);

            // Check if the appointment time has passed and is still incomplete
            if (appointmentDateTime < currentDateTime && item.isComplete === "Incomplete") {
                newRow.style.backgroundColor = '#fff7d6'; // Apply background color if conditions are met
            }

            const formattedTime = formatTimeToAmPm(item.time); // Use the helper function here
            const formattedBirthday = formatBirthday(item.date); // Use helper function for date formatting

            // Determine the button text based on whether the appointment date has passed
            const buttonText = appointmentDateTime < currentDateTime ? "Reschedule" : "   Edit   ";

            newRow.innerHTML = `
                <td></td>
                <td>${item.appointmentType}</td>
                <td>${item.pet}</td>
                <td>${formattedBirthday}</td>
                <td>${formattedTime}</td> <!-- Display time in AM/PM format -->
                <td>${item.address}</td>
                <td>
                    <button class="details-toggle-btn" data-apptid="${item.apptID}">+</button>
                    <span class="details-full" style="display:none;">
                        <button class="details-toggle-btn" data-apptid="${item.apptID}">-</button>
                        ${item.details} 
                    </span>
                </td>
                <td>
                    <button class="btn-orange edit-btn" onclick="openEditAppointmentForm('${item.id}')" style="width: 100px;">${buttonText}</button>
                    <button class="btn-delete" onclick="openDeleteConfirmationModal('${item.id}')" style="margin-left: 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(newRow);
            addRowEventListeners(newRow, item.apptID);
        });

        // Add event listeners for toggling details view
        addDetailsToggleEventListeners();
        updateSerialNumbers();
    }
}

// (4) Edit Appointment Modal
// Function to open the "Edit Appointment" modal
window.openEditAppointmentForm = async function openEditAppointmentForm(apptID) {
    // console.log(apptID);
    const index = petAppointments.findIndex(appointment => appointment.id === apptID);
    // console.log(index);
    const appointment = petAppointments[index];
    // console.log(appointment);
    const modal = document.getElementById('edit-appt-modal');
    const form = document.getElementById('edit-item-form');

    // Populate the form with current appointment data
    form['edit-appointmentType'].value = appointment.appointmentType;
    populatePetDropdown('edit-pet', appointment.pet); // Populate pet dropdown

    form['edit-date'].value = appointment.date;
    form['edit-time'].value = appointment.time;
    form['edit-address'].value = appointment.address;
    form['edit-details'].value = appointment.details;

    // Show modal
    modal.style.display = 'flex';

    // Save changes functionality
    form.onsubmit = function(event) {
        event.preventDefault();
        saveAppointmentChanges(apptID);
        closeModal('edit-appt-modal');
    };
}

// FIREBASE Editing Appointment
window.saveAppointmentChanges = async function saveAppointmentChanges(apptID) {
    const form = document.getElementById('edit-item-form');
    const userUID = window.currentUserUID;

    // Variables to identify the appointment document in Firestore and in the local array
    const appointmentId = apptID;
    const appointmentIndex = petAppointments.findIndex(appointment => appointment.id === apptID);

    // Variables needed to update appointment details
    const appointmentType = form['edit-appointmentType'].value
    const petName = form['edit-pet'].value;
    const appointmentDate = form['edit-date'].value;
    const appointmentTime = form['edit-time'].value;
    const appointmentAddress = form['edit-address'].value;
    const appointmentDetails = form['edit-details'].value;

    if (userUID && appointmentType && petName && appointmentDate && appointmentTime && appointmentAddress && appointmentDetails) {
        try {
            // Reference to the specific appointment document in Firestore
            const appointmentDocRef = doc(db, 'users', userUID, 'appointments', appointmentId);

            // Object containing the updated appointment details
            const updatedAppointment = {
                appointmentType: appointmentType,
                pet: petName,
                date: appointmentDate,
                time: appointmentTime,
                address: appointmentAddress,
                details: appointmentDetails,
            };

            // Update the appointment document in Firestore with new data
            await setDoc(appointmentDocRef, updatedAppointment, { merge: true });

            // Immediately update the local array to reflect the changes
            updatedAppointment.id = appointmentId;
            petAppointments[appointmentIndex] = updatedAppointment;
            // console.log(petAppointments);
            // console.log("Updated appointment details: ", petAppointments[appointmentIndex]);
            loadAppointments();

            alert("Appointment details have been edited!");
            
        } catch (error) {
            console.error("Error saving appointment details: ", error);
            alert("Failed to save appointment details.");
        }
    } else {
        alert("Missing user or appointment details.");
    }
};

// (5) Add Appointment Modal
// Function to open the "Add Appointment" modal
function openAddAppointmentModal() {
    populatePetDropdown('pet'); // Populate pet dropdown for add-item-form
    document.getElementById('add-appt-modal').style.display = 'flex';
}

// FIREBASE Adding Appointment
window.addNewAppointment = async function addNewAppointment(event) {
    event.preventDefault();
    console.log("Adding appointment...");
    const form = event.target;
    const userUID = window.currentUserUID; // window.currentUserUID was defined in firebaseConfig.js

    const appointmentType = form['appointmentType'].value;
    const pet = form['pet'].value;
    const date = form['date'].value;
    const time = form['time'].value;
    const address = form['address'].value;
    const details = form['details'].value;

    if (userUID && appointmentType && pet && date && time && address) {
        try {
            // Reference to the 'appointments' subcollection under the user's document
            const appointmentsCollectionRef = collection(db, 'users', userUID, 'appointments');

            // Create an object to add into Firestore
            const newAppointment = {
                appointmentType: appointmentType,
                pet: pet,
                date: date,
                time: time,
                address: address,
                details: details,
                isComplete: "Incomplete",
                isHidden: "False"
            };

            // Add a new document with the appointment details
            const docRef = await addDoc(appointmentsCollectionRef, newAppointment);

            // Set the document ID after it's added to allow for future edits or deletion
            newAppointment.id = docRef.id;

            // Update the displayed list of appointments
            petAppointments.push(newAppointment);
            //Debugging code
            alert("Appointment has been added!");
         
            renderTable();
            createCalendar();

            // Update the visible view based on the current state
            const calendarViewBtn = document.getElementById('calendar-view-btn');
            const tableContainer = document.querySelector('.table-container');
            const calendarContainer = document.querySelector('.calendar-container');

            if (calendarViewBtn.textContent.includes('List View')) {
                tableContainer.style.display = 'none';
                calendarContainer.style.display = 'block';
            } else {
                tableContainer.style.display = 'block';
                calendarContainer.style.display = 'none';
            }
            // Close the add appointment modal and reset the form
            closeModal('add-appt-modal');
            form.reset();
            
        } 
        catch (error) {
            console.error("Error saving appointment details: ", error);
            alert("Failed to save appointment details.");
        }
    } 
    else {
        alert("Missing user or appointment details.");
    }   
}


// (6) Delete Appointment Modal
// Global variable to keep track of the appointment to be deleted
let apptIDToDelete = null;

// Function to open the delete confirmation modal
// function openDeleteConfirmationModal(apptID) {
window.openDeleteConfirmationModal = async function openDeleteConfirmationModal(apptID) {
    apptIDToDelete = apptID; // Store the apptID of the appointment to delete
    const modal = document.getElementById('delete-confirmation-modal');
    modal.style.display = 'flex'; // Show the modal
}

// Function to handle appointment deletion
// function confirmDeleteAppointment() {
window.confirmDeleteAppointment=async function confirmDeleteAppointment() {
    if (apptIDToDelete !== null) {
        // console.log("Confirm delete clicked. apptID:", apptIDToDelete); 
        deleteAppointment(apptIDToDelete); // Call the delete function with the stored apptID
        apptIDToDelete = null; // Reset the apptID after deletion
        closeModal('delete-confirmation-modal'); // Close the modal after deletion
    }
}

// FIREBASE Deleting Appointment
window.deleteAppointment = async function deleteAppointment(apptID) {
    // console.log(apptID);
    const userUID = window.currentUserUID;

    if (userUID) {
        try {
            // Reference to the specific appointment document using the user's UID and appointment ID
            const appointmentDocRef = doc(db, 'users', userUID, 'appointments', apptID);
            
            // Delete the appointment document from Firestore
            await deleteDoc(appointmentDocRef);

            // Remove the appointment from the local array based on the ID
            petAppointments = petAppointments.filter(appointment => appointment.id !== apptID);

            renderTable();
            createCalendar();

            // Update the visible view based on the current state
            const calendarViewBtn = document.getElementById('calendar-view-btn');
            const tableContainer = document.querySelector('.table-container');
            const calendarContainer = document.querySelector('.calendar-container');

            if (calendarViewBtn.textContent.includes('List View')) {
                tableContainer.style.display = 'none';
                calendarContainer.style.display = 'block';
            } else {
                tableContainer.style.display = 'block';
                calendarContainer.style.display = 'none';
            }
            
            alert("Appointment deleted successfully!");
        } catch (error) {
            console.error("Error deleting appointment: ", error);
            alert("Failed to delete appointment.");
        }
    } else {
        console.log("User UID not found.");
    }
};

// Function to add event listeners to a new row (for edit and delete buttons)
function addRowEventListeners(row, apptID) {
    // Edit button functionality
    // row.querySelector('.edit-btn').addEventListener('click', function() {
        
    //     openEditAppointmentForm(apptID);
    // });

    // Delete button functionality
    // row.querySelector('.btn-delete').addEventListener('click', function() {
    //     openDeleteConfirmationModal(apptID); // Open confirmation modal on delete button click
    //     console.log(apptID);
    // });
}

// (7) Modal Helper Functions
// Function to close the modal (make it global if not there might be error accessing the function)
window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none'; // Hide the modal
};

// Event listeners for closing modals, submitting forms, etc.
document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteAppointment);
document.querySelector('.cancel-button').addEventListener('click', function() {
    closeModal('delete-confirmation-modal');
});
document.getElementById('add-appt-btn').addEventListener('click', openAddAppointmentModal);
document.getElementById('cancel-modal').addEventListener('click', function() {
    closeModal('add-appt-modal');
});
document.getElementById('add-item-form').addEventListener('submit', addNewAppointment);
document.getElementById('cancel-edit').addEventListener('click', function() {
    closeModal('edit-appt-modal');
});

// Initial render of the table when the page loads
window.onload = function() {
    renderTable();
};






// CALENDAR VIEW
document.addEventListener("DOMContentLoaded", function () {
    const calendarViewBtn = document.getElementById('calendar-view-btn');
    const tableContainer = document.querySelector('.table-container');
    const calendarContainer = document.querySelector('.calendar-container');
    const modal = document.getElementById('appointment-modal');
    const modalContent = document.getElementById('appointment-modal-content');
    const closeModalBtn = document.getElementById('close-modal');

    // Initially show table-container and hide calendar-container
    calendarContainer.style.display = 'none';
    tableContainer.style.display = 'block';

    // Function to toggle views
    calendarViewBtn.addEventListener('click', function () {
        // table shown, petAppointments not empty
        // show calender, hide table
        if (calendarContainer.style.display === 'none' && petAppointments.length !== 0) {
            tableContainer.style.display = 'none';
            calendarContainer.style.display = 'block';
            calendarViewBtn.innerHTML = '<i class="fa-solid fa-list"></i> List View';
            createCalendar(); // Create calendar when calendar view is shown
        } 
        // calender shown, petAppointments not empty
        // show table, hide calender
        else if (tableContainer.style.display === 'none' && petAppointments.length !== 0) {
            tableContainer.style.display = 'block';
            calendarContainer.style.display = 'none';
            calendarViewBtn.innerHTML = '<i class="fa-solid fa-calendar-days"></i> Calendar View';
            renderTable()
        }
        else if (calendarContainer.style.display === 'none' && petAppointments.length === 0 && calendarViewBtn.textContent === 'Calendar View') {
            tableContainer.style.display = 'none';
            calendarContainer.style.display = 'none';
            calendarViewBtn.innerHTML = '<i class="fa-solid fa-list"></i> List View';
        }
        else if (tableContainer.style.display === 'none' && petAppointments.length === 0 && calendarViewBtn.textContent === 'List View'){
            tableContainer.style.display = 'none';
            calendarContainer.style.display = 'none';
            calendarViewBtn.innerHTML = '<i class="fa-solid fa-calendar-days"></i> Calendar View';
        }
    });

    // Close modal event listener
    closeModalBtn.addEventListener('click', function () {
        modal.style.display = 'none';
    });

});


// Function to create the calendar
function createCalendar() {
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    // Render the initial calendar view
    renderCalendar(currentMonth, currentYear);

    // Event listeners for month navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        if (currentMonth === 0) {
            currentMonth = 11;
            currentYear--;
        } else {
            currentMonth--;
        }
        renderCalendar(currentMonth, currentYear);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        if (currentMonth === 11) {
            currentMonth = 0;
            currentYear++;
        } else {
            currentMonth++;
        }
        renderCalendar(currentMonth, currentYear);
    });
}

// Function to render the calendar for a specific month and year
function renderCalendar(month, year) {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthYearDisplay = document.getElementById('month-year');
    const calendarDays = document.getElementById('calendar-days');
    const calendarDates = document.getElementById('calendar-dates');

    // Clear any previous calendar content
    calendarDays.innerHTML = '';
    calendarDates.innerHTML = '';

    // Render days of the week
    daysOfWeek.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.innerText = day;
        calendarDays.appendChild(dayElement);
    });

    // Set the month and year header
    monthYearDisplay.innerText = `${monthNames[month]} ${year}`;

    // Get first and last day of the month
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Fill in empty spaces for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDate = document.createElement('div');
        calendarDates.appendChild(emptyDate);
    }

    // Fill in the dates of the current month
    for (let date = 1; date <= lastDate; date++) {
        const dateElement = document.createElement('div');
        dateElement.classList.add('calendar-date');
        dateElement.innerText = date;

        const selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

        // Check if today and add circle styling
        if (year === new Date().getFullYear() && month === new Date().getMonth() && date === new Date().getDate()) {
            const starIcon = document.createElement('i');
            starIcon.classList.add('fa', 'fa-star');
            dateElement.appendChild(starIcon);
        }

        // Check if there's an appointment on this date
        const appointmentsOnDate = petAppointments.filter(appointment => appointment.date === selectedDate);
        const activeAppointmentsOnDate = appointmentsOnDate.filter(appointment => appointment.isHidden === "False");

        if (activeAppointmentsOnDate.length > 0) {
            // Add a Font Awesome star icon for dates with appointments
            

            addAppointmentHoverEffect(dateElement); // Add hover effect on dates with appointments
            // Event listener for clicking on a date with appointments
            dateElement.addEventListener('click', function () {
                showModal(activeAppointmentsOnDate, selectedDate);
            });
        } else {
            dateElement.addEventListener('click', function () {
                showModal([], selectedDate);
            });
        }

        calendarDates.appendChild(dateElement);
    }
}



// Function to add hover effect for dates with appointments
function addAppointmentHoverEffect(dateElement) {
    dateElement.style.backgroundColor = '#cfeaeb'; // Default color for dates with appointments

    // Change color on hover
    dateElement.addEventListener('mouseenter', function() {
        dateElement.style.backgroundColor = '#2C3E50';
    });

    dateElement.addEventListener('mouseleave', function() {
        dateElement.style.backgroundColor = '#cfeaeb'; // Reset color to default
    });
}

// Function to show modal with appointment details or a "no appointments" message
function showModal(appointments, selectedDate) {
    const modal = document.getElementById('appointment-modal');
    const modalHeader = document.getElementById('appointment-modal-header');
    const modalContent = document.getElementById('appointment-modal-content');

    modal.style.display = 'flex'; // Show modal
    modalContent.innerHTML = ''; // Clear previous modal content

    // Format the selected date as "Oct 22, 2024"
    const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Update the h2 with appointment count or no appointments message
    modalHeader.innerText = appointments.length > 0
        ? `There are ${appointments.length} appointment(s) on \n${formattedSelectedDate}`
        : `No appointments on ${formattedSelectedDate}`;

    // If there are appointments, display them
    if (appointments.length > 0) {
        const textDiv = document.createElement('div');
        textDiv.style.backgroundColor = "#cfeaeb";
        textDiv.style.padding = "10px";
        textDiv.style.borderRadius = "10px";
        appointments.forEach((appointment, index) => {
            // Format the date as "Oct 22, 2024"
            const formattedDate = new Date(appointment.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Format the time using formatTimeToAmPm function
            const formattedTime = formatTimeToAmPm(appointment.time);

            const p = document.createElement('p');
            p.innerHTML = `
                <div style="margin-bottom: 10px; text-align: left; padding-left:10px;">
                    <strong>Appointment ${index + 1}</strong>
                </div>
                <div style="padding-left:10px; text-align: left;">
                    <ul>
                        <li>Appointment Type: ${appointment.appointmentType}</li>
                        <li>Pet: ${appointment.pet}</li>
                        <li>Date: ${formattedDate}</li>
                        <li>Time: ${formattedTime}</li>
                        <li>Address: ${appointment.address}</li>
                        <li>Details: ${appointment.details}</li>
                    </ul>
                </div>
            `;
            textDiv.appendChild(p);
        });
        modalContent.appendChild(textDiv); // Append the list of appointments to the modal content
    }
}


// Event listener for closing the modal
document.getElementById('close-modal').addEventListener('click', function () {
    document.getElementById('appointment-modal').style.display = 'none';
});

// WEIGHT TRACKER SECTION

// (1) Check if petWeightData is empty
// Function to update the chart or display the message based on the petWeightData array
// function updateWeightSection(filteredData) {
 window.updateWeightSection = async function updateWeightSection(filteredData) {
    const weightMessageContainer = document.getElementById('weight-message-container');
    const weightFilterMessageContainer = document.getElementById('weight-filter-message-container');
    const weightChartContainer = document.getElementById('weight-chart');

    // Check if there is any data available in the filteredData array
    if (petWeightData.length === 0) {
        // No data recorded yet
        weightMessageContainer.style.display = 'block';
        weightFilterMessageContainer.style.display = 'none';
        weightChartContainer.style.display = 'none';
    } else if (filteredData.length === 0) {
        // No data found in the current date range
        weightMessageContainer.style.display = 'none';
        weightFilterMessageContainer.style.display = 'block';
        weightChartContainer.style.display = 'none';
    } else {
        // Data is available, hide messages and show the chart
        weightMessageContainer.style.display = 'none';
        weightFilterMessageContainer.style.display = 'none';
        weightChartContainer.style.display = 'block';
        updateChart(datasets, uniqueMonthYears); // Render the chart with updated data
    }
}


// (2) Date Filter
// Function to get default start and end dates (last 3 months)
function getDefaultDateRange(data) {
    console.log(data);
    const mostRecentDate = new Date(Math.max(...data.map(entry => new Date(entry.Date))));
    const threeMonthsAgo = new Date(mostRecentDate);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    // console.log(mostRecentDate);
    // console.log(threeMonthsAgo);

    return {
        startDate: threeMonthsAgo.toISOString().split('T')[0],
        endDate: mostRecentDate.toISOString().split('T')[0]
    };
}

// Function to filter data based on date range
function filterDataByDateRange(data, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return data.filter(entry => {
        const entryDate = new Date(entry.Date);
        return entryDate >= start && entryDate <= end;
    });
}

// Helper function to group weight data by pet and by month-year
// Helper function to group weight data by pet and by month-year and calculate average
// Helper function to group weight data by pet and by month-year and calculate average
function groupDataByPetAndMonth(data) {
    const grouped = {};

    // Iterate through each entry in the weight data
    data.forEach(entry => {
        const pet = entry.Pet;
        const dateObj = new Date(entry.Date);
        const monthYear = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }); // Format as MMM YYYY

        // Initialize the pet object if it doesn't exist in the grouped object
        if (!grouped[pet]) {
            grouped[pet] = {};
        }

        // Initialize the monthYear object if it doesn't exist within the pet object
        if (!grouped[pet][monthYear]) {
            grouped[pet][monthYear] = {
                weights: [],  // Store all weights for this pet in this month-year
                dates: []     // Store all dates corresponding to the weights
            };
        }

        // Add the current weight and date to the respective monthYear
        grouped[pet][monthYear].weights.push(entry['Weight (in kg)']);
        grouped[pet][monthYear].dates.push(entry.Date);
    });

    // Calculate average weight for each month-year combination
    Object.keys(grouped).forEach(pet => {
        Object.keys(grouped[pet]).forEach(monthYear => {
            const weightArray = grouped[pet][monthYear].weights;
            const averageWeight = weightArray.reduce((sum, weight) => sum + weight, 0) / weightArray.length;
            grouped[pet][monthYear].averageWeight = parseFloat(averageWeight.toFixed(2)); // Store the average with two decimal precision
        });
    });
    
    
    return grouped;
}

// (3) Generate weight chart
// Function to get all unique month-year combinations across all pets
function getUniqueMonthYears(data) {
    return [...new Set(data.map(entry => {
        const dateObj = new Date(entry.Date);
        return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }))].sort((a, b) => new Date(a) - new Date(b));
}

// Generate datasets dynamically for each pet
function generateDatasets(groupedData, uniqueMonthYears) {
    const colors = [
        'rgba(84, 185, 190, 1)',  // #54B9BE
        'rgba(255, 140, 66, 1)',  // #FF8C42
        'rgba(44, 62, 80, 1)',     // #6C9A9C
        'rgb(255, 197, 51)',       // #star color
        'rgba(255, 107, 107, 1)',  // bright coral
        'rgba(164, 62, 62, 1)',    // #7C8586
        'rgba(128, 128, 128, 1)'   // #808080
    ];

    let colorIndex = 0;

    return Object.keys(groupedData).map(pet => {
        const petData = groupedData[pet];
        const weights = uniqueMonthYears.map(monthYear => petData[monthYear] ? petData[monthYear].averageWeight : null); // Fill missing month-years with null

        const dataset = {
            label: pet,
            data: weights,
            borderColor: colors[colorIndex % colors.length],
            borderWidth: 2,
            fill: false,
            specificDetails: uniqueMonthYears.map(monthYear => petData[monthYear] ? petData[monthYear] : { weights: [], dates: [] }) // Store the weights and dates for tooltips
        };
        colorIndex++;
        return dataset;
    });
}

// Function to update the chart with new data
function updateChart(newDatasets, newLabels) {
    if(!weightChart){
        createWeightChart(newDatasets, newLabels);
    }
    else{
    weightChart.data.labels = newLabels; // Update X-axis labels
    weightChart.data.datasets = newDatasets; // Update the datasets
    weightChart.update(); // Re-render the chart with new data
    }
}

// Apply date filtering and update the chart
function applyDateFilter() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    // Filter petWeightData based on date range
    const filteredData = filterDataByDateRange(petWeightData, start, end);
    console.log("Filtered Data:", filteredData); // Debugging

    // Update uniqueMonthYears, groupedData, and datasets based on filtered data
    const uniqueMonthYears = getUniqueMonthYears(filteredData);
    const groupedData = groupDataByPetAndMonth(filteredData);
    const datasets = generateDatasets(groupedData, uniqueMonthYears);

    console.log("Grouped Data:", groupedData); // Debugging
    console.log("Unique Month-Years:", uniqueMonthYears); // Debugging
    console.log("Datasets:", datasets); // Debugging

    // Update the chart with the new data
    updateChart(datasets, uniqueMonthYears);
}

// Event listener for "Apply" button
document.getElementById('apply-date-filter').addEventListener('click', applyDateFilter);

// Event listener for "Reset" button
document.getElementById('reset-date-filter').addEventListener('click', function() {
    // Reset start and end date to the default 3-month range
    const { startDate, endDate } = getDefaultDateRange(petWeightData);
    document.getElementById('start-date').value = startDate;
    document.getElementById('end-date').value = endDate;

    // Apply date filter with the default range
    applyDateFilter();
});

window.initializeWeightChart = async function initializeWeightChart() {
    try {
   

        // Check if petWeightData is populated
        if (!petWeightData || petWeightData.length === 0) {
            console.log("No pet weight data available.");
            updateWeightSection([]); // Update UI to show no data message
            return;
        }

        // Initialize default date range
        const { startDate, endDate } = getDefaultDateRange(petWeightData);
        document.getElementById('start-date').value = startDate;
        document.getElementById('end-date').value = endDate;

        // Group initial data and filter it based on the default date range
        const filteredData = filterDataByDateRange(petWeightData, startDate, endDate);
        const groupedData = groupDataByPetAndMonth(filteredData);
        const uniqueMonthYears = getUniqueMonthYears(filteredData);
        const datasets = generateDatasets(groupedData, uniqueMonthYears);

        // Create and update the chart here after datasets are populated
        createWeightChart(datasets, uniqueMonthYears);

        // Update the UI as needed
        updateWeightSection(filteredData); // You may want to display the filtered data as well
    } catch (error) {
        console.error("Error initializing weight chart:", error);
        updateWeightSection([]); // Update UI to show error message
    }
}
let weightChart;
// Function to create the chart using Chart.js
function createWeightChart(datasets, uniqueMonthYears) {
    const ctx = document.getElementById('weight-chart').getContext('2d');
    if (weightChart) {
        weightChart.destroy(); // Destroy previous chart instance if it exists
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: uniqueMonthYears, // Use the formatted month-year for the X-axis
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,  // This allows the chart to adjust its height when resizing
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,  // This makes the legend use a line or point instead of a filled box
                        pointStyle: 'line',   // Set the style of the legend to a line
                        boxWidth: 50,         // Adjust the width of the line in the legend
                        padding: 20,          // Space around the legend items
                    },
                },
                tooltip: {
                    callbacks: {
                        // Customize the tooltip header (title)
                        title: function(tooltipItems) {
                            const tooltipItem = tooltipItems[0]; // We only need the first item
                            const dataset = tooltipItem.dataset;
                            const details = dataset.specificDetails[tooltipItem.dataIndex];

                            if (details && details.dates.length > 0) {
                                return `Weights in ${tooltipItem.label}`;
                            }
                            return tooltipItem.label;
                        },
                        // Customize the tooltip label to show all weights and their dates
                        label: function(context) {
                            const dataset = context.dataset;
                            const details = dataset.specificDetails[context.dataIndex];

                            if (details && details.dates.length > 0) {
                                return details.dates.map((date, index) => {
                                    const weight = details.weights[index];
                                    const formattedDate = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                    return `${formattedDate}: ${weight} kg`;
                                });
                            }
                            return `${dataset.label}: ${context.parsed.y} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Month-Year'
                    },
                    grid: {
                        display: false // Remove x-axis gridlines
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Weight (in kg)'
                    },
                    grid: {
                        display: false // Remove y-axis gridlines
                    }
                }
            }
        }
    });
}

// Call the initialization function when the DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    await loadPetWeightData(); // Ensure data is loaded first
    initializeWeightChart();    // Then initialize and render the chart
});

// ADD WEIGHT FOR SAME DAY
// Function to check if an entry exists for the same pet and date
function findExistingEntry(pet, date) {
    return petWeightData.find(entry => entry.Pet === pet && entry.Date === date);
}

// WEIGHT FORM
document.addEventListener("DOMContentLoaded", function () {
    const addWeightBtn = document.getElementById("add-weight-btn");
    const modal = document.getElementById("add-weight-modal");
    const cancelBtn = document.getElementById("cancel-weight-modal");
    const addItemForm = document.getElementById("add-weight-form");
    const confirmationModal = document.getElementById("confirmation-modal");
    const confirmationMessage = document.getElementById("confirmation-message");
    const proceedBtn = document.getElementById("proceed-btn");
    const cancelConfirmationBtn = document.getElementById("cancel-confirmation-btn");

    let pendingEntry = null; // Store the entry to be added/updated if user confirms

    // Show the modal when 'Add New Pet Weight' button is clicked
    addWeightBtn.addEventListener("click", function () {
        modal.style.display = "flex"; // Open the modal
        populatePetDropdown('weight_pet', window.pets); // Populate the pet dropdown
    });

    // Close the modal when 'Cancel' button is clicked
    cancelBtn.addEventListener("click", function () {
        modal.style.display = "none"; // Close the modal
    });

    // Handle form submission to add new weight data
    addItemForm.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevent form from refreshing the page

        // Get values from the form
        const pet = document.getElementById("weight_pet").value;
        const date = document.getElementById("weight_date").value;
        const weight = parseFloat(document.getElementById("new_weight").value);

        // Check if an entry for the same pet and date already exists
        const existingEntry = findExistingEntry(pet, date);

        if (existingEntry) {
            pendingEntry = { ...existingEntry, 'Weight (in kg)': weight }; // Prepare to update
        } else {
            pendingEntry = { Pet: pet, Date: date, 'Weight (in kg)': weight }; // Prepare to add new entry
        }

        // Show confirmation modal
        confirmationMessage.textContent = `Are you sure you want to ${existingEntry ? 'update' : 'add'} the weight for ${pet} on ${date} to ${weight} kg?`;
        confirmationModal.style.display = "flex"; // Show confirmation modal
    });

    // Proceed to add or update weight entry
    proceedBtn.addEventListener("click", function () {
        addOrUpdateWeightEntry(pendingEntry);
        modal.style.display = "none"; // Close the modal
        confirmationModal.style.display = "none"; // Close the confirmation modal
        pendingEntry = null; // Clear pending entry
    });

    // Cancel the confirmation and close the modal
    cancelConfirmationBtn.addEventListener("click", function () {
        confirmationModal.style.display = "none"; // Close the confirmation modal
        pendingEntry = null; // Clear pending entry
    });
});

// Function to add or update weight entries
// function addOrUpdateWeightEntry(entry) {
//     const index = petWeightData.findIndex(e => e.Pet === entry.Pet && e.Date === entry.Date);
//     if (index > -1) {
//         // Update existing entry
//         petWeightData[index]['Weight (in kg)'] = entry['Weight (in kg)'];
//     } else {
//         // Add new entry
//         petWeightData.push(entry);
//     }

//     applyDateFilter(); // Refresh the chart and data view
// }
// Function to add or update weight entry
async function addOrUpdateWeightEntry(entry) {
    const currentUserId = auth.currentUser.uid;
    const { Pet, Date, 'Weight (in kg)': weight } = entry;
    const weightsRef = collection(db, 'users', currentUserId, "petWeightData"); // Reference to the 'weights' collection

    try {
        // Query Firestore to see if the weight entry already exists
        const q = query(weightsRef, where("Pet", "==", Pet), where("Date", "==", Date));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // If entry exists, update it
            const docId = querySnapshot.docs[0].id;
            const weightDocRef = doc(db, "users", currentUserId, "petWeightData", docId);
            await updateDoc(weightDocRef, { 'Weight (in kg)': weight });
            console.log("Weight entry updated successfully.");
            updateChart()
        } else {
            // If entry doesn't exist, add it
            await addDoc(weightsRef, { Pet, Date, 'Weight (in kg)': weight });
            console.log("Weight entry added successfully.");
        }
    } catch (error) {
        console.error("Error adding/updating weight entry:", error);
    }
}

