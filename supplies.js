import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail ,signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, addDoc, collection, deleteDoc, updateDoc, query, where} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes, deleteObject, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { db, auth, storage } from './firebaseConfig.js'; //With this line you dont need to initialise app as firebaseConfig.js does it already


let supplyItems = window.supplyItems || [];
let suppliesConsumed = window.suppliesConsumed || [];
let pets = window.pets || [];


const container = d3.select("#consumption-section");

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadSupplies();
        loadPets();
        loadSuppliesConsumed();
    } else {
        console.log("No user signed in.");
    }
});

//FIREBASE load supplies sub collection into supplyItems Array
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
            supplyItems.length = 0; // Use length to clear the array

            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.id = doc.id; // Add document ID to the supply data
                    supplyItems.push(docData); // Add the supply data to the supplyItems array
                    // console.log("Loaded supply item:", docData);
                });

                console.log("Supply items loaded successfully:", supplyItems);
            } else {
                console.log("No supply items found for this user.");
            }

            // Call renderTable() and createChart() after loading the supply items from Firestore
            renderTable(supplyItems);
            createChart(supplyItems);

        } catch (error) {
            console.error("Error loading supply items: ", error);
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
                    docData.petID = doc.id; // Add document ID to the pet data
                    pets.push(docData); // Add the pet data to the pets array
                    // console.log("Loaded pet:", docData);
                });

                console.log("Pets loaded successfully:", pets);
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

// FIREBASE Load supplies consumed from Firestore into suppliesConsumed array
window.loadSuppliesConsumed = async function loadSuppliesConsumed() {
    const userUID = window.currentUserUID;

    if (userUID) {
        try {
            // Reference to the 'suppliesConsumed' collection under the user's document
            const consumptionsCollectionRef = collection(db, 'users', userUID, 'suppliesConsumed');

            // Get all documents from the suppliesConsumed collection
            const querySnapshot = await getDocs(consumptionsCollectionRef);

            // Clear the suppliesConsumed array before adding new data
            suppliesConsumed.length = 0; // Use length to clear the array

            // Check if any documents are returned
            if (!querySnapshot.empty) {
                // Iterate through each document in the collection
                querySnapshot.forEach((doc) => {
                    let docData = doc.data();
                    docData.consumptionID = doc.id; // Add document ID to the supply consumption data
                    suppliesConsumed.push(docData); // Add the data to the suppliesConsumed array
                    // console.log("Loaded consumed supply:", docData);
                });

                console.log("Supplies consumed loaded successfully:", suppliesConsumed);
            } else {
                console.log("No supplies consumed found for this user.");
            }

            // Refresh consumption graphs display
            renderGraphs(suppliesConsumed);

        } catch (error) {
            console.error("Error loading supplies consumed: ", error);
        }
    } else {
        console.log("User UID not found.");
    }
};

// Function to update the serial numbers in the table
function updateSerialNumbers() {
    const tableRows = document.querySelectorAll('.custom-table tbody tr');
    tableRows.forEach((row, index) => {
        row.querySelector('td:first-child').textContent = index + 1;
    });
}

// Function to render the supply items in the table
function renderTable(supplyItems) {
    const tableBody = document.querySelector('.custom-table tbody');
    const messageContainer = document.getElementById('message-container');

    // Clear previous table rows
    tableBody.innerHTML = '';

    if (supplyItems.length === 0) {
        document.querySelector('.table-container').style.display = 'none';
        messageContainer.style.display = 'block';
        messageContainer.textContent = "Click the button below to add supply items!";
    } else {
        document.querySelector('.table-container').style.display = 'block';
        messageContainer.style.display = 'none';

        // Iterate through supplyItems and create rows
        supplyItems.forEach((item, index) => {
            const newRow = document.createElement('tr');
            const quantity = parseFloat(item.quantity).toFixed(1);
            const minQuantity = parseFloat(item.minQuantity).toFixed(1);
            const statusClass = parseFloat(quantity) < parseFloat(minQuantity) ? 'low-stock' : 'available';
            const statusText = parseFloat(quantity) < parseFloat(minQuantity) ? 'Low Stock' : 'Available';
            newRow.innerHTML = `
                <td></td>
                <td>${item.category}</td>
                <td>${item.item}</td>
                <td>
                    <div class="quantity-container">
                        <span>${item.quantity} ${item.units}</span>
                    </div>
                </td>
                <td>
                    <div class="quantity-container">
                        <span>${item.minQuantity} ${item.units}</span>
                    </div>
                </td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-orange edit-supply-btn edit-btn-format">Edit</button>
                    <button class="btn-delete" style="margin-left: 10px;"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(newRow);
            addRowEventListeners(newRow, index);
        });

        updateSerialNumbers();
    }
}

// Function to open modal
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// Function to close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
// window.closeModal = function(modalId) {
//     document.getElementById(modalId).style.display = 'none'; // Hide the modal
// };

//FIREBASE Adding a Supply
window.addNewItem = async function addNewItem(event) {
    event.preventDefault();
    console.log("Adding supply item...");
    const form = event.target;
    const userUID = window.currentUserUID; // Defined in firebaseConfig.js

    // Get supply item values from the form
    const supplyCategory = form['category'].value;
    const supplyItem = form['item'].value;
    const supplyQuantity = form['quantity'].value;
    const supplyUnits = form['units'].value;
    const supplyMinQuantity = form['minQty'].value;
    const timestamp = new Date();

    if (userUID && supplyCategory && supplyItem && supplyQuantity && supplyUnits && supplyMinQuantity) {
        try {
            // Reference to the 'supplies' subcollection under the user's document
            const suppliesCollectionRef = collection(db, 'users', userUID, 'supplies');
            
            // Create an object to add to Firestore
            const newSupplyItem = {
                category: supplyCategory,
                item: supplyItem,
                quantity: supplyQuantity,
                units: supplyUnits,
                minQuantity: supplyMinQuantity,
                // timestamp: timestamp
            };

            // Add a new document with the supply item's details
            const docRef = await addDoc(suppliesCollectionRef, newSupplyItem);
            // console.log("Document added with ID:", docRef.id);

            // Set the document ID from Firestore and update the local array
            newSupplyItem.id = docRef.id; // Important for edits and deletion
            supplyItems.push(newSupplyItem);  // Check if supplyItems is defined and an array
            console.log("Updated supplyItems array:", supplyItems);

            // Refresh the display of supply items and the chart
            renderTable(supplyItems);
            createChart(supplyItems);

            alert("Supply item added successfully!");
            closeModal('add-item-modal');
            form.reset();
            
        } catch (error) {
            console.error("Error saving supply item details:", error);
            alert("Failed to save supply item details.");
        }
    } else {
        alert("Missing user or supply item details.");
    }
};

// Function to handle form submission for adding a new supply item
// function addNewItem(event) {
//     event.preventDefault();
//     const form = event.target;

//     const newItem = {
//         category: form['category'].value,
//         item: form['item'].value,
//         quantity: form['quantity'].value,
//         units: form['units'].value,
//         minQuantity: form['minQty'].value
//     };

//     supplyItems.push(newItem);
//     renderTable(supplyItems);
//     closeModal('add-item-modal');
//     form.reset();
// }

//FIREBASE Delete Supply
window.deleteSupply = async function deleteSupply(index) {
    const userUID = window.currentUserUID;
    const supplyId = supplyItems[index].id;
    console.log(supplyId);

    if (userUID) {
        try {
            // Reference to the specific supply document using the user's UID and supply ID
            const supplyDocRef = doc(db, 'users', userUID, 'supplies', supplyId);
            
            // Delete the supply document from Firestore
            await deleteDoc(supplyDocRef);

            // Remove the supply from the local array based on the ID
            supplyItems = supplyItems.filter(item => item.id !== supplyId);
            
            // Refresh the display
            renderTable(supplyItems);
            createChart(supplyItems);
            
            alert("Supply item deleted successfully!");
        } catch (error) {
            console.error("Error deleting supply item: ", error);
            alert("Failed to delete supply item.");
        }
    } else {
        console.log("User UID not found.");
    }
};

// Function to open the supply item edit modal and populate fields
function openEditSupplyItemForm(index) {
    const item = supplyItems[index];
    const form = document.getElementById('edit-item-modal-form');

    // Populate the form fields with current supply item data
    form['edit-category'].value = item.category;
    form['edit-item'].value = item.item;
    form['edit-quantity'].value = item.quantity;
    form['edit-units'].value = item.units;
    form['edit-minQty'].value = item.minQuantity;

    //Populating Hidden fields to allow firebase to access firestore document
    form['supply-document-id'].value = item.id;

    // Show modal
    openModal('edit-supplyItems-modal');

    // Save changes functionality
    form.onsubmit = function(event) {
        event.preventDefault();
        saveEditedSupplyItem(index);
        closeModal('edit-supplyItems-modal');
    };
}

//FIREBASE Editing a Supply
window.saveEditedSupplyItem = async function saveEditedSupplyItem(index) {
    const form = document.getElementById('edit-item-modal-form');
    const userUID = window.currentUserUID;

    // Variables needed to access Firebase document and supplies array object
    const supplyId = form['supply-document-id'].value; // Hidden input for supply ID
    const supplyIndex = index; // Hidden input for the supply index

    // Variables needed to update
    const supplyCategory = form['edit-category'].value; // Category (disabled in UI)
    const supplyItem = form['edit-item'].value; // Item name
    const supplyUnits = form['edit-units'].value; // Units
    const supplyQuantity = form['edit-quantity'].value; // Quantity available
    const supplyMinQty = form['edit-minQty'].value; // Minimum quantity needed

    // Check for required details
    if (userUID && supplyId && supplyItem && supplyQuantity && supplyMinQty) {
        try {
            const supplyDocRef = doc(db, 'users', userUID, 'supplies', supplyId);
            
            // Create an object to add into Firestore
            const updatedSupply = {
                category: supplyCategory,
                item: supplyItem,
                units: supplyUnits,
                quantity: Number(supplyQuantity), // Convert to number if necessary
                minQuantity: Number(supplyMinQty) // Convert to number if necessary
            };

            await setDoc(supplyDocRef, updatedSupply, { merge: true });

            // Update the local supplies array immediately
            supplyItems[supplyIndex] = { ...supplyItems[supplyIndex], ...updatedSupply }; // Merge updated details
            console.log("Updated supply details: ", supplyItems[supplyIndex]);

            renderTable(supplyItems);
            createChart(supplyItems);

            alert("Supply item has been updated!");
            closeModal('edit-supplyItems-modal'); // Close the modal after saving
            
        } catch (error) {
            console.error("Error saving supply item: ", error);
            alert("Failed to save supply item.");
        }
    } else {
        alert("Missing user or supply item details.");
    } 
};

// Delete confirmation
// Function to delete an item after confirmation
let itemToDeleteIndex = null;

function deleteItem(index) {
    // Set the item index to be deleted
    itemToDeleteIndex = index;
    // Open the delete confirmation modal
    openModal('delete-confirmation-modal');
}

// Function to confirm deletion and actually delete the item
document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    if (itemToDeleteIndex !== null) {
        // supplyItems.splice(itemToDeleteIndex, 1);
        deleteSupply(itemToDeleteIndex)
        // renderTable(supplyItems);
        // createChart(supplyItems);
        itemToDeleteIndex = null; // Reset the index
        closeModal('delete-confirmation-modal');
    }
});

// Function to add event listeners to a new row (for edit and delete buttons)
function addRowEventListeners(row, index) {
    // Edit button for "Supply Item"
    row.querySelector('.edit-supply-btn').addEventListener('click', function() {
        openEditSupplyItemForm(index);
    });

    // Delete button functionality
    row.querySelector('.btn-delete').addEventListener('click', function() {
        deleteItem(index);
    });
}


// Event listener for opening the add item modal
document.getElementById('add-item-btn').addEventListener('click', function() {
    openModal('add-item-modal');
});

// Event listener for closing the add item modal
document.getElementById('cancel-modal').addEventListener('click', function() {
    closeModal('add-item-modal');
});

// Event listener for closing the edit supply item modal
document.getElementById('cancel-edit-supply').addEventListener('click', function() {
    closeModal('edit-supplyItems-modal');
});

// Event listener for form submission of new item
document.getElementById('add-item-form').addEventListener('submit', addNewItem);

// Initial render of the table when the page loads
window.onload = function() {
    renderTable(supplyItems);
    renderGraphs(suppliesConsumed);
};







// CHART SECTION
// Variable to track selected categories
let filteredItems = supplyItems;

const ctx = document.getElementById('supplyChart').getContext('2d');
const messageContainer = document.getElementById('chart-message-container');
let supplyChart;

// Function to create or update the chart
// Function to create or update the chart
function createChart(items) {
    // If no items are provided, display the "no items" message and hide the chart
    if (!items.length) {
        messageContainer.innerHTML = "No items found! Please select other categories.";
        messageContainer.style.display = 'block';
        ctx.canvas.style.display = 'none'; // Hide chart
        return;
    }

    // If items are found, show the chart and hide the message
    messageContainer.style.display = 'none';
    ctx.canvas.style.display = 'block'; // Show chart

    const labels = items.map(item => item.item);
    const quantityData = items.map(item => item.quantity);
    const minQuantityData = items.map((item, index) => ({
        x: index, // x-axis index corresponding to the item
        y: item.minQuantity, // y-axis value corresponding to minQuantity
        units: item.units // Include units for tooltip
    }));

    if (supplyChart) {
        supplyChart.destroy(); // Destroy the previous chart instance before creating a new one
    }

    supplyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'scatter', // Adding a scatter plot dataset for Quantity Required
                    label: 'Quantity Required',
                    data: minQuantityData,
                    backgroundColor: '#E9B07A',
                    borderColor: '#c27d32',
                    pointRadius: 8, // Size of the dots
                    pointHoverRadius: 10, // Hover size of the dots
                    pointBackgroundColor: '#E9B07A', // Fill color of the dots
                    pointBorderColor: '#c27d32', // Border color of the dots
                    order: 1 // Ensure dots are drawn after the bars (on top)
                },
                {
                    label: 'Quantity Available',
                    data: quantityData,
                    backgroundColor: '#74C6CA',
                    hoverBackgroundColor: '#93D3D6',
                    borderWidth: 2,
                    borderRadius: 5, // Rounded bars
                    barThickness: 30, // Adjust bar thickness for better visual
                    order: 2 // Ensure the bars are drawn behind the dots
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Ensures flexibility for chart size
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 14, // Adjust font size
                        },
                        color: '#333' // Legend text color
                    }
                },
                tooltip: {
                    backgroundColor: '#2C3E50',
                    titleFontColor: '#ffffff',
                    bodyFontColor: '#ffffff',
                    bodyFontSize: 14,
                    callbacks: {
                        // Custom tooltip callback for Quantity Available bars
                        label: function(tooltipItem) {
                            const dataset = tooltipItem.dataset;
                            const dataIndex = tooltipItem.dataIndex;
                            if (dataset.label === 'Quantity Available') {
                                const item = items[dataIndex];
                                return `Quantity Available: ${item.quantity} ${item.units}`;
                            }
                            // Custom tooltip callback for Quantity Required scatter points
                            if (dataset.label === 'Quantity Required') {
                                const item = items[dataIndex];
                                return `Quantity Required: ${item.minQuantity} ${item.units}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false, // Remove x-axis gridlines
                    },
                    ticks: {
                        color: '#333', // Label color
                        font: {
                            size: 14 // Adjust font size for x-axis labels
                        }
                    }
                },
                y: {
                    display: false // Remove the y-axis entirely
                }
            }
        }
    });
}



// Initialize chart on page load, handle the case where no items exist
if (!supplyItems.length) {
    messageContainer.innerHTML = "Please add supply items!";
    messageContainer.style.display = 'block';
    ctx.canvas.style.display = 'none'; // Hide chart
} else {
    createChart(supplyItems);
}


// Handle filter button clicks
document.querySelectorAll('.btn-filter').forEach(button => {
    button.addEventListener('click', function () {
        // Toggle the 'active' class on button click for multiple selection
        this.classList.toggle('active');

        // Get all active (selected) categories
        const selectedCategories = Array.from(document.querySelectorAll('.btn-filter.active'))
            .map(btn => btn.getAttribute('data-category'));

        // Filter the items based on the selected categories
        let filteredItems = selectedCategories.length
            ? supplyItems.filter(item => selectedCategories.includes(item.category))
            : [];

        // Display a message if no items match the filter
        createChart(filteredItems);
    });
});

// Function to filter supply items and update the chart based on selected categories
function filterAndUpdateChart(selectedCategories) {
    // If no categories selected, show all items
    let filteredItems = selectedCategories.length
        ? supplyItems.filter(item => selectedCategories.includes(item.category))
        : supplyItems;

    createChart(filteredItems); // Update the chart with filtered items
}


// Reset chart to display all items when reset button is clicked
document.getElementById('reset-chart').addEventListener('click', () => {
    document.querySelectorAll('.btn-filter').forEach(button => button.classList.remove('active'));
    filteredItems = supplyItems;
    createChart(filteredItems);
});




// *** CONSUMPTION SECTION
// (1) Handle modal opening and closing
// Open consumption modal
document.getElementById('add-consumption-btn').addEventListener('click', () => {
    document.getElementById('consumptionForm').reset();
    document.getElementById('edit-consumption-modal').style.display = 'flex';
    populatePetDropdown();
    populateCategoryDropdown();
});


// Close consumption modal on cancel
document.getElementById('cancel-consumption-btn').addEventListener('click', () => {
  document.getElementById('edit-consumption-modal').style.display = 'none';
});

// (2) Populate dropdown input fields
// Populate Pet Dropdown
function populatePetDropdown() {
  const petSelect = document.getElementById('pet-select');
  petSelect.innerHTML = '';

  // Add a placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  placeholderOption.hidden = true;
  placeholderOption.textContent = 'Select a pet';
  petSelect.appendChild(placeholderOption);

//   window.pets.forEach(pet => {
  pets.forEach(pet => {
    if (pet.status === "Active") { // Only show active pets
      const option = document.createElement('option');
      option.value = pet.petID;
      option.textContent = pet.name;
      petSelect.appendChild(option);
    }
  });
}

// Populate Category Dropdown
function populateCategoryDropdown() {
  const categorySelect = document.getElementById('category-select');
  categorySelect.innerHTML = '';

  // Add a placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  placeholderOption.hidden = true;
  placeholderOption.textContent = 'Select a category';
  categorySelect.appendChild(placeholderOption);

//   const uniqueCategories = [...new Set(window.supplyItems.map(item => item.category))];
const uniqueCategories = [...new Set(supplyItems.map(item => item.category))];
  uniqueCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// Populate Item Dropdown based on Category
document.getElementById('category-select').addEventListener('change', (event) => {
  const selectedCategory = event.target.value;
  const itemSelect = document.getElementById('item-select');
  itemSelect.innerHTML = '';

  // Add a placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  placeholderOption.hidden = true;
  placeholderOption.textContent = 'Select an item';
  itemSelect.appendChild(placeholderOption);

//   window.supplyItems.forEach(item => {
  supplyItems.forEach(item => {
    if (item.category === selectedCategory) {
      const option = document.createElement('option');
      option.value = item.item;
      option.textContent = item.item;
      itemSelect.appendChild(option);
    }
  });
});

// Show units when item is selected
document.getElementById('item-select').addEventListener('change', (event) => {
  const selectedCategory = document.getElementById('category-select').value;
  const selectedItem = event.target.value;
  const item = supplyItems.find(i => i.category === selectedCategory && i.item === selectedItem);
  if (item) {
    document.getElementById('unit-label').value = item.units;
  }
});



//FIREBASE Add Consumption
window.addConsumption = async function addConsumption(event) {
    event.preventDefault();
    console.log("Adding consumption...");
    const form = event.target;
    const userUID = window.currentUserUID; // window.currentUserUID was defined in firebaseConfig.js

    // Get the selected pet's ID and find the pet's name
    // Commented out code below doesnt work because petID in firebase is a string not an integer
    // const petID = parseInt(document.getElementById('pet-select').value);
    const petID = document.getElementById('pet-select').value;
    console.log(petID);
    const selectedPet = pets.find(pet => pet.petID === petID);
    const petName = selectedPet ? selectedPet.name : '';
    console.log(petName);
  
    // Gather consumption details from form inputs
    const category = document.getElementById('category-select').value;
    const item = document.getElementById('item-select').value;
    const quantity = parseFloat(document.getElementById('quantity-consumed').value);
    const date = document.getElementById('consumption-date').value;
    const units = document.getElementById('unit-label').value;

    // Check if all required details are available
    if (userUID && petID && category && item && !isNaN(quantity) && date && units) {
        try {
            // Reference to the 'consumptions' subcollection under the user's document
            const consumptionsCollectionRef = collection(db, 'users', userUID, 'suppliesConsumed');

            // Create an object to add into Firestore
            const newConsumption = {
                petID: petID,
                petName: petName,
                supplyCategory: category,
                supplyItem: item,
                qtyConsumed: quantity,
                units: units,
                date: date
            };

            // Add a new document with the consumption details
            const docRef = await addDoc(consumptionsCollectionRef, newConsumption);

            // Set the document ID after it's added to allow for future edits or deletion
            newConsumption.consumptionID = docRef.id;

            // Update the displayed list of consumptions (assuming there's an array to store these)
            suppliesConsumed.push(newConsumption);

            // Look for the unique category-item pair in the supplyItems array and update its quantity
            const supplyItemEntry = supplyItems.find(supply => supply.category === category && supply.item === item);
            if (supplyItemEntry) {
                console.log(supplyItemEntry);
                //Update supplyItems Array
                supplyItemEntry.quantity = parseFloat((parseFloat(supplyItemEntry.quantity) - quantity).toFixed(1));
                console.log(supplyItemEntry.quantity);
                
                //Update supplies document in FIRESTORE// Update supplies document in FIRESTORE
                const suppliesCollectionRef = collection(db, 'users', userUID, 'supplies');
                
                // Query to find the document with the matching category and item
                const querySnapshot = await getDocs(suppliesCollectionRef);
                let supplyDocId = null;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.category === category && data.item === item) {
                        supplyDocId = doc.id;
                    }
                });

                // If a matching document was found, update its quantity
                if (supplyDocId) {
                    const supplyDocRef = doc(db, 'users', userUID, 'supplies', supplyDocId);
                    await updateDoc(supplyDocRef, {
                        quantity: parseFloat(supplyItemEntry.quantity)  // Updated quantity after subtraction
                    });
                    console.log(`Updated supply quantity for ${item} in category ${category}.`);
                } else {
                    console.warn("No matching supply document found to update.");
                }

            }

            // Display success message
            alert("Consumption has been added!");

            //  Close the modal after submission
            document.getElementById('edit-consumption-modal').style.display = 'none';
        
            // Re-render the graphs with the updated suppliesConsumed data
            // renderGraphs(window.suppliesConsumed);
            renderGraphs(suppliesConsumed);
            // console.log(supplyItems);
            createChart(supplyItems);
            renderTable(supplyItems);
            form.reset();
        } 
        catch (error) {
            console.error("Error saving consumption details: ", error);
            alert("Failed to save consumption details.");
        }
    } 
    else {
        alert("Missing user or consumption details.");
    }
}

//Event listener to trigger add Pet consumption when form is submitted
document.getElementById('consumptionForm').addEventListener('submit', addConsumption);


// (4) Function to render graphs using Chart.js
function renderGraphs(suppliesConsumed) {
    const consumptionSection = document.getElementById('consumption-section');
    consumptionSection.innerHTML = '';
    consumptionSection.classList.add('row'); // Bootstrap's row class to ensure proper alignment

    // Predefined colors for category-item pairs
    const colors = [
        'rgba(84, 185, 190, 1)',  // #54B9BE
        'rgba(255, 140, 66, 1)',  // #FF8C42
        'rgba(255, 197, 51, 1)',  // star color
        'rgba(255, 107, 107, 1)', // bright coral
        'rgba(164, 62, 62, 1)',   // #A43E3E
        'rgba(128, 128, 128, 1)'  // #808080
    ];

    // Function to get a color based on the index of the category-item pair
    const uniqueKeys = [...new Set(suppliesConsumed.map(item => `${item.supplyCategory} - ${item.supplyItem}`))];
    uniqueKeys.sort(); // Ensure consistent order of keys across all graphs

    const getColorForKey = (key) => {
        const index = uniqueKeys.indexOf(key);
        return colors[index % colors.length];
    };

    pets.forEach(pet => {
        // Create a container for each pet with responsive Bootstrap classes
        const petContainer = document.createElement('div');
        petContainer.classList.add('col-lg-4', 'col-md-6', 'col-sm-12', 'mb-4', 'd-flex', 'justify-content-center', 'pet-container');

        // Create a flex container for the image and name section
        const petInfo = document.createElement('div');
        petInfo.classList.add('pet-info');
        petInfo.style.marginTop = '20px'; // Margin from the top of the container

        // Create the pet's image
        const petImage = document.createElement('img');
        petImage.src = pet.image;
        petImage.classList.add('pet-round-image');
        petInfo.appendChild(petImage);
        
        // Create the pet's name
        const petName = document.createElement('p');
        petName.innerText = pet.name;
        petName.classList.add('pet-name');
        petInfo.appendChild(petName);

        // Add the pet info section to the container
        petContainer.appendChild(petInfo);
        
        // Filter supplies consumed for this pet
        const petSupplies = suppliesConsumed.filter(item => item.petID === pet.petID);
        
        if (petSupplies.length === 0) {
            // No supplies data message
            const noDataMessage = document.createElement('p');
            noDataMessage.innerText = 'This pet has no recorded supply consumption!';
            petContainer.appendChild(noDataMessage);
        } else {
            // Create a div to wrap the canvas
            const chartWrapper = document.createElement('div');
            chartWrapper.classList.add('chart-wrapper');
            chartWrapper.style.width = '100%';

            // Create a canvas for Chart.js
            const canvas = document.createElement('canvas');
            canvas.id = `chart-${pet.petID}`;
            chartWrapper.appendChild(canvas);

            // Add the chart wrapper to the pet container
            petContainer.appendChild(chartWrapper);

            // Prepare data for the chart
            const datasets = {};

            // Group the supplies by category-item pair
            petSupplies.forEach(item => {
                const key = `${item.supplyCategory} - ${item.supplyItem}`;
                if (!datasets[key]) {
                    datasets[key] = {
                        label: key,
                        data: [],
                        borderColor: getColorForKey(key),
                        fill: false,
                        units: item.units
                    };
                }
                const parsedDate = new Date(item.date);
                datasets[key].data.push({ x: parsedDate, y: item.qtyConsumed });
            });

            // Sort the data for each dataset by date to ensure it's in chronological order
            Object.values(datasets).forEach(dataset => {
                dataset.data.sort((a, b) => a.x - b.x); // Sort by the date (x-value)
            });

            // Ensure datasets are ordered based on uniqueKeys for consistent legend order
            const sortedDatasets = uniqueKeys.map(key => datasets[key]).filter(Boolean);

            new Chart(canvas, {
                type: 'line',
                data: {
                    datasets: sortedDatasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Allow dynamic resizing
                    plugins: {
                        legend: {
                            display: window.innerWidth >= 500, // Show legend only if screen width is 500px or more
                            labels: {
                                font: {
                                    size: window.innerWidth < 500 ? 10 : 12 // Smaller font size for smaller screens
                                }
                            },
                            padding: 0 // Increase this value to add more space between the legend and chart
                        },
                        tooltip: {
                            callbacks: {
                                title: (context) => {
                                    const date = new Date(context[0].parsed.x);
                                    return date.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    });
                                },
                                label: (context) => {
                                    const dataset = context.dataset || '';
                                    const units = dataset.units;
                                    return `${dataset.label}: ${context.parsed.y} ${units}`
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'month'
                            },
                            ticks: {
                                maxTicksLimit: window.innerWidth < 500 ? 3 : 6, // Fewer ticks for smaller screens
                                font: {
                                    size: window.innerWidth < 500 ? 10 : 12 // Smaller font size for smaller screens
                                },
                                autoSkip: true,
                                maxRotation: 0,
                                minRotation: 0
                            },
                            grid: {
                                display: false // Hide gridlines on x-axis
                            },
                            title: {
                                display: true,
                                text: 'Date',
                                font: {
                                    size: window.innerWidth < 500 ? 10 : 12 // Smaller font size for smaller screens
                                }
                            }
                        },
                        y: {
                            ticks: {
                                font: {
                                    size: window.innerWidth < 500 ? 10 : 12 // Smaller font size for smaller screens
                                }
                            },
                            grid: {
                                display: false // Hide gridlines on y-axis
                            },
                            title: {
                                display: true,
                                text: 'Quantity Consumed',
                                font: {
                                    size: window.innerWidth < 500 ? 10 : 12 // Smaller font size for smaller screens
                                }
                            }
                        }
                    }
                }
            });
            
        }

        consumptionSection.appendChild(petContainer);
    });
}




// (5) Resized browser



populatePetDropdown();
populateCategoryDropdown();
