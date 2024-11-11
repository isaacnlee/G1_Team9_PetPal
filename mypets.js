import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail ,signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, addDoc, collection, deleteDoc, updateDoc, query, where} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes, deleteObject, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { db, auth, storage } from './firebaseConfig.js'; //With this line you dont need to initialise app as firebaseConfig.js does it already

let pets = window.pets || [];
// let pets = JSON.parse(sessionStorage.getItem("pets")) || [];

//This function is needed to call loadPets()
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Call loadPets() to load pets from Firestore
        loadPets();
        
    } else {
        console.log("No user signed in.");
    }
});

// (1) Functions to update the message-containers
function updateActiveMessageContainer() {
    const messageContainer = document.getElementById('message-container-active-pets');
    const activePets = pets.filter(pet => pet.status === 'Active');

    if (activePets.length === 0) {
        messageContainer.style.display = 'block';
        messageContainer.textContent = "No active pets found! Please click the button below to add new pets.";
    } else {
        messageContainer.style.display = 'none';
    }
}

function updateArchivedMessageContainer() {
    const messageContainer = document.getElementById('message-container-archived-pets');
    const archivedPets = pets.filter(pet => pet.status === 'Archived');

    if (archivedPets.length === 0) {
        messageContainer.style.display = 'block';
        messageContainer.textContent = "No archived pets found!";
    } else {
        messageContainer.style.display = 'none';
    }
}

// (2) Helper functions
// Function to calculate age based on birthday in years and months
function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();

    // Calculate the full years difference
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    // Adjust if the birthday hasn't occurred yet this year
    if (months < 0) {
        years--;
        months += 12;
    }

    // Adjust if it's currently the birthday month but the day hasn't arrived yet
    if (months === 0 && today.getDate() < birthDate.getDate()) {
        years--;
        months = 11;
    }

    // If age is less than one month
    if (years === 0 && months === 0) {
        return "Less than a month";
    }

    return `${years > 0 ? years + " years " : ""}${months} months`;
}


// Function to format birthday to dd mmm yyyy
function formatBirthday(birthday) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(birthday).toLocaleDateString('en-US', options);
}

// Function to calculate age based on birthday in years only
function calculateAgeInYears(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthsDifference = today.getMonth() - birthDate.getMonth();

    if (monthsDifference < 0 || (monthsDifference === 0 && today.getDate() < birthDate.getDate())) {
        years--;
    }

    return years;
}

// Function to adjust layout based on item count
function adjustRowLayout(container, itemCount) {
    if (itemCount === 1) {
        container.style.justifyContent = 'center'; // Center a single image
    } else if (itemCount === 2) {
        container.style.justifyContent = 'space-around'; // Evenly space two images
    } else {
        container.style.justifyContent = 'flex-start'; // Default for 3 or more images
    }
}

// (3) Active Pets section
// Function to display pets and update age property
function displayPets() {
    const petsRow = document.getElementById('pets-row');
    petsRow.innerHTML = ''; // Clear existing pets

    // Filter pets to include only those with 'Active' status
    const activePets = pets.filter(pet => pet.status === 'Active');
    activePets.sort((a, b) => new Date(b.birthday) - new Date(a.birthday)); // Sort by birthday

    activePets.forEach((pet) => {
        // Add or update the age property in years
        pet.age = calculateAge(pet.birthday);

        const petCard = document.createElement('div');
        petCard.classList.add('col-lg-4', 'col-md-6', 'col-sm-12', 'd-flex', 'justify-content-center', 'mb-4');

        petCard.innerHTML = `
        <div class="card">
            <img src="${pet.image}" class="card-img-top" alt="${pet.name}">
            <div class="card-body">
                <h5 class="card-title">${pet.name}</h5>
                <p class="card-text">Species: ${pet.species}</p>
                <p class="card-text">Breed: ${pet.breed || 'N/A'}</p>
                <p class="card-text">Gender: ${pet.gender}</p>
                <p class="card-text">Birthday: ${formatBirthday(pet.birthday)}</p>
                <p class="card-text">Age: ${pet.age}</p>
            </div>
            <div class="d-flex justify-content-center" style="gap:10px; padding-bottom: 30px;">
                <button class="btn-orange" onclick="openEditPetForm('${pet.id}')">Edit</button>
                <button class="btn-delete" onclick="confirmDeletePet('${pet.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;

    petsRow.appendChild(petCard);
});

    adjustRowLayout(petsRow, activePets.length);
}

// Function to find a pet by ID
function findPetByID(id) {
    // console.log(id);
    return pets.find(pet => pet.id === id);

}

//FIREBASE Load Pets from Firestore into array pets
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

            // Call displayPets() and displayArchivedPets() after loading the pets from firestore
            displayPets();
            displayArchivedPets();
            updateActiveMessageContainer();
            //The below two lines are to fix a bug where messageContainer is displayed when page
            //is first loaded even though view archived pets button has not been clicked yet
            const messageContainer = document.getElementById('message-container-archived-pets');
            messageContainer.style.display = 'none';
            // updateArchivedMessageContainer();

        } catch (error) {
            console.error("Error loading pets: ", error);
        }
    } else {
        console.log("User UID not found.");
    }
};

//FIREBASE Add Pet to Firebase Firestore
window.addPet = async function addPet(event) {
    event.preventDefault();
    // console.log("Adding pet...");
    const form = event.target;
    const userUID = window.currentUserUID; // window.currentUserUID was defined in firebaseConfig.js

    const petName = form['pet-name'].value;
    const petSpecies = form['species'].value;
    const petGender = form['gender'].value;
    const petBreed = form['breed'].value;
    const petBirthday = form['birthday'].value;
    const petImageFile = form['profile-image'].files[0];
    const status = form['status'].value;
    const timestamp = new Date();

    // console.log("Form Values:", { petName, petSpecies, petGender, petBreed, petBirthday, petImage, petAge, userUID });

    if (userUID && petName && petSpecies && petGender && petBreed && petBirthday && petImageFile && status) {
        try {
            // Reference to the 'pets' subcollection under the user's document
            const petsCollectionRef = collection(db, 'users', userUID, 'pets');
            //The generation of a random 7-letter string for the path name is to eliminate an error generated when user
            // uses the same image for two different pets. Firebase doesnt duplicate the image when the same image is uploaded twice,
            // hence an error would be generated when the image gets deleted and the second pet
            // with the same image does not have a valid Firebase downloadURL as a result
            const storageRef = ref(storage, `${userUID}/pets/${petImageFile.name}_${Math.random().toString(36).slice(2, 9)}`);

            //Uploading image to Firebase Storage and getting Firebase image link
            await uploadBytes(storageRef, petImageFile);
            const downloadURL = await getDownloadURL(storageRef);
           
            //Create an object to add into Firestore
            const newPet = {
                name: petName,
                species: petSpecies,
                breed: petBreed,
                gender: petGender,
                birthday: petBirthday,
                image: downloadURL,
                status: status,
                timestamp: timestamp
            };
            // Add a new document with the pet's details
            const docRef = await addDoc(petsCollectionRef, newPet);

            //The below 4 lines are to allow the newly added pet
            // to be displayed immediately instead of having to refresh the page to see it
            // Duplicates are avoided upon refresh as loadPets() clear pets array before pulling firebase data
             
            newPet.id = docRef.id; // Get the document ID from Firestore and set the ID after it's added (important as pet.id is needed to perform edits and deletion)
            pets.push(newPet);
            displayPets();
            displayArchivedPets();
            updateActiveMessageContainer();

            alert("Pet details saved successfully!");
            closeModal('add-pet-modal');
            form.reset();
            
        } 
        catch (error) {
            console.error("Error saving pet details: ", error);
            alert("Failed to save pet details.");
        }
        } 
        else {
            alert("Missing user or pet details.");
        }   
}

// Function to open delete confirmation modal
window.confirmDeletePet = async function confirmDeletePet(id) {
    // Store the id in a data attribute to use it when confirming the delete
    const confirmDeleteButton = document.getElementById('confirm-delete-btn');
    confirmDeleteButton.setAttribute('data-pet-id', id);

    // Show the confirmation modal
    document.getElementById('delete-confirmation-modal').style.display = 'flex';
}

// Event listener for the confirm delete button
document.getElementById('confirm-delete-btn').addEventListener('click', function() {
    let id = this.getAttribute('data-pet-id');
    //const id = parseInt(this.getAttribute('data-pet-id'), 10);
    deletePet(id);
    closeModal('delete-confirmation-modal');
    
});

//FIREBASE Delete Pet from Firebase Firestore
window.deletePet = async function deletePet(petId) {
    const userUID = window.currentUserUID;

    if (userUID) {
        try {
            // Deleting pet image in firebase storage
            const petToDelete = pets.find(pet => pet.id === petId);
            const imageURL = petToDelete.image;
            const storageRef = ref(storage, imageURL);
            await deleteObject(storageRef);
            
            // Reference to the specific pet document using the user's UID and pet ID
            const petDocRef = doc(db, 'users', userUID, 'pets', petId);
            
            // Delete the pet document from Firestore
            await deleteDoc(petDocRef);

            // Remove the pet from the local array based on the ID
            pets = pets.filter(pet => pet.id !== petId);
            
            // Refresh the display
            displayPets();
            updateActiveMessageContainer();
            
            alert("Pet deleted successfully!");
        } catch (error) {
            console.error("Error deleting pet: ", error);
            alert("Failed to delete pet.");
        }
    } else {
        console.log("User UID not found.");
    }
};

// Function to open edit modal and populate form with selected pet's details
window.openEditPetForm = function(id) {
    const selectedPet = findPetByID(id);

    // If no pet is found, log an error and return
    if (!selectedPet) {
        console.error(`No pet found with ID: ${id}`);
        return;
    }

    // Set form field values to the selected pet's properties
    document.getElementById('pet-document-id').value = selectedPet.id; //Allow saveChanges() to obtain pet document id to update firestore
    document.getElementById('edit-index').value = id; // Assign the actual pet ID as a string
    document.getElementById('edit-pet-name').value = selectedPet.name;
    document.getElementById('edit-species').value = selectedPet.species;
    document.getElementById('edit-breed').value = selectedPet.breed || ''; // Handle case where breed might be undefined
    document.getElementById('edit-gender').value = selectedPet.gender;
    document.getElementById('edit-birthday').value = selectedPet.birthday;
    document.getElementById('status').value = selectedPet.status;
    // debug

    // Check if the image exists and update the preview (optional)
    const imagePreview = document.getElementById('edit-profile-image-preview');
    if (imagePreview) {
        imagePreview.src = selectedPet.image;
    }

    // Show the edit modal
    document.getElementById('edit-pet-modal').style.display = 'flex';
    // console.log(document.getElementById('edit-index').value);
}


// FIREBASE Allow user to save edited pet details into firestore
window.saveChanges = async function saveChanges(event) {
    event.preventDefault();
    const form = event.target;
    const userUID = window.currentUserUID;
    let oldDownloadURL = '';

    //Variables needed to access firebase document and pets array object
    const petId = form['pet-document-id'].value;
    // Find the index of the pet with the matching id
    const petIndex = pets.findIndex(pet => pet.id === petId);
    
    // If petIndex is -1, the pet is not found
    if (petIndex === -1) {
        console.error(`Pet with id ${petId} not found in the pets array`);
        alert("Pet not found.");
        return;
    }
    // console.log(petIndex);

    // Get the old status before updating the pet details
    const oldStatus = pets[petIndex].status;
    // console.log(oldStatus);

    //Variables needed to update
    const petName = form['pet-name'].value;
    const petSpecies = form['species'].value;
    const petGender = form['gender'].value;
    const petBreed = form['breed'].value;
    const petBirthday = form['birthday'].value;
    const status = form['status'].value
    const petImageFile = form['profile-image'].files[0];

    if (userUID && petName && petSpecies && petGender && petBreed && petBirthday) {
        try {
            const petDocRef = doc(db, 'users', userUID, 'pets', petId);
            
            //Create an object to add into Firestore
            const updatedPet = {
                name: petName,
                species: petSpecies,
                breed: petBreed,
                gender: petGender,
                birthday: petBirthday,
                status: status,
            };

            //
           if (petImageFile && petImageFile.size > 0) {
                //upload new pet image and update image link in Firestore document
                const storageRef = ref(storage, `${userUID}/pets/${petImageFile.name}_${Math.random().toString(36).slice(2, 9)}`);
                await uploadBytes(storageRef, petImageFile);
                const downloadURL = await getDownloadURL(storageRef);   
                updatedPet.image = downloadURL;

                //capture old image download URL
                oldDownloadURL = pets[petIndex].image;

           } 
           else {
                // No new image uploaded, retain the existing image URL
                updatedPet.image = pets[petIndex].image;
            }
            //merge: true will ensure untouched fields in the document still remain
            // console.log(updatedPet);
            await setDoc(petDocRef, updatedPet, { merge: true });

            //Delete old pet image
            if (oldDownloadURL !== '') {
                const oldImageStorageRef = ref(storage, oldDownloadURL);
                await deleteObject(oldImageStorageRef);
            }
            
            updatedPet.id = petId;
            pets[petIndex] = updatedPet;
            // console.log("Updated pet details: "+pets[petIndex]);

            displayPets();
            displayArchivedPets();
            updateActiveMessageContainer();
            updateArchivedMessageContainer()

            // // Update related appointments if the pet is archived or activated
            // if (updatedPet.status === "Archived" && oldStatus !== "Archived") {
            //     petAppointments.forEach(appointment => {
            //         if (appointment.pet === updatedPet.name) {
            //             appointment.isHidden = "True";
            //         }
            //     });
            // } else if (updatedPet.status === "Active" && oldStatus === "Archived") {
            //     petAppointments.forEach(appointment => {
            //         if (appointment.pet === updatedPet.name) {
            //             appointment.isHidden = "False";
            //         }
            //     });
            // }

            // Update related appointments if the pet's status is changed
            if (status !== oldStatus) {
                const appointmentsRef = collection(db, 'users', userUID, 'appointments');
                const appointmentsQuery = query(appointmentsRef, where("pet", "==", petName));
                const appointmentsSnapshot = await getDocs(appointmentsQuery);

                // Update each appointment document where pet matches updated pet's name
                const isHiddenValue = status === "Archived" ? "True" : "False";
                appointmentsSnapshot.forEach(async (appointmentDoc) => {
                    const appointmentRef = doc(db, 'users', userUID, 'appointments', appointmentDoc.id);
                    await updateDoc(appointmentRef, { isHidden: isHiddenValue });
                });
            }

            alert("Pet details have been edited!");
            closeModal('edit-pet-modal');
            form.reset();
            
        } 
        catch (error) {
            console.error("Error saving pet details: ", error);
            alert("Failed to save pet details.");
        }
        } 
        else {
            alert("Missing user or pet details.");
        } 
};


// Function to open modal
window.openAddPetForm = function() {
    document.getElementById('add-pet-modal').style.display = 'flex'; // Set modal display to flex
};

// Function to close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none'; // Hide the modal
};

// Initial display
displayPets();

// Call this function when the page loads or when the pets array is updated
window.onload = function() {
    updateActiveMessageContainer();
};

// (5) Archived Pets Section
// Function to toggle the visibility of archived pets
window.onload = function() {
    document.getElementById('message-container-archived-pets').style.display = 'none';
    document.getElementById('archived-pets-row').style.display = 'none';
};

window.toggleArchivedPets = async function toggleArchivedPets() {
    const archivedRow = document.getElementById('archived-pets-row');
    const toggleButton = document.getElementById('toggle-archived-btn');
    const messageContainer = document.getElementById('message-container-archived-pets');

    // Filter pets to include only those with 'Archived' status
    const archivedPets = pets.filter(pet => pet.status === 'Archived');

    if (archivedRow.style.display === 'none') {
        if (archivedPets.length === 0) {
            messageContainer.style.display = 'block';
            messageContainer.textContent = "No archived pets found!";
        } else {
            messageContainer.style.display = 'none';
            displayArchivedPets();
        }
        archivedRow.style.display = 'flex';
        toggleButton.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Archived Pets';
    } else {
        archivedRow.style.display = 'none';
        toggleButton.innerHTML = '<i class="fa-solid fa-eye"></i> View Archived Pets';
        messageContainer.style.display = 'none';
    }
}

// Function to display archived pets
function displayArchivedPets() {
    const archivedRow = document.getElementById('archived-pets-row');
    const messageContainer = document.getElementById('message-container-archived-pets');
    const toggleButton = document.getElementById('toggle-archived-btn');
    archivedRow.innerHTML = ''; // Clear existing archived pets

    // Filter pets to include only those with 'Archived' status
    const archivedPets = pets.filter(pet => pet.status === 'Archived');

    // Check if archivedPets is empty
    if (archivedPets.length === 0) {
        updateArchivedMessageContainer();
        messageContainer.style.display = 'block';
    } else {
        messageContainer.style.display = 'none';
    }

    archivedPets.sort((a, b) => new Date(b.birthday) - new Date(a.birthday)); // Sort by birthday

    archivedPets.forEach((pet) => {
        // Add or update the age property in years
        pet.age = calculateAge(pet.birthday);

        const petCard = document.createElement('div');
        petCard.classList.add('col-lg-4', 'col-md-6', 'col-sm-12', 'd-flex', 'justify-content-center', 'mb-4');

        petCard.innerHTML = `
            <div class="card">
                <img src="${pet.image}" class="card-img-top" alt="${pet.name}">
                <div class="card-body">
                    <h5 class="card-title">${pet.name}</h5>
                    <p class="card-text">Species: ${pet.species}</p>
                    <p class="card-text">Breed: ${pet.breed || 'N/A'}</p>
                    <p class="card-text">Gender: ${pet.gender}</p>
                    <p class="card-text">Birthday: ${formatBirthday(pet.birthday)}</p>
                    <p class="card-text">Age: ${pet.age}</p>
                </div>
                <div class="d-flex justify-content-center" style="gap:10px; padding-bottom: 30px;">
                    <button class="btn-orange" style="background-color: #2C3E50;" onclick="unarchivePet('${pet.id}')">Unarchive</button>
                </div>
            </div>
        `;

        archivedRow.appendChild(petCard);
    });

    adjustRowLayout(archivedRow, archivedPets.length);
}


// ^ Function to unarchive a pet (FIRESTORE)
window.unarchivePet = async function(id) {
    // Find the pet to unarchive by ID
    // const petToUnarchive = findPetByID(id);
    // if (!petToUnarchive) return; // Pet not found

    // // Update the status of the pet to 'Active' in the array
    // petToUnarchive.status = 'Active';

    // // Update related appointments for this pet in the local array
    // petAppointments.forEach(appointment => {
    //     if (appointment.pet === petToUnarchive.name) {
    //         appointment.isHidden = "False";
    //     }
    // });

    // Update Firestore with the new status
    const userUID = window.currentUserUID;
    if (userUID) {
        try {
            // Get a reference to the specific pet document
            const petDocRef = doc(db, "users", userUID, "pets", id);

            // Update the status field to 'Active' in Firestore
            await updateDoc(petDocRef, { status: 'Active' });
            // console.log(`Pet ${id} unarchived successfully in Firestore.`);

            // Refresh the displayed lists of active and archived pets
            const petToUnarchive = findPetByID(id);
            const oldStatus = petToUnarchive.status;
            const petName = petToUnarchive.name;
            if (!petToUnarchive) return; // Pet not found
            petToUnarchive.status = 'Active';
            const newStatus = petToUnarchive.status;
            displayPets();
            updateActiveMessageContainer();
            displayArchivedPets();

            // Update related appointments if the pet's status is changed
            if (newStatus !== oldStatus) {
                const appointmentsRef = collection(db, 'users', userUID, 'appointments');
                const appointmentsQuery = query(appointmentsRef, where("pet", "==", petName));
                const appointmentsSnapshot = await getDocs(appointmentsQuery);

                // Update each appointment document where pet matches updated pet's name
                const isHiddenValue = status === "Archived" ? "True" : "False";
                appointmentsSnapshot.forEach(async (appointmentDoc) => {
                    const appointmentRef = doc(db, 'users', userUID, 'appointments', appointmentDoc.id);
                    await updateDoc(appointmentRef, { isHidden: isHiddenValue });
                });
            }
        } catch (error) {
            console.error(`Error unarchiving pet ${id} in Firestore:`, error);
        }
    } else {
        console.error("User UID is missing.");
    }
}

