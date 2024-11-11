import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail ,signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, addDoc, collection, deleteDoc} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes, deleteObject, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { db, auth, storage } from './firebaseConfig.js'; //With this line you dont need to initialise app as firebaseConfig.js does it already

// Existing memories
let memories = window.memories || [];
let pets = window.pets || [];
//FIREBASE This function is needed to call loadPets()
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadPets();
        loadMemories();
    } else {
        console.log("No user signed in.");
    }
});

// FIREBASE Load Memories from Firebase Firestore into memories array
window.loadMemories = async function loadMemories() {
    const userUID = window.currentUserUID;

    if (userUID) {
        try {
            // Reference to the 'memories' collection under the user's document
            const memoriesCollectionRef = collection(db, 'users', userUID, 'memories');

            // Get all documents from the memories collection
            const querySnapshot = await getDocs(memoriesCollectionRef);

            // Clear the memories array before adding new data
            memories = [];

            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.memoryId = doc.id; // Add document ID to the memory data
                    memories.push(docData); // Add the memory data to the memories array
                });

                // console.log("Memories loaded successfully:", memories);

                // Sort memories by date (latest first)
                memories.sort((a, b) => new Date(b.date) - new Date(a.date));
                const recentMemories = memories.slice(0, 10);

                // Set the date filter fields based on the 10 most recent memories
                if (recentMemories.length > 0) {
                    document.getElementById("start-date").value = recentMemories[recentMemories.length - 1].date;  // Earliest of 10 recent memories
                    document.getElementById("end-date").value = recentMemories[0].date; // Latest of 10 recent memories
                }
                // Display the loaded memories
                displayMemories();
                createTimeline(recentMemories);
                populateFilterButtons()
            } else {
                console.log("No memories found for this user.");
            }
        } catch (error) {
            console.error("Error loading memories: ", error);
        }
    } else {
        console.log("User UID not found.");
    }
};


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

// (1) Helper Functions
// Function to populate the Pet dropdown with names from the pets array
// Function to populate the Pet dropdown with names from the pets array
function populatePetDropdown(dropdownId, selectedPetID = '') {
    const petDropdown = document.getElementById(dropdownId);
    petDropdown.innerHTML = ''; // Clear previous options

    // Add a placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    placeholderOption.hidden = true;
    placeholderOption.textContent = 'Select a pet';
    petDropdown.appendChild(placeholderOption);

    // Filter the pet array to get active pets only
    const activePets = pets.filter(pet => pet.status === 'Active');

    // Loop through the pets array and populate dropdown options
    activePets.forEach((pet) => {
        const option = document.createElement('option');
        option.value = pet.id; // Set the value to pet's ID
        option.textContent = pet.name; // Display the pet's name in the dropdown

        // If the pet matches the selected pet, set it as selected
        if (pet.id == selectedPetID) {
            option.selected = true;
        }

        petDropdown.appendChild(option);
    });
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


//Function to populate and manage existing photos in the Edit Memory modal
function populateExistingPhotoPreview(previewContainerId, images, selectedCoverIndex = 0) {
    const previewContainer = document.getElementById(previewContainerId);
    const coverImagePreview = document.getElementById('edit-cover-image-preview');
    previewContainer.innerHTML = ''; // Clear previous previews

    images.forEach((imgSrc, index) => {
        const imgElement = document.createElement('img');
        imgElement.src = imgSrc;
        imgElement.classList.add('preview-existing-image');
        imgElement.dataset.index = index;

        // If this is the selected cover image, add the selected class and tick mark
        if (index === selectedCoverIndex) {
            imgElement.classList.add('selected');
            const tickMark = document.createElement('span');
            tickMark.classList.add('tick-mark');
            tickMark.textContent = '✔';
            imgElement.appendChild(tickMark);
        }

        // Create a delete button for each image
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-photo-button');
        deleteButton.textContent = 'X';
        deleteButton.onclick = () => {
            // Remove the image from the memory's images array
            images.splice(index, 1);
            
            // Ensure the selected cover index is valid after deletion
            const newCoverIndex = selectedCoverIndex >= images.length ? 0 : selectedCoverIndex;
            
            // Re-render the image previews
            populateExistingPhotoPreview(previewContainerId, images, newCoverIndex);
            populateCoverImagePreview('edit-cover-image-preview', images, newCoverIndex);
        };

        // Create a container for the image and the delete button
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('img-container');
        imgContainer.appendChild(imgElement);
        imgContainer.appendChild(deleteButton);

        previewContainer.appendChild(imgContainer);
    });
}


// Function to show image previews and allow selecting a cover image
function populateCoverImagePreview(previewContainerId, imageFiles = [], selectedCoverIndex = 0) {
    const previewContainer = document.getElementById(previewContainerId);
    previewContainer.innerHTML = ''; // Clear previous previews

    imageFiles.forEach((file, index) => {
        const imgElement = document.createElement('img');
        imgElement.src = file;
        imgElement.classList.add('preview-image');
        imgElement.dataset.index = index;

        // If this is the selected cover image, add the selected class and tick mark
        if (index === selectedCoverIndex) {
            imgElement.classList.add('selected');
            const tickMark = document.createElement('span');
            tickMark.classList.add('tick-mark');
            tickMark.textContent = '✔';
            imgElement.appendChild(tickMark);
        }

        // Handle click to select a cover image
        imgElement.onclick = () => {
            // Remove selected class from all images
            Array.from(previewContainer.children).forEach(child => {
                child.classList.remove('selected');
                const tick = child.querySelector('.tick-mark');
                if (tick) tick.remove();
            });

            // Add selected class and tick mark to the clicked image
            imgElement.classList.add('selected');

            // Store the selected cover image index in a data attribute on the container
            previewContainer.dataset.selectedCoverIndex = index;
        };

        previewContainer.appendChild(imgElement);
    });
}

// Function to generate and preview new uploaded images in the Add Memory modal
function handleAddMemoryImageUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        // Show the "Select Cover Image" label if there are uploaded images
        document.getElementById('cover-image-label').style.display = 'block';
    } else {
        // Hide the label if no images are uploaded
        document.getElementById('cover-image-label').style.display = 'none';
    }

    const imageUrls = files.map(file => URL.createObjectURL(file));
    populateCoverImagePreview('cover-image-preview', imageUrls);
}

// Function to generate and preview new uploaded images in the Edit Memory modal
function handleEditMemoryImageUpload(event) {
    const files = Array.from(event.target.files);
    const imageUrls = files.map(file => URL.createObjectURL(file));

    // Combine existing images with the new ones
    const existingImages = memories[currentMemoryIndex].images; // Keep a reference to the current memory's existing images
    const combinedImages = [...existingImages, ...imageUrls];
    
    populateCoverImagePreview('edit-cover-image-preview', combinedImages);
}


// (2) Memories Gallery
// Function to display memories (with memories)
function displayMemories(memoriesToDisplay = memories) {
    const memoriesRow = document.getElementById('memories-row');
    memoriesRow.innerHTML = ''; // Clear existing memories

    if (memoriesToDisplay.length === 0) {
        // Display a message if there are no memories
        const message = document.createElement('div');
        message.classList.add('no-memories-message');
        message.textContent = "No memories found! Click the '+ Add Memory' button below to add new memories!";
        memoriesRow.appendChild(message);
        return;
    }
    memoriesToDisplay = memories.sort((a, b) => new Date(b.date) - new Date(a.date));
    memoriesToDisplay.forEach((memory) => {
        const memoryCard = document.createElement('div');
        memoryCard.classList.add('col-lg-4', 'col-md-6', 'col-sm-12', 'd-flex', 'justify-content-center', 'mb-4');

        memoryCard.innerHTML = `
            <div class="card">
                <img src="${memory.images[0]}" class="card-img-top" alt="${memory.description}">
                <div class="card-body">
                    <h5 class="card-title">${memory.name}</h5>
                    <p class="card-text"><i class="fas fa-calendar-alt"></i> ${memory.date}</p>
                </div>
                <div class="footer-card d-flex justify-content-center" style="gap:10px">
                    <button class="btn-orange" onclick="openEditMemoryForm('${memory.memoryId}')">Edit</button>
                    <button class="btn-delete" onclick="openDeleteConfirmationModal('${memory.memoryId}')" ><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;

        memoriesRow.appendChild(memoryCard);
    });

    // Adjust layout based on number of memories
    adjustRowLayout(memoriesRow, memoriesToDisplay.length);
}

// FIREBASE Delete Memory from Firebase Firestore and associated photos from Storage
window.deleteMemory = async function deleteMemory(memoryId) {
    const userUID = window.currentUserUID;
    // console.log(memoryId);

    if (userUID) {
        try {
            // Find the memory to delete by memoryId
            const memoryToDelete = memories.find(memory => memory.memoryId === memoryId);
            if (!memoryToDelete) {
                console.error("Memory not found.");
                alert("Memory not found.");
                return;
            }

            // Delete each associated photo from Firebase Storage
            for (const imageUrl of memoryToDelete.images) {
                const storageRef = ref(storage, imageUrl);
                await deleteObject(storageRef).catch(error => {
                    console.warn(`Failed to delete image: ${imageUrl}`, error);
                });
            }

            // Reference to the specific memory document in Firestore
            const memoryDocRef = doc(db, 'users', userUID, 'memories', memoryId);

            // Delete the memory document from Firestore
            await deleteDoc(memoryDocRef);

            // Remove the memory from the local array
            memories = memories.filter(memory => memory.memoryId !== memoryId);
            memories.sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentMemories = memories.slice(0, 10);
            // Refresh the display
            displayMemories();
            if (recentMemories.length > 0) {
                document.getElementById("start-date").value = recentMemories[recentMemories.length - 1].date;
                document.getElementById("end-date").value = recentMemories[0].date;
            }
            createTimeline(recentMemories);
            populateFilterButtons();

            alert("Memory deleted successfully!");
        } catch (error) {
            console.error("Error deleting memory: ", error);
            alert("Failed to delete memory.");
        }
    } else {
        console.log("User UID not found.");
    }
};

// // Event listener for delete confirmation button
// document.getElementById('confirm-delete-btn').addEventListener('click', () => {
//     if (memoryToDeleteID) {
//         deleteMemory(memoryToDeleteID);
//         memoryToDeleteID = null; // Reset after deletion
//         closeModal('delete-confirmation-modal');
//     }
// });


let memoryToDeleteId = null; // Global variable to store the ID of the memory to delete

// Function to handle delete button click and open the delete confirmation modal
window.openDeleteConfirmationModal = async function openDeleteConfirmationModal(memoryId) {
    memoryToDeleteId = memoryId; // Store the apptID of the appointment to delete
    // console.log(memoryToDeleteId);
    const modal = document.getElementById('delete-confirmation-modal');
    modal.style.display = 'flex'; // Show the modal
}

window.confirmDeleteMemory = async function confirmDeleteMemory() {
    if (memoryToDeleteId !== null) {
        // console.log("Confirm delete clicked. memoryId:", memoryToDeleteId); 
        deleteMemory(memoryToDeleteId); // Call the delete function with the stored apptID
        memoryToDeleteId = null; // Reset the apptID after deletion
        closeModal('delete-confirmation-modal'); // Close the modal after deletion
    }
}
// Function to confirm and delete the memory
// function confirmDeleteMemory() {
//     if (memoryToDeleteID !== null) {
//         // Find the index of the memory to delete
//         const memoryIndex = memories.findIndex(memory => memory.memoryID === memoryToDeleteID);
        
//         // If a memory is found, delete it
//         if (memoryIndex !== -1) {
//             memories.splice(memoryIndex, 1); // Remove the memory from the array
//             displayMemories(); // Refresh the display
//             createTimeline(memories); // Refresh the timeline
//         }

//         // Reset the global variable
//         memoryToDeleteID = null;

//         // Close the delete confirmation modal
//         closeModal('delete-confirmation-modal');
//     }
// }

// Function to close a modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Event listener for the "Delete" button in the delete confirmation modal
document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteMemory);



// (4) Edit memory
// Function to open edit memory form
// Function to open edit memory form
let currentMemoryIndex = null;
window.openEditMemoryForm = async function openEditMemoryForm (memoryId) {
    // Find the memory by its memoryID
    console.log(memoryId);
    const memory = memories.find(memory => memory.memoryId === memoryId);
    
    // If memory not found, return or show an error
    if (!memory) {
        console.error('Memory not found for the given memoryID:', memoryId);
        return;
    }

    const modal = document.getElementById('edit-memory-modal');
    const form = document.getElementById('edit-memory-form');
    // let currentMemoryIndex = null;
    // Store the index for further reference (useful when saving changes)
    currentMemoryIndex = memories.findIndex(mem => mem.memoryId === memoryId);
    form.reset();

    // Populate the form with memory details
    form['memory-name'].value = memory.name;
    form['memory-description'].value = memory.description;
    form['memory-date'].value = memory.date;
    form['memory-document-id'].value = memory.memoryId;

    // Populate the Pet dropdown using the populatePetDropdown function
    populatePetDropdown('edit-memory-pet'); // Assuming 'memory-pet' is the ID for the Add Memory modal's Pet dropdown

    // Select the appropriate pet in the dropdown
    const petDropdown = form['memory-pet'];
    const petOption = Array.from(petDropdown.options).find(option => option.text.includes(memory.pet));
    if (petOption) petOption.selected = true;

    // Display existing images in the "Manage Existing Photos" section
    populateExistingPhotoPreview('edit-photo-preview', memory.images, 0);

    // Also populate the cover image selection preview with the same images
    populateCoverImagePreview('edit-cover-image-preview', memory.images, 0);

    modal.style.display = 'flex';
    // Debug
    console.log('Editing Memory:', memory);


    // Set the form's submit event handler to save changes
    // form.onsubmit = function(event) {
    //     event.preventDefault();
    //     saveChanges(memoryId);
    //     closeModal('edit-memory-modal');
    // };
    form.onsubmit = async function(event) {
        event.preventDefault();
        const success = await saveChanges(event); // Await the saveChanges function
        if (success) {
            closeModal('edit-memory-modal'); // Only close if save was successful
        }
    }
}

window.saveChanges = async function saveChanges(event) {
    event.preventDefault();
    const form = event.target;
    const userUID = window.currentUserUID;
    let oldDownloadURL = [];

    // Variables needed to access the Firebase document and memories array object
    const memoryId = form['memory-document-id'].value;
    const memoryIndex = memories.findIndex(memory => memory.memoryId === memoryId);
    const selectedPetID = form['memory-pet'].value;
    const selectedPet = pets.find(pet => pet.id === selectedPetID);

    if (memoryIndex === -1) {
        console.error(`Memory with id ${memoryId} not found in the memories array`);
        alert("Memory not found.");
        return;
    }

    // Variables needed to update
    const memoryName = form['edit-memory-name'].value;
    const memoryDescription = form['edit-memory-description'].value;
    const memoryDate = form['edit-memory-date'].value;
    const photoFiles = Array.from(form['edit-memory-image'].files);

    // Get the selected cover image index from the preview container's data attribute
    let selectedCoverIndex = parseInt(document.getElementById('edit-cover-image-preview').dataset.selectedCoverIndex);
    if (isNaN(selectedCoverIndex) || selectedCoverIndex < 0) {
        selectedCoverIndex = 0; // Default to the first image if no valid selection was made
    }

    if (userUID && memoryName && memoryDescription && memoryDate) {
        try {
            const memoryDocRef = doc(db, 'users', userUID, 'memories', memoryId);
            
            // Create an object to add into Firestore
            const updatedMemory = {
                name: memoryName,
                description: memoryDescription,
                date: memoryDate,
                pet: selectedPet ? selectedPet.name : null, // Ensure pet name is valid
            };

            // Retrieve existing images
            const existingImages = memories[memoryIndex].images || [];
            const newImages = [];

            if (photoFiles.length > 0) { // Check if any files were uploaded
                // Loop through each photo file and upload them
                for (const photoFile of photoFiles) {
                    const storageRef = ref(storage, `${userUID}/memories/${photoFile.name}_${Math.random().toString(36).slice(2, 9)}`);
                    await uploadBytes(storageRef, photoFile);
                    const downloadURL = await getDownloadURL(storageRef);
                    newImages.push(downloadURL); // Store new image URLs in an array
                }
                // oldDownloadURL = existingImages; // Store the old image URLs for deletion if needed
            }

            // Combine existing images with the new images without deleting the existing ones
            updatedMemory.images = [...existingImages, ...newImages]; // Retain all existing images and add new ones

            // Reorder images so that the selected cover image is first
            if (selectedCoverIndex < updatedMemory.images.length) {
                updatedMemory.images = [
                    updatedMemory.images[selectedCoverIndex],
                    ...updatedMemory.images.filter((_, idx) => idx !== selectedCoverIndex)
                ];
            }

            // Log the updated memory object for debugging
            console.log(updatedMemory);

            // Update the Firestore document
            await setDoc(memoryDocRef, updatedMemory, { merge: true });

            // Update the in-memory representation of the memory
            updatedMemory.memoryId = memoryId;
            memories[memoryIndex] = updatedMemory;
            memories.sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentMemories = memories.slice(0, 10);
            displayMemories();
            if (recentMemories.length > 0) {
                document.getElementById("start-date").value = recentMemories[recentMemories.length - 1].date;
                document.getElementById("end-date").value = recentMemories[0].date;
            }
            createTimeline(recentMemories); 
            populateFilterButtons();

            alert("Memory details have been edited!");
            closeModal('edit-memory-modal');
            form.reset();
            
        } catch (error) {
            console.error("Error saving memory details: ", error);
            alert("Failed to save memory details.");
        }
    } else {
        alert("Missing user or memory details.");
    } 
};



// (5) Add memory
// FIREBASE Function to add a memory
window.addMemory = async function addMemory(event) {
    event.preventDefault();
    const form = event.target;
    const userUID = window.currentUserUID;

    // Retrieve the selected pet ID and validate inputs
    const selectedPetID = form['memory-pet'].value;
    const selectedPet = pets.find(pet => pet.id === selectedPetID);

    if (!userUID || !selectedPet) {
        console.error("Missing user UID or selected pet.");
        alert("User ID or selected pet details are missing.");
        return;
    }

    try {
        // Get memory details from the form
        const memoryName = form['memory-name'].value;
        const memoryDescription = form['memory-description'].value;
        const memoryDate = form['memory-date'].value;
        const photoFiles = Array.from(form['memory-image'].files);
        
        // Upload each photo to Firebase Storage and obtain URLs
        const photoUrls = await Promise.all(photoFiles.map(async (file) => {
            const uniqueFileName = `${userUID}/memories/${file.name}_${Math.random().toString(36).slice(2, 9)}`;
            const storageRef = ref(storage, uniqueFileName);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
        }));

        // Get selected cover image index or default to the first image
        let selectedCoverIndex = parseInt(document.getElementById('cover-image-preview').dataset.selectedCoverIndex);
        console.log(selectedCoverIndex);
        if (isNaN(selectedCoverIndex) || selectedCoverIndex < 0 || selectedCoverIndex >= photoUrls.length) {
            selectedCoverIndex = 0;
        }

        // Reorder images to set the selected cover image as the first
        const reorderedImages = [
            photoUrls[selectedCoverIndex],
            ...photoUrls.filter((_, idx) => idx !== selectedCoverIndex)
        ];

        // Create a new memory object for Firestore
        const newMemory = {
            name: memoryName,
            description: memoryDescription,
            date: memoryDate,
            images: reorderedImages,
            pet: selectedPet.name,
            timestamp: new Date().toISOString()
        };

        // Reference the user's 'memories' subcollection and add the new memory
        const memoriesCollectionRef = collection(db, 'users', userUID, 'memories');
        const docRef = await addDoc(memoriesCollectionRef, newMemory);

        // Save the document ID to the new memory object
        newMemory.memoryId = docRef.id;
        memories.push(newMemory);
        console.log("Memories after adding: ",memories);
        memories.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentMemories = memories.slice(0, 10);
        displayMemories();
        if (recentMemories.length > 0) {
            document.getElementById("start-date").value = recentMemories[recentMemories.length - 1].date;
            document.getElementById("end-date").value = recentMemories[0].date;
        }
        createTimeline(recentMemories);
        populateFilterButtons();
        
        alert("Memory saved successfully!");
        closeModal('add-memory-modal');
        form.reset();
    } catch (error) {
        console.error("Error saving memory:", error);
        alert("Failed to save memory.");
    }
};

// Function to open the memory modal and reset the form
// Function to open the Add Memory modal and reset the form
window.openAddMemoryForm = async function openAddMemoryForm() {
    const form = document.getElementById('add-memory-form');
    
    // Reset the form fields to clear all input values
    form.reset();
    
    // Clear any image previews in the cover image preview container
    const coverImagePreview = document.getElementById('cover-image-preview');
    coverImagePreview.innerHTML = '';
    
    // Hide the "Select Cover Image" label if no images are present
    document.getElementById('cover-image-label').style.display = 'none';
    
    // Reset the selected cover index
    coverImagePreview.dataset.selectedCoverIndex = 0;
    
    // Populate the Pet dropdown using the populatePetDropdown function
    populatePetDropdown('memory-pet'); // Assuming 'memory-pet' is the ID for the Add Memory modal's Pet dropdown

    // Set the modal to display
    document.getElementById('add-memory-modal').style.display = 'flex';
}



// Function to close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none'; // Hide the modal
};







// (6) Memories Timeline
function createTimeline(memories) {
    const timelineDiv = document.getElementById('timeline');
    timelineDiv.innerHTML = ''; // Clear any existing timeline content

    if (memories.length === 0) {
        // Display a message if there are no memories
        const message = document.createElement('div');
        message.classList.add('no-memories-message');
        message.textContent = "No memories found! Click the '+ Add Memory' button below to add new memories!";
        timelineDiv.appendChild(message);
        return;
    }
    // Sort memories by date
    memories.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Set the width of the SVG based on the number of memories
    const markerSpacing = 250;
    const timelineWidth = Math.max(markerSpacing * (memories.length - 1) + 160); // Timeline length
    const height = 300;

    // Clear any existing SVG before creating a new one
    d3.select("#timeline").select("svg").remove();

    // Create SVG element
    const svg = d3.select("#timeline")
        .append("svg")
        .attr("width", timelineWidth)
        .attr("height", height);

    // Define xScale for positioning elements along the timeline with fixed spacing
    const xScale = (index) => 80 + index * markerSpacing;

    // Draw the main timeline line
    svg.append("line")
        .attr("x1", 80)
        .attr("y1", height / 2)
        .attr("x2", timelineWidth - 80)
        .attr("y2", height / 2)
        .attr("stroke", "#6C7277") // Dark grey color
        .attr("stroke-width", 4);  // Slightly thicker line

    // Create tooltip for displaying date on hover
    const tooltip = svg.append("g")
        .attr("class", "tooltip")
        .attr("visibility", "hidden");

    tooltip.append("rect")
        .attr("fill", "white")
        .attr("stroke", "#6C7277")
        .attr("rx", 5)
        .attr("ry", 5);

    tooltip.append("text")
        .attr("x", 5)
        .attr("y", 15)
        .attr("font-size", "12px");

    // Loop through memories and create markers, boxes, and images
    memories.forEach((memory, index) => {
        const xPos = xScale(index);
        const boxY = height / 2 + 30; // Position boxes below the line
        const imageY = height / 2 - 130; // Position images above the line

        // Add vertical dotted line connecting marker to memory box
        svg.append("line")
            .attr("x1", xPos)
            .attr("y1", height / 2)
            .attr("x2", xPos)
            .attr("y2", (height / 2 - 50))
            .attr("stroke", "#6C7277")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4");

        // Add circular marker for each memory
        const marker = svg.append("circle")
            .attr("cx", xPos)
            .attr("cy", height / 2)
            .attr("r", 10)
            .attr("fill", "#2C3E50")
            .on("mouseover", function () {
                d3.select(this).attr("fill", "#54B9BE");

                // Show tooltip with memory date
                tooltip.attr("transform", `translate(${xPos - 30}, ${height / 2 + 10})`)
                    .select("text")
                    .text(`(${memory.date})`);

                const bbox = tooltip.node().getBBox();
                tooltip.select("rect")
                    .attr("width", bbox.width + 10)
                    .attr("height", bbox.height + 5);

                tooltip.attr("visibility", "visible");
            })
            .on("mouseout", function () {
                d3.select(this).attr("fill", "#2C3E50");
                tooltip.attr("visibility", "hidden");
            })
            .on("click", function () {
                openMemoryModal(memory); // Open modal with memory details on click
            });

        // Create a memory label box with rounded corners
        const boxWidth = 130;
        const boxHeight = 50;
        const boxX = xPos - boxWidth / 2;

        svg.append("rect")
            .attr("x", boxX)
            .attr("y", boxY)
            .attr("width", boxWidth)
            .attr("height", boxHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "#2C3E50");

        // Add memory name text inside the label box
        const textPadding = 5;
        const words = memory.name.split(" ");
        let currentLine = "";
        const textLines = [];

        // Split text into multiple lines if necessary
        words.forEach((word) => {
            const testLine = currentLine + word + " ";
            const testText = svg.append("text").text(testLine).attr("visibility", "hidden");

            if (testText.node().getComputedTextLength() > boxWidth - (textPadding * 2)) {
                textLines.push(currentLine);
                currentLine = word + " ";
            } else {
                currentLine = testLine;
            }
            testText.remove();
        });

        if (currentLine) textLines.push(currentLine);

        // Position and draw each text line in the memory label box
        const totalLines = textLines.length;
        const totalTextHeight = totalLines * 14;
        const startY = boxY + (boxHeight - totalTextHeight) / 2 + 14;

        textLines.forEach((line, index) => {
            svg.append("text")
                .text(line)
                .attr("x", xPos)
                .attr("y", startY + (index * 14))
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "#FFFFFF");
        });

        // Add image associated with memory (if available)
        if (memory.images[0]) {
            svg.append("image")
                .attr("xlink:href", memory.images[0])
                .attr("x", xPos - 50)
                .attr("y", imageY)
                .attr("width", 100)
                .attr("height", 80)
                .attr("preserveAspectRatio", "xMidYMid slice"); // Ensures images fill the space without distortion
        }
    });
}



// (7) Call Functions
// Call the function to create the timeline after the document is loaded
document.addEventListener("DOMContentLoaded", function() {
    createTimeline(memories);
});

// Call this function on page load to populate the dropdowns
document.addEventListener('DOMContentLoaded', () => {
    populatePetDropdown('memory-pet');
    populatePetDropdown('edit-memory-pet');
});


// Function to open the memory modal
function openMemoryModal(memory) {
    // Populate modal with memory data
    document.getElementById('modal-memory-name').innerText = memory.name;
    document.getElementById('modal-memory-description').innerText = memory.description;
    document.getElementById('modal-memory-date').innerHTML = `<i class="fas fa-calendar-alt"></i> ${memory.date}`;
    
    // Get the carousel inner content container
    const carouselInner = document.getElementById('carousel-inner-content');
    carouselInner.innerHTML = ''; // Clear previous images

    // Dynamically add images to the carousel
    memory.images.forEach((imageSrc, index) => {
        const carouselItem = document.createElement('div');
        carouselItem.classList.add('carousel-item');
        if (index === 0) carouselItem.classList.add('active'); // Make the first image active by default

        // Add the image element without any extra overlays or content
        const imgElement = document.createElement('img');
        imgElement.src = imageSrc;
        imgElement.classList.add('d-block', 'w-100'); // Bootstrap classes for carousel image
        imgElement.alt = `Memory Image ${index + 1}`;

        carouselItem.appendChild(imgElement);
        carouselInner.appendChild(carouselItem);
    });

    // Show the modal
    document.getElementById('memory-modal').style.display = 'flex';
}

// Add event listeners for new image uploads in Add Memory and Edit Memory modals
document.getElementById('memory-image').addEventListener('change', handleAddMemoryImageUpload);
document.getElementById('edit-memory-image').addEventListener('change', handleEditMemoryImageUpload);


// Initial display
// Call the createTimeline function after the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    displayMemories(); // Initial display
    createTimeline(memories);
    
});


// (8) Filter Section
// Function to extract unique pets from memories and populate the filter dropdown
// (1) Extract unique pets and populate filter buttons
// Array to keep track of selected pets for filtering
let selectedPets = [];

// (1) Extract unique pets and populate filter buttons
function populateFilterButtons() {
    const filterSection = document.getElementById('filter-section');
    const filterContainer = document.getElementById('filter-buttons-container');

    // Clear previous buttons
    filterContainer.innerHTML = '';

    // Add "All Pets" button
    const allPetsButton = document.createElement('button');
    allPetsButton.classList.add('filter-button', 'active');
    allPetsButton.textContent = 'All Pets';
    allPetsButton.onclick = () => {
        // Clear selected pets, set all pets filter as active, and update button state
        selectedPets = [];
        updateFilterButtonState();
        filterMemoriesByPet();
    };
    filterContainer.appendChild(allPetsButton);

    // "All Active Pets" button
    const allActivePetsButton = document.createElement('button');
    allActivePetsButton.classList.add('filter-button');
    allActivePetsButton.textContent = 'All Active Pets';
    allActivePetsButton.onclick = () => {
        selectedPets = pets.filter(pet => pet.status === 'Active').map(pet => pet.name);
        updateFilterButtonState();
        filterMemoriesByPet();
    };
    filterContainer.appendChild(allActivePetsButton);

    // Extract unique pet names from the memories array
    const uniquePets = [...new Set(memories.map(memory => memory.pet))];

    // Add buttons for each unique pet
    uniquePets.forEach((pet) => {
        const button = document.createElement('button');
        button.classList.add('filter-button');
        button.textContent = pet;
        button.onclick = () => togglePetFilter(pet);
        filterContainer.appendChild(button);
    });

    // Show filter section only if there are memories
    if (uniquePets.length > 0) {
        filterSection.style.display = 'block';
    }
}

// (2) Toggle the pet filter on button click
function togglePetFilter(pet) {
    // If the pet is already selected, remove it from the selectedPets array
    if (selectedPets.includes(pet)) {
        selectedPets = selectedPets.filter(selectedPet => selectedPet !== pet);
    } else {
        // Add the pet to the selectedPets array
        selectedPets.push(pet);
    }

    // Update the button active state
    updateFilterButtonState();

    // Filter the memories based on selected pets
    filterMemoriesByPet();
}

// (3) Update button active state
function updateFilterButtonState() {
    const buttons = document.querySelectorAll('.filter-button');
    buttons.forEach(button => {
        if (button.textContent === 'All Pets') {
            button.classList.toggle('active', selectedPets.length === 0);
        } else {
            button.classList.toggle('active', selectedPets.includes(button.textContent));
        }
    });
}

function filterMemoriesByPet() {
    // Get the current date filter values
    const startDateInput = document.getElementById("start-date").value;
    const endDateInput = document.getElementById("end-date").value;

    // Hide date-filter-instructions
    document.getElementById("date-filter-instructions").style.display = 'none';

    // Parse the start and end dates for comparison
    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);

    // Filter memories based on selected pets
    let filteredMemories;
    if (selectedPets.length === 0) {
        // If no specific pets are selected, start with all memories
        filteredMemories = memories;
    } else {
        // Filter memories by selected pets
        filteredMemories = memories.filter(memory => selectedPets.includes(memory.pet));
    }

    // Further filter memories by date if date values are set and valid
    if (startDateInput && endDateInput && startDate <= endDate) {
        filteredMemories = filteredMemories.filter(memory => {
            const memoryDate = new Date(memory.date);
            return memoryDate >= startDate && memoryDate <= endDate;
        });
    }

    // Display the filtered memories on the timeline
    displayMemories(filteredMemories);
    createTimeline(filteredMemories);
}

// Ensure that date-filter-instructions is hidden when filter buttons are clicked
document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => {
        filterMemoriesByPet();
        document.getElementById("date-filter-instructions").style.display = 'none';
    });
});

// // (4) Filter memories by selected pets
// function filterMemoriesByPet() {
//     // Determine which memories to display
//     // document.getElementById("date-filter-instructions").style.display = 'none';
//     let filteredMemories;
//     if (selectedPets.length === 0) {
//         // If no pets are selected, show all memories
//         filteredMemories = memories;
//     } else {
//         // Show only memories belonging to the selected pets
//         filteredMemories = memories.filter(memory => selectedPets.includes(memory.pet));
//     }

//     // Refresh the Memories Timeline and Gallery sections
//     displayMemories(filteredMemories);
//     createTimeline(filteredMemories);
// }

window.handleDateChange = async function handleDateChange() {
    // Get the current start and end date filter values
    const startDateInput = document.getElementById("start-date").value;
    const endDateInput = document.getElementById("end-date").value;

    // Hide date-filter-instructions
    document.getElementById("date-filter-instructions").style.display = 'none';

    // Parse dates for comparison
    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);

    // Check if the start date is after the end date and show an error message if so
    if (startDate > endDate) {
        document.getElementById("timeline").innerHTML = '<p style="text-align: center;">The start date cannot be after the end date. <br>Please input another date filter range!</p>';
        return;
    }

    // Start with memories filtered by selected pets
    let filteredMemories = selectedPets.length === 0 ? memories : memories.filter(memory => selectedPets.includes(memory.pet));

    // Apply date filter to the selected pet memories
    if (startDateInput && endDateInput) {
        filteredMemories = filteredMemories.filter(memory => {
            const memoryDate = new Date(memory.date);
            return memoryDate >= startDate && memoryDate <= endDate;
        });
    }

    // Display a message if no memories are found for the selected filters
    if (filteredMemories.length === 0) {
        document.getElementById("timeline").innerHTML = '<p style="text-align: center;">No memories found! Please select another date range or pet filter.</p>';
        return;
    }

    // Update the timeline display with the filtered memories
    createTimeline(filteredMemories);
}


window.resetTimeline = async function resetTimeline() {
    // Sort memories by date in descending order
    const sortedMemories = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Select the 10 most recent memories and reverse to show in chronological order
    const recentMemories = sortedMemories.slice(0, 10).reverse();

    // Display the date filter instructions
    document.getElementById("date-filter-instructions").style.display = 'block';

    // Reset the date filter fields based on the 10 most recent memories
    if (recentMemories.length > 0) {
        document.getElementById("start-date").value = recentMemories[0].date;  // Earliest of 10 recent memories
        document.getElementById("end-date").value = recentMemories[recentMemories.length - 1].date; // Latest of 10 recent memories
    }

    // Display the 10 most recent memories in the timeline
    createTimeline(recentMemories);
}


// (9) Function calls
// Initialize the filter buttons and memories display
document.addEventListener('DOMContentLoaded', () => {
    // console.log("DOM Content loaded");
    populateFilterButtons();
    
    const sortedMemories = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentMemories = sortedMemories.slice(0, 10);
    
    // Set date filter fields based on the 10 most recent memories
    if (recentMemories.length > 0) {
        document.getElementById("start-date").value = recentMemories[recentMemories.length - 1].date;
        document.getElementById("end-date").value = recentMemories[0].date;
    }
    
    displayMemories(memories);
    createTimeline(recentMemories);
    populatePetDropdown('memory-pet');
    populatePetDropdown('edit-memory-pet');
});